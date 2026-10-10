import type { Row } from '@nocobase/db';
import type { QueryAdapter } from '@nocobase/db';
import { agentOn } from './agents.js';
import type { Actor } from './authorization.js';
import type { LeadEvaluator } from './lead-evaluation.js';
import type { OpportunityEvaluator } from './opportunity-evaluation.js';
import { toText, type CrmRecord, type Entity } from './schema.js';
import type { CrmService } from './service.js';

// What a saved record starts besides the save, the same whichever way the
// save came: the create and update routes, or a plan an agent proposed and a
// person confirmed (plans/engine.ts). Each runs once the save has committed.

export interface FollowUpWorkers {
  leads: () => LeadEvaluator | undefined;
  opportunities: () => OpportunityEvaluator | undefined;
}

// A new lead or opportunity is followed up by the AI in the background,
// unless the person creating it unticked that; the record stands whether or
// not that can start. Only while its agent runs on that trigger (agents.ts).
export async function afterCreate(
  service: CrmService,
  workers: FollowUpWorkers,
  actor: Actor,
  entity: Entity,
  record: CrmRecord,
  followUp: boolean,
): Promise<void> {
  if (!followUp) return;
  if (entity === 'leads' && (await agentOn(service, 'leads', 'created')))
    await workers
      .leads()
      ?.request(actor, toText(record.id), undefined, 'created')
      .catch(() => undefined);
  if (
    entity === 'opportunities' &&
    (await agentOn(service, 'opportunities', 'opened'))
  )
    await workers
      .opportunities()
      ?.request(actor, toText(record.id), undefined, 'opened')
      .catch(() => undefined);
}

// What an update is measured against: a task about to be marked done, a
// lead whose company may change. Undefined for the other objects.
export async function beforeUpdate(
  service: CrmService,
  actor: Actor,
  entity: Entity,
  id: string,
  query?: QueryAdapter,
): Promise<Row | undefined> {
  return entity === 'tasks' || entity === 'leads'
    ? service.get(actor, entity, id, query).catch(() => undefined)
    : undefined;
}

// A task marked done starts the follow-up of its deal or lead; a lead's
// company or website changed by a person has the AI look it up again.
export function afterUpdate(
  service: CrmService,
  actor: Actor,
  entity: Entity,
  id: string,
  before: Row | undefined,
  record: CrmRecord,
): void {
  if (!before) return;
  if (
    entity === 'tasks' &&
    before.status !== 'completed' &&
    record.status === 'completed'
  )
    service.taskCompleted?.(actor, record);
  if (
    entity === 'leads' &&
    ['new', 'working', 'nurturing'].includes(toText(record.status)) &&
    (['company', 'website'] as const).some(
      (key) =>
        toText(record[key] ?? '').trim() !== '' &&
        toText(record[key] ?? '').trim() !== toText(before[key] ?? '').trim(),
    )
  )
    service.leadCompanyChanged?.(actor, id);
}
