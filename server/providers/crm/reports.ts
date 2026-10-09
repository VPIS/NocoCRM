import type { Row } from '@nocobase/db';
import type { Actor } from './authorization.js';
import { probabilities, stages, toText, type CrmRecord } from './schema.js';
import type { CrmService } from './service.js';
import { allRecords } from './statistics.js';

// The overview's reports beyond its counts (dashboard.ts): what was won and
// what is likely to be, why deals are lost or paused, how long a deal takes
// and where it waits, and, for the team, how much work each person does.
// Each reads the records the reader may read, with the overview's scope.

const DAY = 86400000;
// Deals at least this likely (proposal on) count as the forecast's commit.
const COMMIT = 0.6;
const OPEN = (deal: CrmRecord): boolean =>
  !['won', 'lost', 'paused'].includes(toText(deal.stage));

// Sums of an amount per currency, as the overview's other money figures.
function totals(
  records: CrmRecord[],
  weight: (r: CrmRecord) => number = () => 1,
): Row {
  return records.reduce<Row>((sum, r) => {
    const currency = toText(r.currency);
    sum[currency] =
      Number(sum[currency] ?? 0) + Number(r.amount ?? 0) * weight(r);
    return sum;
  }, {});
}

const average = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

export async function reports(
  service: CrmService,
  actor: Actor,
  input: {
    team: boolean;
    timeZone: string;
    deals: CrmRecord[];
    sellers: readonly Row[];
    now?: Date;
  },
): Promise<Row> {
  const { deals, timeZone } = input;
  const now = input.now ?? new Date();
  const dayOf = (date: unknown): string =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(toText(date)));
  const today = dayOf(now);
  const year = Number(today.slice(0, 4));
  const monthNumber = Number(today.slice(5, 7));
  const monthKey = (offset: number): string =>
    new Date(Date.UTC(year, monthNumber - 1 + offset, 15))
      .toISOString()
      .slice(0, 7);
  const won = deals.filter((r) => r.stage === 'won' && r.closedAt);

  // What was won, month by month over the last six, and what the open
  // deals expected to close this month and this quarter may bring: the
  // likelier ones (commit), all of them (best case) and their weighted sum.
  const months = Array.from({ length: 6 }, (_, i) => {
    const key = monthKey(i - 5);
    const inMonth = won.filter((r) => dayOf(r.closedAt).startsWith(key));
    return { month: key, count: inMonth.length, won: totals(inMonth) };
  });
  const quarterStart = Math.floor((monthNumber - 1) / 3) * 3;
  const periods = {
    month: [monthKey(0), monthKey(0)],
    quarter: [
      monthKey(quarterStart - monthNumber + 1),
      monthKey(quarterStart - monthNumber + 3),
    ],
  } as const;
  const forecast = Object.fromEntries(
    Object.entries(periods).map(([name, [from, to]]) => {
      const within = (day: string): boolean =>
        day.slice(0, 7) >= from && day.slice(0, 7) <= to;
      const expected = deals.filter(
        (r) =>
          OPEN(r) && r.expectedCloseAt && within(toText(r.expectedCloseAt)),
      );
      const likely = expected.filter(
        (r) => (probabilities[toText(r.stage)] ?? 0) >= COMMIT,
      );
      const closedWon = won.filter((r) => within(dayOf(r.closedAt)));
      return [
        name,
        {
          from,
          to,
          won: totals(closedWon),
          wonCount: closedWon.length,
          commit: totals(likely),
          commitCount: likely.length,
          bestCase: totals(expected),
          bestCaseCount: expected.length,
          weighted: totals(
            expected,
            (r) => probabilities[toText(r.stage)] ?? 0,
          ),
        },
      ];
    }),
  );

  // Why deals were lost over the last 90 days, and why the paused ones
  // wait, each reason with its deals and their amount.
  const since = now.getTime() - 90 * DAY;
  const byReason = (records: CrmRecord[], field: string): Row[] =>
    [...new Set(records.map((r) => toText(r[field] ?? '')))]
      .map((reason) => {
        const of = records.filter((r) => toText(r[field] ?? '') === reason);
        return { reason: reason || null, count: of.length, amount: totals(of) };
      })
      .sort((a, b) => b.count - a.count);
  const lost = deals.filter(
    (r) =>
      r.stage === 'lost' &&
      r.closedAt &&
      Date.parse(toText(r.closedAt)) >= since,
  );
  const paused = deals.filter((r) => r.stage === 'paused');
  const reasons = {
    lost: byReason(lost, 'lostReason'),
    lostCount: lost.length,
    paused: byReason(paused, 'pauseReason'),
    pausedCount: paused.length,
  };

  // How long a deal takes from its creation to being won (those won in the
  // last year), and how long deals stay in each open stage, from the
  // stage changes in their history: the finished stays give the average;
  // an open deal past one and a half times it (two weeks at least, a month
  // where no average exists yet) is waiting too long.
  const year12 = now.getTime() - 365 * DAY;
  const recentWins = won.filter(
    (r) => Date.parse(toText(r.closedAt)) >= year12 && r.createdAt,
  );
  const cycleDays = average(
    recentWins.map(
      (r) =>
        (Date.parse(toText(r.closedAt)) - Date.parse(toText(r.createdAt))) /
        DAY,
    ),
  );
  const changes = await stageChanges(
    service,
    deals.map((r) => toText(r.id)),
  );
  const stays = new Map<string, number[]>();
  const current = new Map<string, number>();
  for (const deal of deals) {
    const steps = changes.get(toText(deal.id)) ?? [];
    let stage = steps[0]?.from ?? toText(deal.stage);
    let entered = Date.parse(toText(deal.createdAt));
    for (const step of steps) {
      if (Number.isFinite(entered) && step.at >= entered)
        stays.set(stage, [
          ...(stays.get(stage) ?? []),
          (step.at - entered) / DAY,
        ]);
      stage = step.to;
      entered = step.at;
    }
    if (OPEN(deal) && Number.isFinite(entered))
      current.set(toText(deal.id), (now.getTime() - entered) / DAY);
  }
  const openStages = stages.filter(
    (stage) => !['won', 'lost', 'paused'].includes(stage),
  );
  const averages = Object.fromEntries(
    openStages.map((stage) => [stage, average(stays.get(stage) ?? [])]),
  );
  const limit = (stage: string): number =>
    Math.max(14, 1.5 * (averages[stage] ?? 20));
  const waiting = deals
    .filter(
      (r) =>
        OPEN(r) && (current.get(toText(r.id)) ?? 0) > limit(toText(r.stage)),
    )
    .map((r) => ({
      id: r.id,
      name: r.name,
      stage: r.stage,
      ownerId: r.ownerId,
      days: Math.floor(current.get(toText(r.id)) ?? 0),
    }))
    .sort((a, b) => b.days - a.days);
  const cycle = {
    wonDays: cycleDays,
    wonCount: recentWins.length,
    stages: openStages.map((stage) => ({
      stage,
      averageDays: averages[stage],
      stays: (stays.get(stage) ?? []).length,
      open: deals.filter((r) => r.stage === stage).length,
      waiting: waiting.filter((r) => r.stage === stage).length,
    })),
    waiting: waiting.slice(0, 10),
    waitingCount: waiting.length,
  };

  return {
    revenue: { months, forecast },
    reasons,
    cycle,
    ...(input.team
      ? { activity: await activity(service, actor, input.sellers, dayOf, now) }
      : {}),
  };
}

// The stage changes of these deals, oldest first, from their history.
async function stageChanges(
  service: CrmService,
  ids: string[],
): Promise<Map<string, { from: string; to: string; at: number }[]>> {
  const result = new Map<string, { from: string; to: string; at: number }[]>();
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    if (!chunk.length) continue;
    const rows = await service.database
      .query()
      .selectFrom('crmHistory')
      .select(['recordId', 'fromValue', 'toValue', 'createdAt'])
      .where('entity', '=', 'opportunities')
      .where('action', '=', 'stage')
      .where('recordId', 'in', chunk)
      .execute();
    for (const row of rows) {
      const at = Date.parse(toText(row.createdAt));
      if (!Number.isFinite(at)) continue;
      const list = result.get(toText(row.recordId)) ?? [];
      list.push({ from: toText(row.fromValue), to: toText(row.toValue), at });
      result.set(toText(row.recordId), list);
    }
  }
  for (const list of result.values()) list.sort((a, b) => a.at - b.at);
  return result;
}

// What each seller did in each of the last four weeks (Monday to Sunday in
// the business time zone, this week last): the tasks they completed, the
// notes they wrote and the mail conversations of theirs that reached a
// record's timeline.
async function activity(
  service: CrmService,
  actor: Actor,
  sellers: readonly Row[],
  dayOf: (date: unknown) => string,
  now: Date,
): Promise<Row> {
  const today = dayOf(now);
  const todayUtc = Date.parse(`${today}T00:00:00Z`);
  const weekday = (new Date(todayUtc).getUTCDay() + 6) % 7;
  const weeks = Array.from({ length: 4 }, (_, i) =>
    new Date(todayUtc - (weekday + (3 - i) * 7) * DAY)
      .toISOString()
      .slice(0, 10),
  );
  const weekOf = (date: unknown): number => {
    const day = dayOf(date);
    for (let i = weeks.length - 1; i >= 0; i--) if (day >= weeks[i]) return i;
    return -1;
  };
  // A day's margin before the first Monday, for the time zone.
  const from = new Date(
    Date.parse(`${weeks[0]}T00:00:00Z`) - DAY,
  ).toISOString();
  const tasks = await allRecords(service, actor, 'tasks', {
    status: 'completed',
  });
  const entries = await service.database
    .query()
    .selectFrom('crmHistory')
    .select(['actorId', 'action', 'createdAt', 'occurredAt'])
    .where('action', 'in', ['note', 'mail'])
    .where('createdAt', '>=', from)
    .execute();
  const rows = sellers.map((seller) => {
    const id = toText(seller.id);
    const counts = weeks.map(() => ({ tasks: 0, notes: 0, mails: 0 }));
    for (const task of tasks) {
      // Completed when it was, else when it was due, as the overview's
      // month counts it (statistics.ts).
      const done = task.completedAt ?? task.dueAt;
      if (toText(task.ownerId) !== id || !done) continue;
      const week = weekOf(done);
      if (week >= 0) counts[week].tasks++;
    }
    for (const entry of entries) {
      if (toText(entry.actorId) !== id) continue;
      const week = weekOf(entry.occurredAt ?? entry.createdAt);
      if (week < 0) continue;
      if (entry.action === 'note') counts[week].notes++;
      else counts[week].mails++;
    }
    const total = counts.reduce(
      (sum, c) => ({
        tasks: sum.tasks + c.tasks,
        notes: sum.notes + c.notes,
        mails: sum.mails + c.mails,
      }),
      { tasks: 0, notes: 0, mails: 0 },
    );
    return { id, name: seller.name, weeks: counts, total };
  });
  return { weeks, rows };
}
