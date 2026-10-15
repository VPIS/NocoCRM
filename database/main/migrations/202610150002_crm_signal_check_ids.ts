import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Each company signal names the check that found it
// (server/providers/crm/company-signals.ts), so the Auto follow-up page
// says what a check found; null for a signal from before the checks were
// kept, and for the demo's.
const migration: MigrationDefinition = defineMigration({
  name: '202610150002_crm_signal_check_ids',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmSignals', (c) => {
      c.string('checkId', { length: 36 }).nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmSignals', (c) => {
      c.dropField('checkId');
    });
  },
});

export default migration;
