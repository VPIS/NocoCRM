import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Plans: changes an agent proposes to records, which the person who woke it
// confirms or voids on a decision card, and which the CRM then carries out
// as that person, every step in one transaction (server/providers/crm/plans).
// Named and shaped after the projects plugin's plans, so the CRM can move to
// a shared plan engine once there is one.
const migration: MigrationDefinition = defineMigration({
  name: '202610100006_crm_plans',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.createCollection('crmPlans', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('title', { nullable: false });
      c.text('summary');
      // pending, executing, executed, failed, stale, voided, expired.
      c.string('status', { nullable: false });
      c.index('status');
      c.integer('revision', { nullable: false });
      // The person who woke the agent, who decides and as whom the plan runs.
      c.string('proposerUserId', { length: 64, nullable: false });
      c.index('proposerUserId');
      c.string('agentId', { length: 64 });
      c.string('agentName');
      c.string('runId', { length: 64 });
      c.string('conversationId', { length: 64 });
      c.index('conversationId');
      c.string('deciderUserId', { length: 64 });
      c.datetimeTz('decidedAt');
      // Which step failed and why, for a failed or stale plan.
      c.json('failure');
      c.datetimeTz('expiresAt', { nullable: false });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });
    await builder.createCollection('crmPlanRows', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('planId', { length: 36, nullable: false });
      c.index('planId');
      c.integer('position', { nullable: false });
      c.string('op', { nullable: false });
      // How a later step names the record this one creates (`$1`).
      c.string('ref');
      c.json('params', { nullable: false });
      // The record the step changes as it stood when the plan was made: its
      // kind, id and `updatedAt`, to tell whether someone changed it since.
      c.json('baseline');
      // What the rehearsal found: the record's name and each field from → to.
      c.json('check');
      // pending, done, failed, removed.
      c.string('status', { nullable: false });
      // What carrying it out produced: the record's kind and id, or the error.
      c.json('result');
      // Records the step concerns, comma-separated `kind:id`, so a record's
      // page finds the plans waiting on it.
      c.text('targets');
    });
    // Beside a change in the history, where it came from when it was not
    // the person's own doing: the plan, agent and run of a confirmed plan.
    await builder.alterCollection('crmHistory', (c) => {
      c.json('origin');
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmHistory', (c) => {
      c.dropField('origin');
    });
    await builder.dropCollection('crmPlanRows');
    await builder.dropCollection('crmPlans');
  },
});

export default migration;
