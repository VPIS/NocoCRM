import type { QueryAdapter } from '@nocobase/db';

// When a record was last in touch with its customer, as the dashboard's
// risks, the statistics and the daily checks read it: the latest of a task
// of it completed, a comment written on it, and mail exchanged with its people
// (a `mail` timeline entry, mail-timeline.ts) or on WhatsApp (a `whatsapp`
// entry, whatsapp/service.ts). Read over the whole database,
// not the reader's scope: a colleague's call still means the customer was
// reached. Without any, a record counts from its creation.

export type ExchangeEntity = 'leads' | 'companies' | 'opportunities';

const TASK_LINK: Record<ExchangeEntity, string> = {
  leads: 'leadId',
  companies: 'companyId',
  opportunities: 'opportunityId',
};

function time(value: unknown): number {
  if (value instanceof Date) return value.getTime() || 0;
  return typeof value === 'string' ? Date.parse(value) || 0 : 0;
}

function latest(map: Map<string, number>, id: unknown, at: unknown): void {
  const key = typeof id === 'string' ? id : '';
  const when = time(at);
  if (!key || !when) return;
  if (when > (map.get(key) ?? 0)) map.set(key, when);
}

// The time of each record's latest exchange, by its id; a record with none
// is absent.
export async function lastExchanges(
  query: QueryAdapter,
  entity: ExchangeEntity,
): Promise<Map<string, number>> {
  const last = new Map<string, number>();
  const link = TASK_LINK[entity];
  const tasks = await query
    .selectFrom('crmTasks')
    .select([link, 'completedAt'])
    .where('status', '=', 'completed')
    .where(link, 'is not', null)
    .execute();
  for (const task of tasks) latest(last, task[link], task.completedAt);
  const entries = await query
    .selectFrom('crmHistory')
    .select(['recordId', 'action', 'createdAt', 'occurredAt'])
    .where('entity', '=', entity)
    .where('action', 'in', ['comment', 'mail', 'whatsapp'])
    .execute();
  for (const entry of entries)
    latest(
      last,
      entry.recordId,
      entry.action === 'comment' ? entry.createdAt : entry.occurredAt,
    );
  return last;
}

// The records with an open task still to come (due from now on), which
// keeps a lead off the stalled list: something is planned.
export async function upcomingTasks(
  query: QueryAdapter,
  entity: ExchangeEntity,
  now = new Date(),
): Promise<Set<string>> {
  const link = TASK_LINK[entity];
  const rows = await query
    .selectFrom('crmTasks')
    .select([link])
    .where('status', '=', 'open')
    .where(link, 'is not', null)
    .where('dueAt', '>=', now.toISOString())
    .execute();
  return new Set(rows.map((row) => String(row[link])));
}
