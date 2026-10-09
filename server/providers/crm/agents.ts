import type { Row } from '@nocobase/db';
import { readEntry } from './ai-entries.js';
import { requireCapability, type Actor } from './authorization.js';
import { CrmError, toText, type Entity } from './schema.js';
import type { CrmService } from './service.js';
import { resolveTitles } from './titles.js';

// The CRM's agents as the Agents section of the menu shows them: the AI's
// work the system starts on its own, one agent per kind of record it works
// on. Each runs on triggers (a lead created, the daily check, a task done,
// a customer's reply…) that an administrator switches on and off here, the
// agent as a whole too; a person asking for a follow-up on a record is
// never switched off. Their runs are the `ai` entries of the records'
// history (ai-entries.ts), read with the reader's access.

export const AGENTS = ['leads', 'opportunities', 'approvals'] as const;
export type AgentName = (typeof AGENTS)[number];

// The triggers each agent runs on, in the order its page lists them.
export const AGENT_TRIGGERS: Record<AgentName, readonly string[]> = {
  leads: [
    'created',
    'daily',
    'taskDone',
    'customerReplied',
    'companyChanged',
    'merged',
  ],
  opportunities: [
    'opened',
    'daily',
    'taskDone',
    'approvalDecided',
    'customerReplied',
  ],
  approvals: ['submitted'],
};

// The daily checks' signals (lead-signals.ts, deal-signals.ts) all fall
// under the agent's daily trigger.
const DAILY_SIGNALS = new Set([
  'uncontacted',
  'silent',
  'nurtureDue',
  'closeDue',
  'resumeDue',
]);
export const switchOf = (trigger: string): string =>
  DAILY_SIGNALS.has(trigger) ? 'daily' : trigger;

export interface AgentSwitch {
  // Whether it runs on its own at all.
  enabled: boolean;
  triggers: Record<string, boolean>;
}
export type AgentSwitches = Record<AgentName, AgentSwitch>;

const ROW = 'agents';

// Every agent and trigger on unless an administrator switched it off.
export async function agentSwitches(
  service: CrmService,
): Promise<AgentSwitches> {
  const row = await service.database
    .query()
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', ROW)
    .executeTakeFirst();
  const raw = row?.value;
  const stored = (
    typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {})
  ) as Partial<Record<string, Partial<AgentSwitch>>>;
  return Object.fromEntries(
    AGENTS.map((agent) => [
      agent,
      {
        enabled: stored[agent]?.enabled !== false,
        triggers: Object.fromEntries(
          AGENT_TRIGGERS[agent].map((trigger) => [
            trigger,
            stored[agent]?.triggers?.[trigger] !== false,
          ]),
        ),
      },
    ]),
  ) as AgentSwitches;
}

// Whether the agent runs on this trigger now: itself on, and the trigger.
export async function agentOn(
  service: CrmService,
  agent: AgentName,
  trigger: string,
): Promise<boolean> {
  const switches = (await agentSwitches(service))[agent];
  return switches.enabled && switches.triggers[switchOf(trigger)] !== false;
}

// An administrator's change to one agent's switches; unknown triggers are
// refused.
export async function saveAgentSwitch(
  service: CrmService,
  actor: Actor,
  agent: string,
  input: Partial<AgentSwitch>,
): Promise<AgentSwitches> {
  await requireCapability(actor, 'manage', 'settings');
  if (!AGENTS.includes(agent as AgentName)) throw new CrmError('notFound', 404);
  const name = agent as AgentName;
  const current = await agentSwitches(service);
  const next: AgentSwitch = {
    enabled: current[name].enabled,
    triggers: { ...current[name].triggers },
  };
  if (input.enabled !== undefined) {
    if (typeof input.enabled !== 'boolean')
      throw new CrmError('invalidInput', 400, 'enabled');
    next.enabled = input.enabled;
  }
  for (const [trigger, on] of Object.entries(input.triggers ?? {})) {
    if (!AGENT_TRIGGERS[name].includes(trigger) || typeof on !== 'boolean')
      throw new CrmError('invalidInput', 400, 'triggers');
    next.triggers[trigger] = on;
  }
  const value = JSON.stringify({ ...current, [name]: next });
  await service.database.transaction(async ({ query }) => {
    const existing = await query
      .selectFrom('crmSettings')
      .select('id')
      .where('id', '=', ROW)
      .executeTakeFirst();
    if (existing)
      await query
        .updateTable('crmSettings')
        .set({ value, updatedAt: new Date().toISOString() })
        .where('id', '=', ROW)
        .execute();
    else
      await query
        .insertInto('crmSettings')
        .values({ id: ROW, value, updatedAt: new Date().toISOString() })
        .execute();
  });
  return agentSwitches(service);
}

const DAY = 86_400_000;
const STATUSES = ['running', 'pending', 'accepted', 'dismissed', 'failed'];

// An agent's page: its switches, how its runs fared over the last 7 and 30
// days, and its runs newest first, a page at a time. Only the runs on
// records the reader may read; an approval's review only for its approver,
// who alone reads it (approval-review.ts).
export async function agentOverview(
  service: CrmService,
  actor: Actor,
  agent: string,
  options: {
    page?: number;
    pageSize?: number;
    trigger?: string;
    status?: string;
  },
): Promise<Row> {
  if (!AGENTS.includes(agent as AgentName)) throw new CrmError('notFound', 404);
  const name = agent as AgentName;
  const entity: Entity = name;
  const now = Date.now();
  const rows = await service.database
    .query()
    .selectFrom('crmHistory')
    .selectAll()
    .where('entity', '=', entity)
    .where('action', '=', 'ai')
    .where('createdAt', '>=', new Date(now - 90 * DAY).toISOString())
    .orderBy('createdAt', 'desc')
    .execute();
  // The records the reader may read, with what the runs need from them.
  const ids = [...new Set(rows.map((row) => toText(row.recordId)))];
  const readable = new Map<string, Row>();
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await service.list(actor, entity, {
      ids: ids.slice(i, i + 500).join(','),
      pageSize: 1000,
    });
    for (const record of data) readable.set(toText(record.id), record);
  }
  const runs = rows
    .map((row) => readEntry(row))
    .filter((entry) => {
      const record = readable.get(entry.recordId);
      if (!record) return false;
      return name !== 'approvals' || record.approverId === actor.id;
    })
    // A card superseded unseen by a newer one was not a run of its own to
    // judge; one retired with what became of its approval was.
    .filter(
      (entry) =>
        entry.status !== 'superseded' ||
        Boolean((entry.ai as { approvalOutcome?: string }).approvalOutcome),
    );
  const triggerOf = (entry: (typeof runs)[number]): string =>
    entry.ai.trigger
      ? switchOf(entry.ai.trigger)
      : entry.ai.instruction
        ? 'revised'
        : name === 'approvals'
          ? 'submitted'
          : 'asked';
  const statusOf = (entry: (typeof runs)[number]): string =>
    entry.status === 'superseded' ? 'retired' : entry.status;
  const stats = (days: number): Row => {
    const since = now - days * DAY;
    const within = runs.filter((e) => Date.parse(e.createdAt) >= since);
    const counts = Object.fromEntries(
      [...STATUSES, 'retired'].map((s) => [
        s,
        within.filter((e) => statusOf(e) === s).length,
      ]),
    );
    const decided = counts.accepted + counts.dismissed;
    return {
      runs: within.length,
      ...counts,
      // Of those a person decided, the share accepted.
      acceptance: decided ? counts.accepted / decided : null,
    };
  };
  const listed = runs.filter(
    (e) =>
      (!options.trigger || triggerOf(e) === options.trigger) &&
      (!options.status || statusOf(e) === options.status),
  );
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const shown = listed.slice((page - 1) * pageSize, page * pageSize);
  const records = shown
    .map((e) => readable.get(e.recordId))
    .filter((r): r is Row => Boolean(r));
  const { titles } = await resolveTitles(
    service,
    actor,
    {},
    {
      [entity]: records.map((r) => toText(r.id)),
    },
  );
  const switches = (await agentSwitches(service))[name];
  return {
    agent: name,
    switches,
    triggers: AGENT_TRIGGERS[name],
    week: stats(7),
    month: stats(30),
    total: listed.length,
    page,
    pageSize,
    runs: shown.map((e) => {
      const record = readable.get(e.recordId);
      const result = (e.ai.result ?? {}) as Row;
      return {
        id: e.id,
        recordId: e.recordId,
        name: titles[e.recordId] ?? toText(record?.name ?? ''),
        ownerId: record?.ownerId ?? null,
        createdAt: e.createdAt,
        trigger: triggerOf(e),
        status: statusOf(e),
        recommendation: result.recommendation ?? null,
        grade: result.grade ?? null,
        summary: result.summary ?? null,
      };
    }),
  };
}

// How many runs each agent has under way on the records the reader may read
// (an approval's review only for its approver), for the menu: a run waiting
// its turn or being worked on, until it lapses (ai-entries.ts).
export async function runningAgents(
  service: CrmService,
  actor: Actor,
): Promise<Record<AgentName, number>> {
  const rows = await service.database
    .query()
    .selectFrom('crmHistory')
    .selectAll()
    .where('action', '=', 'ai')
    .where('aiStatus', '=', 'running')
    .where('entity', 'in', [...AGENTS])
    .where('createdAt', '>=', new Date(Date.now() - 2 * DAY).toISOString())
    .execute();
  const result = Object.fromEntries(AGENTS.map((a) => [a, 0])) as Record<
    AgentName,
    number
  >;
  for (const agent of AGENTS) {
    const entries = rows
      .filter((row) => row.entity === agent)
      .map((row) => readEntry(row))
      .filter((entry) => entry.status === 'running');
    if (!entries.length) continue;
    const ids = [...new Set(entries.map((e) => e.recordId))];
    const { data } = await service.list(actor, agent, {
      ids: ids.join(','),
      pageSize: 1000,
    });
    const readable = new Map(data.map((r) => [toText(r.id), r]));
    result[agent] = entries.filter((e) => {
      const record = readable.get(e.recordId);
      return (
        record && (agent !== 'approvals' || record.approverId === actor.id)
      );
    }).length;
  }
  return result;
}
