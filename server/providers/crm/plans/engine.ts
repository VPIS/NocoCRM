import { randomUUID } from 'node:crypto';
import {
  createServiceToken,
  type ServiceToken,
} from '@nocobase/service-provider';
import type { QueryAdapter, Row } from '@nocobase/db';
import type { Actor, ActorOrigin } from '../authorization.js';
import { convertLead } from '../conversion.js';
import {
  afterCreate,
  afterUpdate,
  beforeUpdate,
  type FollowUpWorkers,
} from '../record-hooks.js';
import { asEntity, CrmError, object, toText, type Entity } from '../schema.js';
import type { CrmService } from '../service.js';
import { jsonValue } from '../values.js';

/**
 * Plans: changes an agent proposes, which the person who woke it confirms on
 * a decision card, carried out by the CRM as that person (migration step 2).
 *
 * @temporary(nocobase-official) The projects plugin has the same engine with
 * its own operations only. Replace this with the shared one once it lets an
 * application register its operations; keep the statuses, the routes'
 * shapes and the rows' fields as they are so the swap changes no client.
 * Checklist: rehearsal rolls back and names the refused step; execution is
 * one transaction as the decider; a record changed since the proposal makes
 * the plan stale; a pending plan expires after a day; the outcome is
 * delivered to the agent's conversation.
 */

export const PLAN_OPS = [
  'record.create',
  'record.update',
  'lead.convert',
  'comment.create',
  'task.recordOutcome',
  'approval.submit',
  'approval.withdraw',
] as const;
export type PlanOp = (typeof PLAN_OPS)[number];

export interface PlanStepInput {
  op: PlanOp;
  // How a later step names the record this one creates; `$<position>`
  // names it too.
  ref?: string;
  params: Row;
}

export interface PlanInput {
  title: string;
  summary?: string;
  steps: PlanStepInput[];
}

// Who proposed it: the agent and its run, and the conversation the outcome
// goes back to.
export interface PlanSource {
  agentId: string | null;
  agentName: string | null;
  runId: string | null;
  conversationId: string | null;
}

export const PLAN_STATUSES = [
  'pending',
  'executing',
  'executed',
  'failed',
  'stale',
  'voided',
  'expired',
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

// What a step does to a record, as the rehearsal found it.
export interface StepCheck {
  entity: Entity;
  id: string | null;
  name: string;
  changes: { field: string; from: unknown; to: unknown }[];
  // The record's `updatedAt` when rehearsed: a later one at execution means
  // someone changed it since, and the plan is stale.
  updatedAt?: string | null;
}

export interface PlanStepView {
  id: string;
  position: number;
  op: PlanOp;
  ref: string | null;
  params: Row;
  check: StepCheck | null;
  status: 'pending' | 'done' | 'failed' | 'removed';
  result: Row | null;
}

export interface PlanView {
  id: string;
  title: string;
  summary: string | null;
  status: PlanStatus;
  revision: number;
  proposerUserId: string;
  agentId: string | null;
  agentName: string | null;
  runId: string | null;
  conversationId: string | null;
  deciderUserId: string | null;
  decidedAt: string | null;
  failure: Row | null;
  expiresAt: string;
  createdAt: string;
  steps: PlanStepView[];
}

// The outcome a decision sends back to the agent's conversation.
export interface PlanOutcome {
  plan: PlanView;
  decision: 'executed' | 'voided' | 'failed' | 'stale';
}

const DAY = 24 * 60 * 60 * 1000;
const MAX_STEPS = 50;

class Rehearsed extends Error {
  constructor(readonly checks: StepCheck[]) {
    super('rehearsed');
  }
}
class StepRefused extends Error {
  constructor(
    readonly position: number,
    readonly cause: unknown,
  ) {
    super('step refused');
  }
}

// A value read back from a JSON column.
const json = (value: unknown): Row | null => {
  const parsed = jsonValue(value);
  return parsed && typeof parsed === 'object' ? (parsed as Row) : null;
};
const iso = (value: unknown): string | null =>
  value == null ? null : new Date(toText(value)).toISOString();

export class CrmPlans {
  // Tells the agent's conversation how a decision came out; set by the
  // provider when the Agents plugin is there.
  onDecided?: (outcome: PlanOutcome) => Promise<void>;

  constructor(
    private readonly service: CrmService,
    private readonly workers: FollowUpWorkers,
  ) {}

  // Rehearses the steps as the person, and keeps the plan when every one of
  // them would go through; otherwise names the step refused and why.
  async create(
    actor: Actor,
    input: PlanInput,
    source: PlanSource,
  ): Promise<PlanView> {
    if (!input.steps.length || input.steps.length > MAX_STEPS)
      throw new CrmError('invalidInput', 400, 'steps');
    const checks = await this.rehearse(actor, input.steps);
    const now = new Date();
    const id = randomUUID();
    await this.service.database.transaction(async ({ query }) => {
      await query
        .insertInto('crmPlans')
        .values({
          id,
          title: input.title.trim().slice(0, 255),
          summary: input.summary?.trim() || null,
          status: 'pending',
          revision: 1,
          proposerUserId: actor.id,
          agentId: source.agentId,
          agentName: source.agentName,
          runId: source.runId,
          conversationId: source.conversationId,
          deciderUserId: null,
          decidedAt: null,
          failure: null,
          expiresAt: new Date(now.getTime() + DAY).toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        })
        .execute();
      for (const [index, step] of input.steps.entries()) {
        const check = checks[index];
        await query
          .insertInto('crmPlanRows')
          .values({
            id: randomUUID(),
            planId: id,
            position: index + 1,
            op: step.op,
            ref: step.ref ?? null,
            params: JSON.stringify(step.params),
            baseline: JSON.stringify(baselineOf(check)),
            check: JSON.stringify(check),
            status: 'pending',
            result: null,
            targets: check?.id ? `${check.entity}:${check.id}` : null,
          })
          .execute();
      }
    });
    return this.get(actor, id);
  }

  // Runs every step in a transaction that is always rolled back: what each
  // would do, or the first one refused.
  async rehearse(actor: Actor, steps: PlanStepInput[]): Promise<StepCheck[]> {
    try {
      await this.service.mutate(
        { ...actor, via: 'assistant' },
        async (prepared, query) => {
          const refs = new Map<string, string>();
          const checks: StepCheck[] = [];
          for (const [index, step] of steps.entries())
            checks.push(
              await this.runStep(prepared, query, step, index + 1, refs).catch(
                (error: unknown) => {
                  throw new StepRefused(index + 1, error);
                },
              ),
            );
          throw new Rehearsed(checks);
        },
      );
    } catch (error) {
      if (error instanceof Rehearsed) return error.checks;
      if (error instanceof StepRefused) throw refusal(error);
      throw error;
    }
    // mutate always throws above.
    throw new CrmError('invalidInput', 400, 'steps');
  }

  async get(actor: Actor, id: string): Promise<PlanView> {
    const plan = await this.load(id);
    // A plan is its proposer's: the person the agent works for decides it.
    if (plan.proposerUserId !== actor.id) throw new CrmError('notFound', 404);
    return plan;
  }

  // The reader's plans, those waiting first; a record's when `target` names
  // it (`leads:<id>`).
  async list(
    actor: Actor,
    options: {
      status?: PlanStatus;
      target?: string;
      conversationId?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<{ data: PlanView[]; total: number }> {
    await this.expireDue();
    let select = this.service.database
      .query()
      .selectFrom('crmPlans')
      .select(['id'])
      .where('proposerUserId', '=', actor.id);
    if (options.status) select = select.where('status', '=', options.status);
    if (options.conversationId)
      select = select.where('conversationId', '=', options.conversationId);
    if (options.target) {
      const planIds = (
        await this.service.database
          .query()
          .selectFrom('crmPlanRows')
          .select('planId')
          .where('targets', '=', options.target)
          .execute()
      ).map((row) => toText(row.planId));
      select = planIds.length
        ? select.where('id', 'in', [...new Set(planIds)])
        : select.where('id', '=', '');
    }
    const ids = await select
      .orderBy('createdAt', 'desc')
      .execute()
      .then((rows) => rows.map((row) => toText(row.id)));
    const plans = await Promise.all(ids.map((id) => this.load(id)));
    // Waiting ones first, then the newest.
    plans.sort(
      (a, b) =>
        Number(b.status === 'pending') - Number(a.status === 'pending') ||
        b.createdAt.localeCompare(a.createdAt),
    );
    const start = (options.page - 1) * options.pageSize;
    return {
      data: plans.slice(start, start + options.pageSize),
      total: plans.length,
    };
  }

  // Carries the plan out as the person deciding, every step kept in one
  // transaction: one refused rolls them all back. A record changed since the
  // plan was made leaves it stale, carried out by no one.
  async execute(
    actor: Actor,
    id: string,
    input: { revision: number; skip?: number[] },
  ): Promise<PlanView> {
    const plan = await this.decidable(actor, id, input.revision);
    const skipped = new Set(input.skip ?? []);
    const steps = plan.steps.filter((step) => !skipped.has(step.position));
    if (!steps.length) throw new CrmError('invalidInput', 400, 'skip');
    const claimed = await this.service.database
      .query()
      .updateTable('crmPlans')
      .set({ status: 'executing', updatedAt: new Date().toISOString() })
      .where('id', '=', id)
      .where('status', '=', 'pending')
      .where('revision', '=', plan.revision)
      .execute();
    if (Number(claimed.updatedCount ?? 0) !== 1)
      throw new CrmError('conflict', 409);
    const stale = await this.staleStep(actor, steps);
    if (stale) return this.close(actor, plan, 'stale', stale);
    const origin: ActorOrigin = {
      kind: 'plan',
      planId: plan.id,
      agentId: plan.agentId,
      agentName: plan.agentName,
      runId: plan.runId,
    };
    try {
      await this.service.mutate(
        { ...actor, via: 'assistant', origin },
        async (prepared, query) => {
          const refs = new Map<string, string>();
          for (const step of plan.steps) {
            if (skipped.has(step.position)) {
              await query
                .updateTable('crmPlanRows')
                .set({ status: 'removed' })
                .where('id', '=', step.id)
                .execute();
              continue;
            }
            const done = await this.runStep(
              prepared,
              query,
              { op: step.op, ref: step.ref ?? undefined, params: step.params },
              step.position,
              refs,
            ).catch((error: unknown) => {
              throw new StepRefused(step.position, error);
            });
            await query
              .updateTable('crmPlanRows')
              .set({
                status: 'done',
                result: JSON.stringify({ entity: done.entity, id: done.id }),
              })
              .where('id', '=', step.id)
              .execute();
          }
          const now = new Date().toISOString();
          await query
            .updateTable('crmPlans')
            .set({
              status: 'executed',
              deciderUserId: actor.id,
              decidedAt: now,
              updatedAt: now,
            })
            .where('id', '=', id)
            .execute();
        },
      );
    } catch (error) {
      if (!(error instanceof StepRefused)) {
        await this.reopen(id);
        throw error;
      }
      return this.close(actor, plan, 'failed', failureOf(error));
    }
    const executed = await this.load(id);
    await this.tell({ plan: executed, decision: 'executed' });
    return executed;
  }

  // The person changes what a waiting step writes before deciding (a value
  // on the card): the values of a record it creates or updates. The whole
  // plan is rehearsed again with them, so a value the step would be refused
  // for is refused now, naming the step, and the plan keeps its revision;
  // otherwise every step's check is the new rehearsal's and the revision
  // moves on, so a card still showing the old plan cannot carry it out.
  async revise(
    actor: Actor,
    id: string,
    input: { revision: number; position: number; values: Row },
  ): Promise<PlanView> {
    const plan = await this.decidable(actor, id, input.revision);
    const target = plan.steps.find((step) => step.position === input.position);
    if (
      !target ||
      (target.op !== 'record.create' && target.op !== 'record.update')
    )
      throw new CrmError('invalidInput', 400, 'position');
    const params = {
      ...target.params,
      values: { ...object(target.params.values), ...input.values },
    };
    const steps: PlanStepInput[] = plan.steps.map((step) => ({
      op: step.op,
      ...(step.ref ? { ref: step.ref } : {}),
      params: step.position === input.position ? params : step.params,
    }));
    const checks = await this.rehearse(actor, steps);
    const now = new Date().toISOString();
    await this.service.database.transaction(async ({ query }) => {
      const moved = await query
        .updateTable('crmPlans')
        .set({ revision: plan.revision + 1, updatedAt: now })
        .where('id', '=', id)
        .where('status', '=', 'pending')
        .where('revision', '=', plan.revision)
        .execute();
      if (Number(moved.updatedCount ?? 0) !== 1)
        throw new CrmError('conflict', 409);
      for (const [index, step] of plan.steps.entries()) {
        const check = checks[index];
        await query
          .updateTable('crmPlanRows')
          .set({
            ...(step.position === input.position
              ? { params: JSON.stringify(params) }
              : {}),
            baseline: JSON.stringify(baselineOf(check)),
            check: JSON.stringify(check),
            targets: check?.id ? `${check.entity}:${check.id}` : null,
          })
          .where('id', '=', step.id)
          .execute();
      }
    });
    return this.get(actor, id);
  }

  async void(actor: Actor, id: string, revision: number): Promise<PlanView> {
    const plan = await this.decidable(actor, id, revision);
    return this.close(actor, plan, 'voided', null);
  }

  // Pending plans a day old expire; read before every list.
  async expireDue(): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.service.database
      .query()
      .updateTable('crmPlans')
      .set({ status: 'expired', updatedAt: now })
      .where('status', '=', 'pending')
      .where('expiresAt', '<', now)
      .execute();
    return Number(result.updatedCount ?? 0);
  }

  private async decidable(
    actor: Actor,
    id: string,
    revision: number,
  ): Promise<PlanView> {
    await this.expireDue();
    const plan = await this.get(actor, id);
    if (plan.status !== 'pending')
      throw new CrmError(
        plan.status === 'expired' ? 'planExpired' : 'planDecided',
        409,
      );
    if (plan.revision !== revision) throw new CrmError('conflict', 409);
    return plan;
  }

  // Ends a plan that did not run (voided, stale, failed) and tells the
  // conversation.
  private async close(
    actor: Actor,
    plan: PlanView,
    status: 'voided' | 'stale' | 'failed',
    failure: Row | null,
  ): Promise<PlanView> {
    const now = new Date().toISOString();
    await this.service.database
      .query()
      .updateTable('crmPlans')
      .set({
        status,
        deciderUserId: actor.id,
        decidedAt: now,
        failure: failure ? JSON.stringify(failure) : null,
        updatedAt: now,
      })
      .where('id', '=', plan.id)
      .execute();
    const closed = await this.load(plan.id);
    await this.tell({ plan: closed, decision: status });
    return closed;
  }

  private async reopen(id: string): Promise<void> {
    await this.service.database
      .query()
      .updateTable('crmPlans')
      .set({ status: 'pending', updatedAt: new Date().toISOString() })
      .where('id', '=', id)
      .where('status', '=', 'executing')
      .execute();
  }

  private async tell(outcome: PlanOutcome): Promise<void> {
    await this.onDecided?.(outcome).catch(() => undefined);
  }

  // The first step whose record changed since the plan was made.
  private async staleStep(
    actor: Actor,
    steps: PlanStepView[],
  ): Promise<Row | null> {
    for (const step of steps) {
      const baseline = step.check ? baselineOf(step.check) : null;
      if (!baseline?.updatedAt) continue;
      const current = await this.service
        .get(actor, baseline.entity, baseline.id)
        .catch(() => null);
      if (!current || iso(current.updatedAt) !== baseline.updatedAt)
        return { position: step.position, code: 'stale' };
    }
    return null;
  }

  private async load(id: string): Promise<PlanView> {
    const query = this.service.database.query();
    const plan = await query
      .selectFrom('crmPlans')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!plan) throw new CrmError('notFound', 404);
    const rows = await query
      .selectFrom('crmPlanRows')
      .selectAll()
      .where('planId', '=', id)
      .orderBy('position', 'asc')
      .execute();
    return {
      id: toText(plan.id),
      title: toText(plan.title),
      summary: plan.summary == null ? null : toText(plan.summary),
      status: toText(plan.status) as PlanStatus,
      revision: Number(plan.revision),
      proposerUserId: toText(plan.proposerUserId),
      agentId: plan.agentId == null ? null : toText(plan.agentId),
      agentName: plan.agentName == null ? null : toText(plan.agentName),
      runId: plan.runId == null ? null : toText(plan.runId),
      conversationId:
        plan.conversationId == null ? null : toText(plan.conversationId),
      deciderUserId:
        plan.deciderUserId == null ? null : toText(plan.deciderUserId),
      decidedAt: iso(plan.decidedAt),
      failure: json(plan.failure),
      expiresAt: iso(plan.expiresAt) ?? '',
      createdAt: iso(plan.createdAt) ?? '',
      steps: rows.map((row) => ({
        id: toText(row.id),
        position: Number(row.position),
        op: toText(row.op) as PlanOp,
        ref: row.ref == null ? null : toText(row.ref),
        params: json(row.params) ?? {},
        check: json(row.check) as StepCheck | null,
        status: toText(row.status) as PlanStepView['status'],
        result: json(row.result),
      })),
    };
  }

  // One step, inside the transaction `query` belongs to, as `actor`; what
  // it does to its record. What the change starts besides (a follow-up, a
  // notification) waits for the commit through the prepared actor.
  private async runStep(
    actor: Actor,
    query: QueryAdapter,
    step: PlanStepInput,
    position: number,
    refs: Map<string, string>,
  ): Promise<StepCheck> {
    const params = resolveRefs(step.params, refs);
    const remember = (id: string) => {
      refs.set(`$${toText(position)}`, id);
      if (step.ref)
        refs.set(step.ref.startsWith('$') ? step.ref : `$${step.ref}`, id);
    };
    const after = (callback: () => Promise<void> | void) =>
      actor.after?.(async () => {
        await callback();
      });
    switch (step.op) {
      case 'record.create': {
        const entity = asEntity(toText(params.entity));
        const values = object(params.values);
        const record = await this.service.save(
          actor,
          entity,
          values,
          undefined,
          query,
        );
        remember(record.id);
        after(() =>
          afterCreate(
            this.service,
            this.workers,
            actor,
            entity,
            record,
            params.followUp !== false,
          ),
        );
        return {
          entity,
          id: null,
          name: toText(record.name),
          changes: Object.entries(values).map(([field, to]) => ({
            field,
            from: null,
            to,
          })),
        };
      }
      case 'record.update': {
        const entity = asEntity(toText(params.entity));
        const id = toText(params.id);
        const values = object(params.values);
        const before = await this.service.get(
          actor,
          entity,
          id,
          query,
          'update',
        );
        const hooked = await beforeUpdate(
          this.service,
          actor,
          entity,
          id,
          query,
        );
        const record = await this.service.save(
          actor,
          entity,
          values,
          id,
          query,
        );
        after(() =>
          afterUpdate(this.service, actor, entity, id, hooked, record),
        );
        return checkOf(entity, before, values);
      }
      case 'lead.convert': {
        const id = toText(params.leadId);
        const before = await this.service.get(actor, 'leads', id, query);
        const lead = await convertLead(
          this.service,
          actor,
          id,
          object(params.conversion),
          query,
        );
        if (lead.convertedOpportunityId && params.followUp !== false)
          after(() =>
            this.service.opportunityOpened?.(
              actor,
              toText(lead.convertedOpportunityId),
            ),
          );
        return checkOf('leads', before, { status: 'converted' });
      }
      case 'comment.create': {
        const entity = asEntity(toText(params.entity));
        const id = toText(params.id);
        const record = await this.service.get(actor, entity, id, query);
        await this.service.addCommentIn(
          actor,
          query,
          entity,
          id,
          params.text,
          params.mentions,
        );
        return {
          entity,
          id,
          name: toText(record.name),
          changes: [{ field: 'comment', from: null, to: params.text }],
        };
      }
      case 'task.recordOutcome': {
        const id = toText(params.taskId);
        const before = await this.service.get(
          actor,
          'tasks',
          id,
          query,
          'update',
        );
        if (before.status !== 'open') throw new CrmError('taskChanged', 409);
        const values: Row = {
          status: 'completed',
          ...(toText(params.outcome ?? '').trim()
            ? { result: toText(params.outcome).trim() }
            : {}),
        };
        const record = await this.service.save(
          actor,
          'tasks',
          values,
          id,
          query,
        );
        if (params.followUp !== false)
          after(() => this.service.taskCompleted?.(actor, record));
        return checkOf('tasks', before, values);
      }
      case 'approval.submit':
      case 'approval.withdraw': {
        const id = toText(params.approvalId);
        const before = await this.service.get(actor, 'approvals', id, query);
        const record = await this.service.approvalAction(
          actor,
          id,
          step.op === 'approval.submit' ? 'submit' : 'withdraw',
          toText(params.comment ?? ''),
          query,
        );
        return checkOf('approvals', before, { status: record.status });
      }
    }
  }
}

// A later step names a record an earlier one created by `$<position>` or
// its ref, wherever an id goes.
function resolveRefs(value: Row, refs: Map<string, string>): Row {
  const walk = (item: unknown): unknown => {
    if (typeof item === 'string' && refs.has(item)) return refs.get(item);
    if (Array.isArray(item)) return item.map(walk);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item).map(([key, inner]) => [key, walk(inner)]),
      );
    return item;
  };
  return walk(value) as Row;
}

// What a change does to an existing record: each field that differs.
function checkOf(entity: Entity, before: Row, values: Row): StepCheck {
  return {
    entity,
    id: toText(before.id),
    name: toText(before.name),
    changes: Object.entries(values)
      .filter(
        ([field, to]) =>
          JSON.stringify(before[field] ?? null) !== JSON.stringify(to ?? null),
      )
      .map(([field, to]) => ({ field, from: before[field] ?? null, to })),
    updatedAt: iso(before.updatedAt),
  };
}

function baselineOf(
  check: StepCheck | undefined,
): { entity: Entity; id: string; updatedAt: string } | null {
  return check?.id && check.updatedAt
    ? { entity: check.entity, id: check.id, updatedAt: check.updatedAt }
    : null;
}

function failureOf(error: StepRefused): Row {
  const cause = error.cause;
  return cause instanceof CrmError
    ? {
        position: error.position,
        code: cause.code,
        ...(cause.field ? { field: cause.field } : {}),
        ...(cause.detail ? { detail: cause.detail } : {}),
      }
    : { position: error.position, code: 'serverError' };
}

// A refused step, as the agent reads it: which step, and the CRM's reason.
function refusal(error: StepRefused): unknown {
  const cause = error.cause;
  if (!(cause instanceof CrmError)) return cause;
  return new CrmError(
    'planStepRefused',
    400,
    `steps.${toText(error.position)}`,
    `${cause.code}${cause.field ? `: ${cause.field}` : ''}`,
  );
}

export const crmPlansToken: ServiceToken<CrmPlans> =
  createServiceToken<CrmPlans>('crm/plans');
