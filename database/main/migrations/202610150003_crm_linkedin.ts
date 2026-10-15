import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A LinkedIn address on a lead and a contact (the person's profile) and on a
// company (its page), kept as typed and opened from the record. Optional
// everywhere: nothing is fetched from LinkedIn.
const TABLES = ['crmLeads', 'crmContacts', 'crmCompanies'] as const;

const migration: MigrationDefinition = defineMigration({
  name: '202610150003_crm_linkedin',
  async up({ builder }: MigrationContext): Promise<void> {
    for (const table of TABLES)
      await builder.alterCollection(table, (c) => {
        c.string('linkedin').nullable();
      });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    for (const table of TABLES)
      await builder.alterCollection(table, (c) => {
        c.dropField('linkedin');
      });
  },
});

export default migration;
