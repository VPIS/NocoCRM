import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A lead's company's annual revenue, kept as a company's is (a decimal of 18
// digits, 2 after the point, and a three-letter currency code) and carried
// to the company a conversion creates. Both optional.
const migration: MigrationDefinition = defineMigration({
  name: '202610100007_crm_lead_revenue',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (c) => {
      c.decimal('annualRevenue', { precision: 18, scale: 2 }).nullable();
      c.string('currency', { length: 3 }).nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (c) => {
      c.dropField('currency');
    });
    await builder.alterCollection('crmLeads', (c) => {
      c.dropField('annualRevenue');
    });
  },
});

export default migration;
