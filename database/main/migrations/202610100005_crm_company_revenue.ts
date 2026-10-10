import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A company's annual revenue: an amount and its currency, as an
// opportunity's amount is kept (a decimal of 18 digits, 2 after the point,
// and a three-letter currency code). Both optional.
const migration: MigrationDefinition = defineMigration({
  name: '202610100005_crm_company_revenue',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmCompanies', (c) => {
      c.decimal('annualRevenue', { precision: 18, scale: 2 }).nullable();
      c.string('currency', { length: 3 }).nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmCompanies', (c) => {
      c.dropField('currency');
    });
    await builder.alterCollection('crmCompanies', (c) => {
      c.dropField('annualRevenue');
    });
  },
});

export default migration;
