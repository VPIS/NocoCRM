import type { Row } from '@nocobase/db';
import { readEntry } from './ai-entries.js';
import type { OpportunityEvaluator } from './opportunity-evaluation.js';
import { toText } from './schema.js';
import { lastExchanges } from './exchanges.js';
import type { CrmService } from './service.js';
import { agentOn } from './agents.js';
import { crmActor } from './authorization.js';
import { ACTING_TYPES } from './company-signals.js';

// The daily look over the open deals for what should have happened and has
// not, as lead-signals.ts does for leads: a deal gone quiet for fourteen
// days, a deal whose expected close date is a week off or already past, a
// paused deal whose resume date has come, and an open deal whose company
// has news worth acting on (company-signals.ts: funding, a new executive,
// major news or a risk, not dismissed) found since its last follow-up; the
// signals' own morning check, an hour before, starts no follow-up of its
// own, so a deal is followed up at most once a day. Each starts the deal's
// follow-up as its owner, the card saying what started it, so it lands in
// the owner's Waiting on me. A deal with a card already waiting or being
// worked on is left alone, the same signal does not start again within a
// week, and a pass starts at most `limit` follow-ups, the oldest deals
// first. The scheduler plugin runs it once a day (CrmProvider).

const DAY = 86_400_000;
const SAME_SIGNAL_WITHIN = 7 * DAY;

// The thresholds, in days, from the CRM's settings (leadStaleDays, which
// covers deals too, and closeReminderDays), the dashboard counting by the
// same.
export interface DealSignalDays {
  stale: number;
  closing: number;
}
const DEFAULT_DAYS: DealSignalDays = { stale: 14, closing: 7 };

export type DealSignal = 'silent' | 'closeDue' | 'resumeDue' | 'companySignal';

export interface DealSignalPass {
  checked: number;
  started: Partial<Record<DealSignal, number>>;
}

// The signal a deal gives at `now`, if any, from its stage, its dates and
// its tasks and its last exchange (a task completed, a comment, mail;
// exchanges.ts), 0 when it has had none. A paused deal only says when its
// pause is over; an open one first that its close date is near or past,
// else that it went quiet.
export function dealSignal(
  deal: Row,
  tasks: readonly Row[],
  now: number,
  days: DealSignalDays = DEFAULT_DAYS,
  lastExchange = 0,
): DealSignal | undefined {
  const SILENT_AFTER = days.stale * DAY;
  const CLOSING_WITHIN = days.closing * DAY;
  const at = (value: unknown): number =>
    value ? new Date(value as string).getTime() : NaN;
  const stage = toText(deal.stage);
  if (stage === 'won' || stage === 'lost') return undefined;
  if (stage === 'paused')
    return at(deal.resumeAt) <= now ? 'resumeDue' : undefined;
  if (at(deal.expectedCloseAt) - now <= CLOSING_WITHIN) return 'closeDue';
  const ahead = tasks.some((a) => a.status === 'open' && at(a.dueAt) >= now);
  return now - Math.max(lastExchange, at(deal.createdAt)) > SILENT_AFTER &&
    !ahead
    ? 'silent'
    : undefined;
}

export async function scanDealSignals(
  service: CrmService,
  evaluator: OpportunityEvaluator,
  now = new Date(),
  limit = 20,
): Promise<DealSignalPass> {
  const pass: DealSignalPass = { checked: 0, started: {} };
  if (!(await evaluator.available())) return pass;
  // Switched off on the opportunity agent's page (agents.ts).
  if (!(await agentOn(service, 'opportunities', 'daily'))) return pass;
  const settings = await service.settings();
  const days = {
    stale: settings.leadStaleDays,
    closing: settings.closeReminderDays,
  };
  const query = service.database.query();
  const deals = await query
    .selectFrom('crmOpportunities')
    .select([
      'id',
      'stage',
      'ownerId',
      'companyId',
      'createdAt',
      'expectedCloseAt',
      'resumeAt',
    ])
    .where('stage', 'not in', ['won', 'lost'])
    .orderBy('createdAt', 'asc')
    .execute();
  pass.checked = deals.length;
  if (!deals.length) return pass;
  const ids = deals.map((deal) => toText(deal.id));
  const exchanges = await lastExchanges(query, 'opportunities');
  // When each company last had news worth acting on.
  const news = new Map<string, number>();
  const companyIds = [
    ...new Set(deals.map((deal) => toText(deal.companyId)).filter(Boolean)),
  ];
  for (let i = 0; i < companyIds.length; i += 500)
    for (const row of await query
      .selectFrom('crmSignals')
      .select(['companyId', 'createdAt'])
      .where('companyId', 'in', companyIds.slice(i, i + 500))
      .where('status', '!=', 'dismissed')
      .where('type', 'in', [...ACTING_TYPES])
      .execute()) {
      const key = toText(row.companyId);
      news.set(
        key,
        Math.max(news.get(key) ?? 0, Date.parse(toText(row.createdAt))),
      );
    }
  const tasks = new Map<string, Row[]>();
  const entries = new Map<string, ReturnType<typeof readEntry>[]>();
  // In chunks, as SQLite caps the parameters of one statement.
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    for (const task of await query
      .selectFrom('crmTasks')
      .select(['opportunityId', 'status', 'dueAt'])
      .where('opportunityId', 'in', chunk)
      .execute()) {
      const key = toText(task.opportunityId);
      tasks.set(key, [...(tasks.get(key) ?? []), task]);
    }
    for (const row of await query
      .selectFrom('crmHistory')
      .selectAll()
      .where('entity', '=', 'opportunities')
      .where('action', '=', 'ai')
      .where('recordId', 'in', chunk)
      .execute()) {
      const key = toText(row.recordId);
      entries.set(key, [...(entries.get(key) ?? []), readEntry(row)]);
    }
  }
  let started = 0;
  for (const deal of deals) {
    if (started >= limit) break;
    const id = toText(deal.id);
    const own = entries.get(id) ?? [];
    // A card waiting on the owner or being worked on: its reminder is
    // there, nothing to add.
    if (own.some((e) => e.status === 'pending' || e.status === 'running'))
      continue;
    // The last follow-up that came to something (one that failed is tried
    // again).
    const lastFollowUp = Math.max(
      0,
      ...own
        .filter((e) => e.status !== 'failed')
        .map((e) => Date.parse(e.createdAt)),
    );
    // Its own signal first; else its company's news since that follow-up,
    // for an open deal (a paused one waits for its resume date).
    const signal =
      dealSignal(
        deal,
        tasks.get(id) ?? [],
        now.getTime(),
        days,
        exchanges.get(id) ?? 0,
      ) ??
      (toText(deal.stage) !== 'paused' &&
      (news.get(toText(deal.companyId)) ?? 0) > lastFollowUp
        ? 'companySignal'
        : undefined);
    if (!signal || !deal.ownerId) continue;
    // Once a week per signal, counting only follow-ups that came to
    // something: one that failed is tried again on the next pass. The
    // company's news needs no such wait: it is news since the last one.
    if (
      signal !== 'companySignal' &&
      own.some(
        (e) =>
          e.ai.trigger === signal &&
          e.status !== 'failed' &&
          now.getTime() - Date.parse(e.createdAt) < SAME_SIGNAL_WITHIN,
      )
    )
      continue;
    // As the owner, who decides on the card, in the language they use.
    const ownerId = toText(deal.ownerId);
    const owner = crmActor(service.authz, {
      id: ownerId,
      locale: await service.localeOf(ownerId),
    });
    try {
      if (await evaluator.request(owner, id, undefined, signal)) {
        started += 1;
        pass.started[signal] = (pass.started[signal] ?? 0) + 1;
      }
    } catch {
      // A deal the owner can no longer read, or that closed meanwhile: the
      // next pass looks again.
    }
  }
  return pass;
}
