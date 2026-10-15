import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Company signals (server/providers/crm/company-signals.ts): what the AI
// found on the web that happened to a customer's company (a funding round,
// hiring, a new executive, a launch, a risk), each with the pages that said
// so. A signal belongs to its company, changes none of its fields, and is
// new until someone with the company marks it seen or dismisses it; a
// dismissed event is not proposed again (its key stays). A company is
// watched by the daily check when it has an open deal or when someone
// switched `signalsWatched` on, and is looked at again only a week after
// `signalsCheckedAt`.
const migration: MigrationDefinition = defineMigration({
  name: '202610140002_crm_company_signals',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.createCollection('crmSignals', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('companyId', { length: 36, nullable: false });
      // funding, hiring, leadership, business or risk.
      c.string('type', { length: 20, nullable: false });
      c.string('title', { length: 500, nullable: false });
      c.text('summary');
      // The day the event happened, as the pages date it (YYYY-MM-DD).
      c.string('occurredOn', { length: 10, nullable: false });
      // The pages the search read that state it: [{ title, url, site }].
      c.json('sources', { nullable: false });
      // The same event found again, however worded, is this signal.
      c.string('eventKey', { length: 200, nullable: false });
      // new, seen or dismissed.
      c.string('status', { length: 20, nullable: false });
      // The company's history entry of the check that found it.
      c.string('runId', { length: 36 });
      c.string('decidedById', { length: 64 });
      c.datetimeTz('decidedAt');
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
      c.index(['companyId', 'createdAt'], { name: 'crm_signals_company' });
      c.unique(['companyId', 'eventKey'], { name: 'crm_signals_event' });
    });
    await builder.alterCollection('crmCompanies', (c) => {
      c.boolean('signalsWatched').notNull().defaultTo(false);
      c.datetimeTz('signalsCheckedAt').nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmCompanies', (c) => {
      c.dropField('signalsCheckedAt');
      c.dropField('signalsWatched');
    });
    await builder.dropCollection('crmSignals');
  },
});

export default migration;
