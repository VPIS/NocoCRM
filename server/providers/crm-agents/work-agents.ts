import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import type { DatabaseManager } from '@nocobase/db';
import { listUsers } from '../crm/authorization.js';
import { chatModelEntries, nameAgent } from './assistant.js';
import {
  BACKGROUND_INSTRUCTIONS,
  BACKGROUND_MARKER,
  BACKGROUND_SOURCE,
  FORMER_SOURCE,
} from './background.js';
import { SKILLS_MARKER } from './library.js';

// @temporary(nocobase-official): agents an application ships are created
// from code once, at start, as the assistant is (assistant.ts).
//
// The CRM's work agents, one for each kind of work the AI does on its own,
// as the Auto follow-up page's tabs are: lead follow-up, opportunity
// follow-up, approval review, task preparation and company signals. Each is
// how an administrator configures its work on the Agents page: its first
// model is the one the work asks, its instructions open each run's system
// prompt, and its method skill is attached to it (the work reads the skill
// from the library itself). The work is still one model call each, made by
// the CRM's code with the material it gathered, never a run of the agent
// (crm/ai-model.ts), and nobody chats with them. The things people ask of
// the AI on a record go to the agent of that record's work: a lead's
// capture and merge to the lead follow-up, a deal's capture to the
// opportunity follow-up, a task's outcome write-up to the task preparation.
//
// They replaced the one Background AI (background.ts): an installation that
// had it gets its instructions on each when an administrator changed them,
// and it is archived, then deleted with its recorded use once every work
// has its agent (retireBackgroundAgent). Each is made once, for the
// installation's first account alone; the marker keeps its id, so one an
// administrator changed, archived or deleted stays as they left it, its
// work then following the assistant's model. Its name shows in the viewer's
// language (nameWorkAgents), as its description does; its instructions stay
// English, as the CRM's prompts and skills are, the model writing in the
// language each run names.

export const WORK_AGENTS_MARKER = 'agents-work-v1';

export const WORKS = [
  'leads',
  'opportunities',
  'approvals',
  'tasks',
  'signals',
] as const;
export type Work = (typeof WORKS)[number];

// The model every work asks first when its service is configured
// (server/config/ai.ts): DeepSeek's fast one, the company research's too
// since 2026-10-19, when it searches through DeepSeek's Search API
// (web-research.ts; Qwen's fast one led that work before). A model that
// reasons at length (Qwen Max) spent minutes and thousands of tokens of
// thinking on each follow-up, which the work does not need.
const FIRST_MODEL = { provider: 'deepseek', model: 'deepseek-flash' };

// The providers whose models can search the web (web-research.ts); a
// DeepSeek service through DeepSeek's Search API since 2026-10-19.
const SEARCHING = new Set([
  'alibaba',
  'deepseek',
  'openai',
  'anthropic',
  'google',
]);

export const WORK_AGENTS: Record<
  Work,
  { name: string; skill: string; task: string }
> = {
  leads: {
    name: 'Lead follow-up',
    skill: 'lead-follow-up',
    task: 'following leads up, organising pasted text into leads and proposing how to merge duplicate leads',
  },
  opportunities: {
    name: 'Opportunity follow-up',
    skill: 'opportunity-follow-up',
    task: 'following opportunities up and organising pasted text into opportunities',
  },
  approvals: {
    name: 'Approval review',
    skill: 'approval-review',
    task: 'reviewing approval requests for their approvers',
  },
  tasks: {
    // Named for both of its works, the preparation and the outcome's
    // write-up, unlike the Auto follow-up tab, which shows the first.
    name: 'Task assistant',
    skill: 'task-preparation',
    task: 'preparing tasks for their owners and writing up what came of a task',
  },
  // Named Company signals until 2026-10-16, when it also looked new
  // companies up (renameWorkAgents moves an agent still so named).
  signals: {
    name: 'Company research',
    skill: 'company-signals',
    task: "finding on the web what the team needs to know about the companies it sells to: a new company's particulars, a lead's company before its follow-up, and what happened lately at the companies it watches",
  },
};

// A work's instructions: what it does, then the rules every work keeps.
export function workInstructions(work: Work): string {
  const rules = BACKGROUND_INSTRUCTIONS.split('\n').slice(1).join('\n');
  return `You do one part of the CRM's work: ${WORK_AGENTS[work].task}. Nobody reads your answer as a chat: the CRM reads it and shows the result to the people who decide.\n${rules}`;
}

// The work agents as the CRM names the one doing their work: the name as
// written and its translation's reference, its description the same way
// (the Auto follow-up page's card shows it), and the model it asks first
// (its first entry; null when it lists none and the default answers), by
// work, for those not archived.
export interface WorkAgentName {
  name: string;
  nameText: { key: string; ns: string } | null;
  description: string | null;
  descriptionText: { key: string; ns: string } | null;
  model: { modelService: string; model: string } | null;
}
export async function workAgentNames(
  database: DatabaseManager,
): Promise<Partial<Record<Work, WorkAgentName>>> {
  const ids = await workAgentIds(database);
  const wanted = Object.values(ids);
  if (!wanted.length) return {};
  const rows = await database
    .query()
    .selectFrom('agAgents')
    .select([
      'id',
      'name',
      'nameText',
      'description',
      'descriptionText',
      'modelEntries',
    ])
    .where('id', 'in', wanted)
    .where('archivedAt', 'is', null)
    .execute()
    .catch(() => []);
  const json = (value: unknown): unknown => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return null;
    }
  };
  const names: Partial<Record<Work, WorkAgentName>> = {};
  for (const work of WORKS) {
    const row = rows.find((candidate) => candidate.id === ids[work]);
    if (!row) continue;
    const reference = (value: unknown): { key: string; ns: string } | null => {
      const found = json(value) as { key?: unknown; ns?: unknown } | null;
      return typeof found?.key === 'string' && typeof found.ns === 'string'
        ? { key: found.key, ns: found.ns }
        : null;
    };
    const entries = json(row.modelEntries);
    const first = (Array.isArray(entries) ? entries[0] : null) as {
      modelService?: unknown;
      model?: unknown;
    } | null;
    names[work] = {
      name: String(row.name),
      nameText: reference(row.nameText),
      description: typeof row.description === 'string' ? row.description : null,
      descriptionText: reference(row.descriptionText),
      model:
        typeof first?.modelService === 'string' &&
        typeof first.model === 'string'
          ? { modelService: first.modelService, model: first.model }
          : null,
    };
  }
  return names;
}

// The work agents' ids, by work, as the marker keeps them.
export async function workAgentIds(
  database: DatabaseManager,
): Promise<Partial<Record<Work, string>>> {
  const row = await database
    .query()
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', WORK_AGENTS_MARKER)
    .executeTakeFirst()
    .catch(() => undefined);
  return idsOf(row?.value);
}

export async function provisionWorkAgents(
  agents: Agents,
  database: DatabaseManager,
): Promise<void> {
  const query = database.query();
  const marker = await query
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', WORK_AGENTS_MARKER)
    .executeTakeFirst();
  // The marker first: an instance starting beside this one finds it and
  // makes nothing.
  if (!marker)
    try {
      await query
        .insertInto('crmSettings')
        .values({
          id: WORK_AGENTS_MARKER,
          value: JSON.stringify({ version: 1, agentIds: {} }),
          updatedAt: new Date(),
        })
        .execute();
    } catch {
      return;
    }
  const known = idsOf(marker?.value);
  const missing = WORKS.filter((work) => !known[work]);
  if (!missing.length) return;
  const [creator] = await listUsers(database);
  if (!creator) return;
  // What the Background AI carried, for an installation that had it.
  const background = await backgroundOf(agents, database);
  // Every chat model of the enabled services, its provider's first and its
  // fast model leading them.
  const entries = await chatModelEntries(agents, FIRST_MODEL.provider);
  const fast = entries.findIndex((entry) => entry.model === FIRST_MODEL.model);
  const ordered =
    fast > 0
      ? [entries[fast], ...entries.slice(0, fast), ...entries.slice(fast + 1)]
      : entries;
  const skills = idsOf(
    (
      await query
        .selectFrom('crmSettings')
        .select('value')
        .where('id', '=', SKILLS_MARKER)
        .executeTakeFirst()
    )?.value,
    'skillIds',
  );
  // Which provider each model service is, for the company signals: every
  // chat model, those whose provider can search the web first
  // (web-research.ts), so the one asked can search unless an administrator
  // puts another first.
  const providers = new Map(
    (await agents.online.services.list()).map(
      (service) => [service.name, service.provider] as const,
    ),
  );
  const added: Partial<Record<Work, string>> = {};
  for (const work of missing) {
    // The Background AI's model order is not taken: it was Qwen's first for
    // all of the work, which these defaults replace.
    const modelEntries =
      work === 'signals'
        ? [
            ...ordered.filter((entry) =>
              SEARCHING.has(providers.get(entry.modelService) ?? ''),
            ),
            ...ordered.filter(
              (entry) =>
                !SEARCHING.has(providers.get(entry.modelService) ?? ''),
            ),
          ]
        : ordered;
    const agent = await agents.agents.create(creator.id, {
      name: WORK_AGENTS[work].name,
      type: 'online',
      description: WORK_AGENTS[work].name,
      descriptionText: { key: `crm.agentWork.${work}`, ns: 'crm' },
      instructions: background?.edited
        ? background.instructions
        : workInstructions(work),
      actions: [],
      access: 'ownerOnly',
      ...(modelEntries.length ? { modelEntries } : {}),
    });
    added[work] = agent.id;
    await nameWorkAgents(database, { [work]: agent.id });
    const skillId = skills[WORK_AGENTS[work].skill];
    if (skillId)
      await agents.skills
        .attach({ scope: 'agent', scopeId: agent.id }, [skillId])
        .catch(() => undefined);
  }
  await query
    .updateTable('crmSettings')
    .set({
      value: JSON.stringify({ version: 1, agentIds: { ...known, ...added } }),
      updatedAt: new Date(),
    })
    .where('id', '=', WORK_AGENTS_MARKER)
    .execute();
  // Its work now has agents of its own.
  if (background)
    await agents.agents.archive(background.id, null).catch(() => undefined);
}

// Each work agent named in the viewer's language (nameAgent). Run at every start, for the agents
// made before they were named.
export async function nameWorkAgents(
  database: DatabaseManager,
  ids?: Partial<Record<Work, string>>,
): Promise<void> {
  const known = ids ?? (await workAgentIds(database));
  for (const work of WORKS) {
    const id = known[work];
    if (id)
      await nameAgent(
        database,
        id,
        WORK_AGENTS[work].name,
        `crm.agentWork.names.${work}`,
      );
  }
}

// A work agent still bearing a name the CRM gave it before, moved to the
// current one (the plugin's update, so its history says so) and named in
// the viewer's language again; one an administrator renamed keeps theirs.
const FORMER_NAMES: Partial<Record<Work, readonly string[]>> = {
  // Company intelligence: its name for a moment on 2026-10-16, before it
  // was released.
  signals: ['Company signals', 'Company intelligence'],
};

export async function renameWorkAgents(
  agents: Agents,
  database: DatabaseManager,
): Promise<void> {
  const ids = await workAgentIds(database);
  for (const work of WORKS) {
    const id = ids[work];
    const former = FORMER_NAMES[work];
    if (!id || !former) continue;
    const agent = await agents.agents.get(id).catch(() => null);
    if (!agent || !former.includes(agent.name)) continue;
    await agents.agents
      .update(id, null, {
        name: WORK_AGENTS[work].name,
        expectedRevision: agent.revision,
      })
      .catch(() => undefined);
  }
}

// The Background AI gone, once every work has its agent: deleted (archived
// first, as the plugin deletes only an archived agent), its recorded use
// deleted from the usage page (under its name, and `crm` from before it
// had one), and its marker emptied, so nothing looks it up again. Run at
// every start; it does nothing once done. @temporary(nocobase-official):
// the usage is the plugin's own table, written directly, the plugin having
// no way to delete use.
export async function retireBackgroundAgent(
  agents: Agents,
  database: DatabaseManager,
): Promise<void> {
  const ids = await workAgentIds(database);
  if (!WORKS.every((work) => ids[work])) return;
  const query = database.query();
  const row = await query
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', BACKGROUND_MARKER)
    .executeTakeFirst();
  if (!row) return;
  let agentId: unknown;
  try {
    agentId = (
      (typeof row.value === 'string' ? JSON.parse(row.value) : row.value) as {
        agentId?: unknown;
      } | null
    )?.agentId;
  } catch {
    agentId = null;
  }
  if (typeof agentId === 'string' && agentId) {
    try {
      const agent = await agents.agents.get(agentId);
      if (!agent.archivedAt) await agents.agents.archive(agentId, null);
      await agents.agents.remove(agentId, null);
    } catch (error) {
      // Gone already (deleted by hand) goes on; one the plugin refuses (an
      // open run) is tried again at the next start.
      if (!/not found|404/i.test(String((error as Error)?.message ?? error)))
        return;
    }
  }
  await query
    .deleteFrom('agModelUsage')
    .where('source', 'in', [BACKGROUND_SOURCE, FORMER_SOURCE])
    .execute()
    .catch(() => undefined);
  await query
    .updateTable('crmSettings')
    .set({
      value: JSON.stringify({ version: 1, agentId: null, removed: true }),
      updatedAt: new Date(),
    })
    .where('id', '=', BACKGROUND_MARKER)
    .execute();
}

// The Background AI as it stands, while it is not archived: its
// instructions and whether an administrator changed them.
async function backgroundOf(
  agents: Agents,
  database: DatabaseManager,
): Promise<{ id: string; instructions: string; edited: boolean } | null> {
  const row = await database
    .query()
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', BACKGROUND_MARKER)
    .executeTakeFirst();
  let agentId: unknown;
  try {
    agentId = (
      (typeof row?.value === 'string' ? JSON.parse(row.value) : row?.value) as {
        agentId?: unknown;
      } | null
    )?.agentId;
  } catch {
    return null;
  }
  if (typeof agentId !== 'string' || !agentId) return null;
  try {
    const agent = await agents.agents.get(agentId);
    if (agent.archivedAt) return null;
    const instructions = (agent.instructions ?? '').trim();
    return {
      id: agentId,
      instructions,
      edited: Boolean(instructions) && instructions !== BACKGROUND_INSTRUCTIONS,
    };
  } catch {
    return null;
  }
}

function idsOf(
  value: unknown,
  key: 'agentIds' | 'skillIds' = 'agentIds',
): Record<string, string> {
  try {
    const parsed: unknown =
      typeof value === 'string' ? JSON.parse(value) : value;
    const ids = (parsed as Record<string, unknown> | null)?.[key];
    return ids && typeof ids === 'object'
      ? Object.fromEntries(
          Object.entries(ids as Record<string, unknown>).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === 'string' && Boolean(entry[1]),
          ),
        )
      : {};
  } catch {
    return {};
  }
}
