import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { databaseManagerToken } from '@nocobase/db';
import { ServiceContainer } from '@nocobase/service-provider';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  crmModel,
  modelFailure,
  openSession,
  readSkill,
  runFailure,
} from '../../server/providers/crm/ai-model.js';
import { languageModelOf, type ModelCall } from '../setup/model-fake.js';

// The CRM's background AI on the Agents plugin's model gateway: which model
// it asks, how a run of turns reads, and how a failure reads.

type Call = ModelCall;

const gatewayWith = (
  options: {
    defaultAgentId?: string | null;
    agent?: Record<string, unknown>;
    replies?: string[];
    defaultModel?: unknown;
  } = {},
) => {
  const calls: Call[] = [];
  const replies = [...(options.replies ?? [])];
  const container = new ServiceContainer();
  container.instance(agentsToken, {
    chat: {
      settings: async () => ({
        defaultAgentId: options.defaultAgentId ?? null,
      }),
    },
    agents: {
      get: async () =>
        options.agent ?? Promise.reject(new Error('no such agent')),
    },
    online: {
      gateway: {
        catalog: async () => ({
          services: [],
          defaultModel:
            options.defaultModel === undefined
              ? { modelService: 'qwen', model: 'qwen-max' }
              : options.defaultModel,
        }),
        languageModel: async (model: unknown) =>
          languageModelOf(model, async (call) => {
            calls.push(call);
            return replies.shift() ?? '';
          }),
      },
    },
  } as unknown as ReturnType<typeof container.resolve<typeof agentsToken>>);
  return { container, calls };
};

describe("the CRM's model", () => {
  it("answers with the default agent's first model, else the system default", async () => {
    const agent = {
      archivedAt: null,
      modelEntries: [
        { modelService: 'openai', model: 'gpt' },
        { modelService: 'qwen', model: 'qwen-max' },
      ],
    };
    expect(
      await crmModel(gatewayWith({ defaultAgentId: 'a1', agent }).container),
    ).toEqual({ modelService: 'openai', model: 'gpt' });
    // An archived default agent, or none, leaves the system default.
    expect(
      await crmModel(
        gatewayWith({
          defaultAgentId: 'a1',
          agent: { ...agent, archivedAt: '2026-10-01T00:00:00Z' },
        }).container,
      ),
    ).toEqual({ modelService: 'qwen', model: 'qwen-max' });
    expect(await crmModel(gatewayWith().container)).toEqual({
      modelService: 'qwen',
      model: 'qwen-max',
    });
    // No model anywhere, or no Agents plugin: the AI is off.
    expect(
      await crmModel(gatewayWith({ defaultModel: null }).container),
    ).toBeNull();
    expect(await crmModel(new ServiceContainer())).toBeNull();
  });

  it('carries earlier turns into the next, and asks once more for JSON in another shape', async () => {
    const { container, calls } = gatewayWith({
      replies: ['Not JSON.', '```json\n{"grade":"A"}\n```'],
    });
    const session = await openSession(container, {
      timeZone: 'Asia/Shanghai',
      guidance: '# Company\n- NocoBase',
    });
    const answer = await session!.askJson(
      'Grade this lead.',
      z.object({ grade: z.enum(['A', 'B']) }),
    );
    expect(answer).toEqual({ grade: 'A' });
    expect(calls).toHaveLength(2);
    // Recorded as the Background AI's use.
    // The model the work follows, its reasoning turned off.
    expect(calls[0]).toMatchObject({
      model: { modelService: 'qwen', model: 'qwen-max' },
      reasoning: 'none',
    });
    // Told the time where the CRM works, and the business guidance.
    expect(calls[0].system).toContain('(Asia/Shanghai)');
    expect(calls[0].system).toContain('# Company\n- NocoBase');
    expect(calls[0].prompt).toContain('Grade this lead.');
    expect(calls[0].prompt).toContain('JSON Schema');
    // The second turn carries the first, question and reply.
    expect(calls[1].prompt).toContain('User:\nGrade this lead.');
    expect(calls[1].prompt).toContain('Assistant:\nNot JSON.');
    expect(calls[1].prompt).toContain('not in the required format');
    // Neither reply readable: null.
    const failing = gatewayWith({ replies: ['no', 'still no'] });
    const again = await openSession(failing.container, {
      timeZone: 'UTC',
      guidance: '',
    });
    expect(
      await again!.askJson('Grade.', z.object({ grade: z.string() })),
    ).toBeNull();
  });

  it('follows the Background AI agent: its first model, its instructions first in the system prompt', async () => {
    const { container, calls } = gatewayWith({
      defaultAgentId: 'chat',
      replies: ['ok'],
    });
    const agents = container.resolve(agentsToken) as unknown as {
      agents: Record<string, unknown>;
    };
    const background = {
      archivedAt: null as string | null,
      instructions: 'Work for the CRM.',
      modelEntries: [{ modelService: 'openai', model: 'mini' }],
    };
    agents.agents = {
      get: async (id: string) =>
        id === 'bg'
          ? background
          : {
              archivedAt: null,
              instructions: 'Chat instructions.',
              modelEntries: [{ modelService: 'qwen', model: 'max' }],
            },
    };
    const chain = {
      selectFrom: () => chain,
      select: () => chain,
      where: () => chain,
      executeTakeFirst: async () => ({
        value: JSON.stringify({ version: 1, agentId: 'bg' }),
      }),
    };
    container.instance(databaseManagerToken, {
      query: () => chain,
    } as unknown as ReturnType<
      typeof container.resolve<typeof databaseManagerToken>
    >);
    const session = await openSession(container, {
      timeZone: 'UTC',
      guidance: '# Company',
    });
    await session!.ask('Hello');
    expect(calls[0].model).toEqual({ modelService: 'openai', model: 'mini' });
    // The agent's instructions, then how to settle what the material leaves
    // open, then the guidance.
    expect(calls[0].system).toMatch(
      /UTC\)\.\n\nWork for the CRM\.\n\nDecide once and move on:\n[^]*\n\n# Company$/u,
    );
    expect(calls[0].system).not.toContain('Chat instructions.');
    // Archived: the work follows the assistant's model, without those
    // instructions.
    background.archivedAt = '2026-10-10T00:00:00Z';
    expect(await crmModel(container)).toEqual({
      modelService: 'qwen',
      model: 'max',
    });
    const again = await openSession(container, {
      timeZone: 'UTC',
      guidance: '# Company',
    });
    await again!.ask('Hello');
    expect(calls[1].system).not.toContain('Work for the CRM.');
  });

  it('has no session without a model, and reads a refused key as the AI unavailable', async () => {
    expect(
      await openSession(new ServiceContainer(), {
        timeZone: 'UTC',
        guidance: '',
      }),
    ).toBeNull();
    const refused = Object.assign(new Error('bad key'), {
      name: 'ModelError',
      code: 'auth',
    });
    expect(modelFailure(refused, 'captureFailed')).toMatchObject({
      code: 'assistantUnavailable',
      status: 409,
    });
    expect(modelFailure(new Error('timeout'), 'captureFailed')).toMatchObject({
      code: 'captureFailed',
      status: 502,
    });
  });

  it("reads a method skill's text without its frontmatter, the library's before the file", async () => {
    const skill = await readSkill(new ServiceContainer(), 'lead-follow-up');
    expect(skill.startsWith('# Lead follow-up')).toBe(true);
    expect(await readSkill(new ServiceContainer(), 'no-such-skill')).toBe('');
    // The library's version first, where people edit it.
    const { container } = gatewayWith();
    const agents = container.resolve(agentsToken) as unknown as Record<
      string,
      unknown
    >;
    agents.skills = {
      list: async () => [{ id: 's1', slug: 'lead-follow-up' }],
      get: async () => ({
        content: '---\nname: lead-follow-up\ndescription: x\n---\n# Edited',
      }),
    };
    expect(await readSkill(container, 'lead-follow-up')).toBe('# Edited');
  });
});

describe('a background turn', () => {
  const containerWith = (answer: (call: ModelCall) => Promise<string>) => {
    const calls: ModelCall[] = [];
    const container = new ServiceContainer();
    container.instance(agentsToken, {
      chat: { settings: async () => ({ defaultAgentId: null }) },
      agents: { get: async () => Promise.reject(new Error('none')) },
      online: {
        gateway: {
          catalog: async () => ({
            services: [],
            defaultModel: { modelService: 'qwen', model: 'qwen-flash' },
          }),
          languageModel: async (model: unknown) =>
            languageModelOf(model, async (call) => {
              calls.push(call);
              return answer(call);
            }),
        },
      },
    } as unknown as ReturnType<typeof container.resolve<typeof agentsToken>>);
    return { container, calls };
  };

  it('asks a model that refuses to turn its reasoning off again as it is', async () => {
    const { container, calls } = containerWith(async (call) => {
      if (call.reasoning === 'none')
        throw Object.assign(new Error('reasoning cannot be disabled'), {
          statusCode: 400,
        });
      return 'ok';
    });
    const session = await openSession(container, {
      timeZone: 'UTC',
      guidance: '',
    });
    expect(await session!.ask('Hello')).toBe('ok');
    expect(calls.map((call) => call.reasoning ?? 'default')).toEqual([
      'none',
      'default',
    ]);
  });

  it('reports a turn its limit stopped as a stopped call, which reads as timed out', async () => {
    const limit = new AbortController();
    const { container } = containerWith(async () => {
      limit.abort();
      throw new Error('This operation was aborted');
    });
    const session = await openSession(container, {
      timeZone: 'UTC',
      guidance: '',
    });
    const failure = await session!
      .ask('Hello', limit.signal)
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({ name: 'ModelError', code: 'aborted' });
    expect(runFailure(failure)).toBe('timedOut');
  });
});

describe('runFailure', () => {
  // The gateway's error, known by its name and code.
  const modelError = (code: string, message: string): Error =>
    Object.assign(new Error(message), { name: 'ModelError', code });

  it('records a call the turn limit stopped as timedOut', () => {
    expect(runFailure(modelError('aborted', 'The call was stopped.'))).toBe(
      'timedOut',
    );
  });

  it("keeps any other failure in the provider's words", () => {
    expect(runFailure(modelError('provider', 'Bad gateway'))).toBe(
      'Bad gateway',
    );
    expect(runFailure('nope')).toBe('failed');
  });
});
