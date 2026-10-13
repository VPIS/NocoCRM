import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Approvals move through their states by a record lifecycle of
// `@nocobase/lifecycle` (server/lifecycles/approvals.ts): the approval keeps
// its state in `status` as before, and gains what the runtime keeps beside
// it, when the state last changed and a version every transition moves on,
// so two decisions on one approval cannot both commit. The two tables are
// the runtime's own log, shared by every lifecycle the application will
// have: each transition, and each effect a transition owes. Spelled out
// here rather than taken from the library, since a migration stays what it
// was when it was released.
const migration: MigrationDefinition = defineMigration({
  name: '202610130001_crm_approval_lifecycle',
  async up({ builder, query }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmApprovals', (c) => {
      c.datetimeTz('statusChangedAt').nullable();
      c.integer('lifecycleVersion').notNull().defaultTo(0);
      c.index(['status', 'statusChangedAt'], {
        name: 'crm_approvals_status_changed',
      });
    });
    // When each approval entered the state it is in: decided, submitted, or
    // last saved as a draft. The query builder has no column-to-column
    // update, so each row is read and written back.
    const rows = await query
      .selectFrom('crmApprovals')
      .select(['id', 'decidedAt', 'submittedAt', 'updatedAt', 'status'])
      .execute();
    for (const row of rows) {
      const at =
        row.status === 'approved' || row.status === 'rejected'
          ? (row.decidedAt ?? row.updatedAt)
          : row.status === 'pending'
            ? (row.submittedAt ?? row.updatedAt)
            : row.updatedAt;
      await query
        .updateTable('crmApprovals')
        .set({ statusChangedAt: at })
        .where('id', '=', row.id)
        .execute();
    }

    await builder.createCollection('lifecycleTransitions', (c) => {
      c.bigInt('id').primary().autoIncrement().notNull();
      c.string('lifecycle').notNull();
      c.string('recordId').notNull();
      c.string('transition').notNull();
      // Null on the entry a record's creation writes.
      c.string('from');
      c.string('to').notNull();
      c.string('actorId').notNull();
      c.json('input').notNull().defaultTo({});
      c.datetimeTz('at').notNull();
      c.integer('version').notNull();
      // The caller's request id, as it sent it; null when it sent none.
      c.string('requestId');
      // What a repeated request is found by: the request id, or a key
      // derived from the version for an entry without one; never null, so
      // one plain unique index means the same on every dialect.
      c.string('requestKey').notNull();
      c.index(['lifecycle', 'recordId', 'id'], {
        name: 'lifecycle_transitions_record',
      });
      c.unique(['lifecycle', 'recordId', 'version'], {
        name: 'lifecycle_transitions_version',
      });
      c.unique(['lifecycle', 'recordId', 'requestKey'], {
        name: 'lifecycle_transitions_request',
      });
    });

    await builder.createCollection('lifecycleEffectRuns', (c) => {
      c.bigInt('id').primary().autoIncrement().notNull();
      c.bigInt('transitionId').notNull();
      c.string('lifecycle').notNull();
      c.string('recordId').notNull();
      c.string('effect').notNull();
      c.boolean('stayBound').notNull();
      c.string('status').notNull();
      c.integer('attempts').notNull().defaultTo(0);
      c.integer('maxAttempts').notNull().defaultTo(1);
      c.json('result');
      c.text('error');
      c.datetimeTz('createdAt').notNull();
      c.datetimeTz('updatedAt').notNull();
      c.datetimeTz('claimedAt');
      c.datetimeTz('runAfter');
      // A continuation the outcome still has to fire; null when none waits.
      c.json('continuation');
      // When the sweep may try that continuation next: null exactly when
      // none waits.
      c.datetimeTz('continuationDueAt');
      // When the sweep gave up on it: null unless it did.
      c.datetimeTz('continuationAbandonedAt');
      c.index(['status', 'id'], { name: 'lifecycle_effect_runs_status' });
      c.index(['lifecycle', 'recordId', 'id'], {
        name: 'lifecycle_effect_runs_record',
      });
      c.index(['continuationDueAt'], {
        name: 'lifecycle_effect_runs_continuation_due',
      });
      c.index(['continuationAbandonedAt'], {
        name: 'lifecycle_effect_runs_continuation_abandoned',
      });
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.dropCollection('lifecycleEffectRuns');
    await builder.dropCollection('lifecycleTransitions');
    await builder.alterCollection('crmApprovals', (c) => {
      c.dropIndex('crm_approvals_status_changed');
    });
    await builder.alterCollection('crmApprovals', (c) => {
      c.dropField('lifecycleVersion');
      c.dropField('statusChangedAt');
    });
  },
});

export default migration;
