import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// The company signals' checks (server/providers/crm/company-signals.ts),
// one row each, as the Auto follow-up page lists them: which company, what
// started it (the daily check, or someone asking), whether it found new
// signals, found nothing or failed and why, how many it found and how many
// deal follow-ups they started.
const migration: MigrationDefinition = defineMigration({
  name: '202610150001_crm_signal_checks',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.createCollection('crmSignalChecks', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('companyId', { length: 36, nullable: false });
      // daily or asked.
      c.string('trigger', { length: 20, nullable: false });
      // Who asked; null for the daily check.
      c.string('actorId', { length: 64 });
      // found, nothing or failed.
      c.string('status', { length: 20, nullable: false });
      c.integer('found', { nullable: false });
      c.integer('followUps', { nullable: false });
      c.text('error');
      c.datetimeTz('createdAt', { nullable: false });
      c.index(['createdAt'], { name: 'crm_signal_checks_created' });
      c.index(['companyId'], { name: 'crm_signal_checks_company' });
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.dropCollection('crmSignalChecks');
  },
});

export default migration;
