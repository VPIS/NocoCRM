import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A record's timeline also carries what the system brings in from another
// source: first a mail conversation with the record's people (action
// `mail`), later a meeting or a call. Such an entry is kept up to date
// rather than added again, so it names its source (`sourceKey`, a mail
// account and conversation), and it says when its latest exchange took place
// (`occurredAt`), which the daily checks read as the record's last contact.
const migration: MigrationDefinition = defineMigration({
  name: '202610080002_crm_history_sources',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmHistory', (c) => {
      c.string('sourceKey', { length: 255 }).nullable();
      c.datetimeTz('occurredAt').nullable();
      c.index(['sourceKey'], { name: 'crm_history_source_key' });
    });
  },
  async down({ builder, query }: MigrationContext): Promise<void> {
    await query.deleteFrom('crmHistory').where('action', '=', 'mail').execute();
    await builder.alterCollection('crmHistory', (c) => {
      c.dropIndex('crm_history_source_key');
    });
    await builder.alterCollection('crmHistory', (c) => {
      c.dropField('occurredAt');
      c.dropField('sourceKey');
    });
  },
});

export default migration;
