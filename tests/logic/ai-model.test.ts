import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { ServiceContainer } from '@nocobase/service-provider';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  crmModel,
  modelFailure,
  openSession,
  readSkill,
} from '../../server/providers/crm/ai-model.js';

// The CRM's background AI on the Agents plugin's model gateway: which model
// it asks, how a run of turns reads, and how a failure reads.

interface Call {
  model: unknown;
  system?: string;
  prompt: string;
  source: string;
}

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
        generate: async (call: Call) => {
          calls.push(call);
          return { text: replies.shift() ?? '' };
        },
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
    // Recorded as the CRM's use, told the time where the CRM works.
    expect(calls[0]).toMatchObject({
      model: { modelService: 'qwen', model: 'qwen-max' },
      source: 'crm',
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
