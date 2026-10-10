import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A note on a record's timeline may be a reply to another note of the same
// record (`replyToId`, the note it answers; one level, a reply to a reply
// answering the same note). A reply is read with its note rather than as
// an entry of its own.
const migration: MigrationDefinition = defineMigration({
  name: '202610100002_crm_history_reply_to',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmHistory', (c) => {
      c.string('replyToId', { length: 36 }).nullable();
      c.index(['replyToId'], { name: 'crm_history_reply_to' });
    });
  },
  async down({ builder, query }: MigrationContext): Promise<void> {
    // The replies go with the column that made them replies.
    await query
      .deleteFrom('crmHistory')
      .where('replyToId', 'is not', null)
      .execute();
    await builder.alterCollection('crmHistory', (c) => {
      c.dropIndex('crm_history_reply_to');
    });
    await builder.alterCollection('crmHistory', (c) => {
      c.dropField('replyToId');
    });
  },
});

export default migration;
