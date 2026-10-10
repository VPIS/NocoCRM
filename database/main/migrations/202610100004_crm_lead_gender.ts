import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A lead's person has a gender, as a contact does (male, female or
// unknown), carried to the contact a conversion creates. Optional on a
// lead: one captured from a message rarely says.
const migration: MigrationDefinition = defineMigration({
  name: '202610100004_crm_lead_gender',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (c) => {
      c.string('gender', { length: 32 }).nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (c) => {
      c.dropField('gender');
    });
  },
});

export default migration;
