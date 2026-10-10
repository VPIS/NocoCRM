import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Who caused each queued notification (a user's id; none for the system's
// own, such as a task reminder), so the inbox can say who did it. Rows
// queued before have none.
const migration: MigrationDefinition = defineMigration({
  name: '202610100008_crm_outbox_actor',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmOutbox', (c) => {
      c.string('actorId', { length: 64 }).nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmOutbox', (c) => {
      c.dropField('actorId');
    });
  },
});

export default migration;
