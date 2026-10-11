import type { DatabaseManager } from '@nocobase/db';
import { Job, type JobClass, type JobExecutionContext } from '@nocobase/jobs';
import { jsonValue } from './values.js';

// The AI's follow-ups of leads and deals (lead-evaluation.ts,
// opportunity-evaluation.ts) run as tasks of the application's jobs
// service: a follow-up asked for is recorded as a running card and its task
// queued, so a restart picks it up again (the memory adapter writes pending
// tasks to storage on shutdown; Redis keeps them outright) and the tasks of
// leads and deals together run as many at a time as the `crmFollowUps`
// jobs configuration allows (server/config/jobs.ts). A task carries only the
// card it fills; it does nothing when the card is no longer running, so a
// task replayed after recovery cannot run a follow-up twice.

// The jobs configuration the follow-ups run on.
export const FOLLOW_UP_JOBS = 'crmFollowUps';

export interface FollowUpPayload {
  [key: string]: string | null;
  // An approval's: its review for the approver (approval-review.ts); a
  // task's: its preparation for the owner (task-preparation.ts).
  entity: 'leads' | 'opportunities' | 'approvals' | 'tasks';
  // The card (crmHistory, action `ai`) the run fills.
  entryId: string;
  // The language the follow-up is written in, when the person asking was
  // the owner; null for the owner's own.
  language: string | null;
}

// The task class, around the function that runs a card: created by the
// provider with the evaluators in scope, since a job gets nothing but its
// payload.
export function createFollowUpJob(
  run: (payload: FollowUpPayload, signal: AbortSignal) => Promise<void>,
): JobClass<FollowUpPayload, Job<FollowUpPayload>> {
  return class FollowUpJob extends Job<FollowUpPayload> {
    public static readonly jobName: string = 'crm.follow-up';
    public async execute({ signal }: JobExecutionContext): Promise<void> {
      await run(this.payload, signal);
    }
  };
}

// A model call's limit, ended early by the task's own signal (the
// application shutting down) when there is one.
export function within(ms: number, signal?: AbortSignal): AbortSignal {
  return signal
    ? AbortSignal.any([AbortSignal.timeout(ms), signal])
    : AbortSignal.timeout(ms);
}

// When a card's run began (`ai.startedAt`), which tells one being worked on
// from one waiting its turn; cleared again when shutdown hands the task
// back to wait for the next start.
export async function markStarted(
  database: DatabaseManager,
  entryId: string,
  started: boolean,
): Promise<void> {
  const row = await database
    .query()
    .selectFrom('crmHistory')
    .select('ai')
    .where('id', '=', entryId)
    .executeTakeFirst();
  if (!row) return;
  const { startedAt: _startedAt, ...ai } = (jsonValue(row.ai) ?? {}) as Record<
    string,
    unknown
  >;
  await database
    .query()
    .updateTable('crmHistory')
    .set({
      ai: JSON.stringify(
        started ? { ...ai, startedAt: new Date().toISOString() } : ai,
      ),
    })
    .where('id', '=', entryId)
    .execute();
}

// One run of a card at a time in this process. A card queued again at start
// (runningCards) may meet the task the queue kept for it; whichever comes
// second does nothing while the first runs, and nothing once the card is no
// longer running.
export function oncePerCard(
  run: (payload: FollowUpPayload, signal: AbortSignal) => Promise<void>,
): (payload: FollowUpPayload, signal: AbortSignal) => Promise<void> {
  const claimed = new Set<string>();
  return async (payload, signal) => {
    if (claimed.has(payload.entryId)) return;
    claimed.add(payload.entryId);
    try {
      await run(payload, signal);
    } finally {
      claimed.delete(payload.entryId);
    }
  };
}

// The cards still running when the application starts. The memory queue
// writes its tasks to storage on a shutdown that finishes; one cut short
// (a forced exit, a killed process) loses them, and their cards would wait
// a day before reading as failed. The provider queues these again; a card
// whose task was kept runs once all the same (oncePerCard, and a run does
// nothing for a card no longer running).
export async function runningCards(
  database: DatabaseManager,
): Promise<FollowUpPayload[]> {
  const rows = await database
    .query()
    .selectFrom('crmHistory')
    .select(['id', 'entity'])
    .where('action', '=', 'ai')
    .where('aiStatus', '=', 'running')
    .where('entity', 'in', ['leads', 'opportunities', 'approvals', 'tasks'])
    .orderBy('createdAt')
    .execute();
  return rows.map((row) => ({
    entity: String(row.entity) as FollowUpPayload['entity'],
    entryId: String(row.id),
    language: null,
  }));
}
