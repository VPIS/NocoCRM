import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { databaseManagerToken } from '@nocobase/db';
import type { ServiceResolver } from '@nocobase/service-provider';
import {
  BACKGROUND_MARKER,
  BACKGROUND_SOURCE,
} from '../crm-agents/background.js';
import { z, type ZodType } from 'zod';
import { CrmError, toText } from './schema.js';

// The CRM's own model calls (migration step 1): the follow-ups, the reviews,
// the captures, the merge proposals and the feedback write-ups ask the
// Agents plugin's model gateway, which keeps the keys, records the use and
// prices it. The Background AI agent (crm-agents/background.ts) is how an
// administrator configures the work: its first model is the one asked and
// its instructions open the system prompt; without it (archived, deleted,
// or listing no model) the people's default chat agent's first model, else
// the system default chat model. A run is a
// session of turns, each one call: a reply in another shape than asked is
// asked once more with what came before. Results are JSON in the reply,
// checked against the shape the caller gives; the gateway's `generate` has
// no structured output of its own.

// Who the gateway records the use as: the Background AI agent, whose model
// and instructions the work follows (crm-agents/background.ts).
export const AI_SOURCE = BACKGROUND_SOURCE;

type ModelRef = { modelService: string; model: string };

// The Background AI agent as the work follows it: its first model, when it
// lists one, and its instructions; null when there is none to follow.
async function backgroundAgent(
  container: ServiceResolver,
): Promise<{ model: ModelRef | null; instructions: string } | null> {
  if (!container.has(agentsToken) || !container.has(databaseManagerToken))
    return null;
  try {
    const row = await container
      .resolve(databaseManagerToken)
      .query()
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', BACKGROUND_MARKER)
      .executeTakeFirst();
    const value: unknown =
      typeof row?.value === 'string' ? JSON.parse(row.value) : row?.value;
    const id = (value as { agentId?: unknown } | null)?.agentId;
    if (typeof id !== 'string' || !id) return null;
    const agent = await container.resolve(agentsToken).agents.get(id);
    if (agent.archivedAt) return null;
    const entry = agent.modelEntries[0];
    return {
      model:
        entry && 'modelService' in entry
          ? { modelService: entry.modelService, model: entry.model }
          : null,
      instructions: (agent.instructions ?? '').trim(),
    };
  } catch {
    // Not made, deleted, or unreadable: the work follows the assistant.
    return null;
  }
}

// The model a run answers with and the instructions it opens with, or null
// when there is no model to ask (no agents plugin, no enabled chat model):
// the CRM's AI is then off.
async function crmRun(
  container: ServiceResolver,
): Promise<{ model: ModelRef; instructions: string } | null> {
  if (!container.has(agentsToken)) return null;
  const agents = container.resolve(agentsToken);
  const background = await backgroundAgent(container);
  const instructions = background?.instructions ?? '';
  if (background?.model) return { model: background.model, instructions };
  try {
    const { defaultAgentId } = await agents.chat.settings();
    if (defaultAgentId) {
      const agent = await agents.agents.get(defaultAgentId);
      const entry = agent.archivedAt ? undefined : agent.modelEntries[0];
      if (entry && 'modelService' in entry)
        return {
          model: { modelService: entry.modelService, model: entry.model },
          instructions,
        };
    }
  } catch {
    // No default agent to read: the system default below.
  }
  const catalog = await agents.online.gateway.catalog('chat');
  return catalog.defaultModel
    ? { model: catalog.defaultModel, instructions }
    : null;
}

// The model a run answers with, or null when there is none to ask.
export async function crmModel(
  container: ServiceResolver,
): Promise<ModelRef | null> {
  return (await crmRun(container))?.model ?? null;
}

// Whether the CRM's AI can run: there is a model to ask.
export async function aiAvailable(
  container: ServiceResolver,
): Promise<boolean> {
  return (await crmModel(container).catch(() => null)) !== null;
}

export interface ModelSession {
  // Asks the next turn and returns the reply's text.
  ask(content: string, signal?: AbortSignal): Promise<string>;
  // Asks for one JSON object in the given shape, spelled out after the
  // content; once more when the reply does not hold it. Null when neither
  // did.
  askJson<T>(
    content: string,
    shape: ZodType<T>,
    signal?: AbortSignal,
  ): Promise<T | null>;
}

// How long one turn of a background run (a follow-up, a review, a
// preparation) may take: a model that reasons at length (Qwen Max) takes
// minutes over a follow-up's material, and the gateway's call cannot turn
// that off. Within the ten minutes after which a running card reads as
// failed.
export const RUN_TURN_MS = 8 * 60_000;

// A run of turns with the CRM's model, its system prompt the current time
// in the CRM's time zone (dates such as "next Tuesday" in what it reads are
// reckoned from it), the Background AI agent's instructions and the
// deployment's business guidance (guidance.ts); null when there is no
// model to ask.
export async function openSession(
  container: ServiceResolver,
  { timeZone, guidance }: { timeZone: string; guidance: string },
): Promise<ModelSession | null> {
  const run = await crmRun(container).catch(() => null);
  if (!run) return null;
  const { model, instructions } = run;
  const now = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  const system = [
    `The current time is ${now} (${timeZone}).`,
    instructions,
    guidance,
  ]
    .filter(Boolean)
    .join('\n\n');
  const gateway = container.resolve(agentsToken).online.gateway;
  const turns: { role: 'user' | 'assistant'; text: string }[] = [];
  const ask = async (content: string, signal?: AbortSignal) => {
    turns.push({ role: 'user', text: content });
    // One prompt: the earlier turns as a transcript, then the question.
    const prompt =
      turns.length === 1
        ? content
        : `${turns
            .slice(0, -1)
            .map(
              (turn) =>
                `${turn.role === 'user' ? 'User' : 'Assistant'}:\n${turn.text}`,
            )
            .join('\n\n')}\n\nUser:\n${content}`;
    const { text } = await gateway.generate({
      model,
      system,
      prompt,
      maxOutputTokens: 16_000,
      source: AI_SOURCE,
      ...(signal ? { signal } : {}),
    });
    turns.push({ role: 'assistant', text });
    return text;
  };
  return {
    ask,
    async askJson<T>(
      content: string,
      shape: ZodType<T>,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const read = (text: string) => shape.safeParse(jsonIn(text));
      const first = read(
        await ask(
          `${content}\n\nReturn only one JSON object, with no other text, matching this JSON Schema:\n${shapeOf(shape)}`,
          signal,
        ),
      );
      if (first.success) return first.data;
      const again = read(
        await ask(
          `The previous reply was not in the required format. Keeping the same answer, return only one JSON object and nothing else, matching this JSON Schema:\n${shapeOf(shape)}`,
          signal,
        ),
      );
      return again.success ? again.data : null;
    },
  };
}

// A zod shape as the JSON Schema a prompt shows the model.
export function shapeOf(shape: ZodType): string {
  try {
    return JSON.stringify(z.toJSONSchema(shape, { unrepresentable: 'any' }));
  } catch {
    return '{}';
  }
}

// A method skill's text without its frontmatter: the Agents plugin's
// library's current version, where people edit it (crm-agents/library.ts
// puts it there), else its SKILL.md as shipped (ai/skills/<name>, beside the
// server in development, copied into dist by the build). Empty when
// neither has it.
export const SKILLS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'ai',
  'skills',
);
export async function readSkill(
  container: ServiceResolver,
  name: string,
): Promise<string> {
  let text: string | null = null;
  if (container.has(agentsToken))
    try {
      const skills = container.resolve(agentsToken).skills;
      const skill = (await skills.list()).find((s) => s.slug === name);
      if (skill) text = (await skills.get(skill.id)).content;
    } catch {
      // The library cannot be read: the shipped file below.
    }
  text ??= await readFile(join(SKILLS_DIR, name, 'SKILL.md'), 'utf8').catch(
    () => '',
  );
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '').trim();
}

// The JSON a reply wrote, alone, in a ```json fence or among other text.
export function jsonIn(content: unknown): unknown {
  const text =
    typeof content === 'string'
      ? content
      : toText((content as { content?: unknown } | null)?.content ?? '');
  const fenced = /```(?:json)?\s*([\s\S]*?)```/u.exec(text)?.[1];
  const candidates = [
    fenced,
    text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1),
  ];
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Not JSON; try the next reading.
    }
  }
  return undefined;
}

// A model call that failed, as the CRM's error: no usable model (no
// service, a refused key) is the AI being unavailable, anything else the
// operation failing, the provider's words kept as its detail. The gateway's
// `ModelError` is known by its name and code; the plugin does not export it.
export function modelFailure(error: unknown, failed: string): CrmError {
  const code =
    error instanceof Error && error.name === 'ModelError'
      ? toText((error as Error & { code?: unknown }).code ?? '')
      : '';
  const detail = error instanceof Error ? error.message : undefined;
  return code === 'config' || code === 'auth'
    ? new CrmError('assistantUnavailable', 409, undefined, detail)
    : new CrmError(failed, 502, undefined, detail);
}
