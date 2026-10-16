import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// The AI work a conversation's agent asked for (a follow-up, a review, a
// task's preparation) and is waiting on: when the run behind the entry
// finishes, what it came to goes back to that conversation
// (server/providers/crm/ai-watches.ts), and the row is removed.
const migration: MigrationDefinition = defineMigration({
  name: '202610160001_crm_ai_watches',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.createCollection('crmAiWatches', (c) => {
      // The AI entry's id in crmHistory.
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      // leads, opportunities, approvals or tasks, and the record's id.
      c.string('entity', { nullable: false });
      c.string('recordId', { length: 36, nullable: false });
      // The person the agent works for, and their conversation.
      c.string('userId', { length: 64, nullable: false });
      c.string('conversationId', { length: 64, nullable: false });
      c.datetimeTz('createdAt', { nullable: false });
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.dropCollection('crmAiWatches');
  },
});

export default migration;
