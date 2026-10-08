import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Activities become tasks: what someone means to do, with no type, an
// optional due time (a date alone, or a time), optional participants and an
// optional record. What took place is a note or, for mail, the record's
// timeline. The activities are dropped rather than carried over (the data
// was agreed to be started again), with the feed entries and the queued
// notifications that referred to them.
const migration: MigrationDefinition = defineMigration({
  name: '202610080001_crm_tasks',
  async up({ builder, query }: MigrationContext): Promise<void> {
    await query
      .deleteFrom('crmHistory')
      .where('entity', '=', 'activities')
      .execute();
    await query
      .deleteFrom('crmOutbox')
      .where('entity', '=', 'activities')
      .execute();
    await builder.dropCollection('crmActivities');
    await builder.createCollection('crmTasks', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('name', { nullable: false });
      c.string('ownerId', { length: 64, nullable: false });
      c.index('ownerId');
      c.string('createdById', { length: 64, nullable: false });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
      c.string('status', { nullable: false });
      c.datetimeTz('dueAt');
      c.index('dueAt');
      c.datetimeTz('completedAt');
      c.text('description');
      c.text('result');
      c.json('attachments');
      c.json('internalParticipants');
      c.string('leadId', { length: 36 });
      c.index('leadId');
      c.string('accountId', { length: 36 });
      c.index('accountId');
      c.string('opportunityId', { length: 36 });
      c.index('opportunityId');
    });
  },
  async down({ builder, query }: MigrationContext): Promise<void> {
    await query
      .deleteFrom('crmHistory')
      .where('entity', '=', 'tasks')
      .execute();
    await query.deleteFrom('crmOutbox').where('entity', '=', 'tasks').execute();
    await builder.dropCollection('crmTasks');
    // As 202609090001 created it, with 202609150001's zoned instants and
    // 202610020002's optional end.
    await builder.createCollection('crmActivities', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('name', { nullable: false });
      c.string('ownerId', { length: 64, nullable: false });
      c.index('ownerId');
      c.string('createdById', { length: 64, nullable: false });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
      c.string('type', { nullable: false });
      c.string('status', { nullable: false });
      c.datetimeTz('startAt', { nullable: false });
      c.datetimeTz('endAt');
      c.index('startAt');
      c.datetimeTz('completedAt');
      c.text('description');
      c.text('feedback');
      c.json('attachments');
      c.json('internalParticipants');
      c.json('externalParticipants');
      c.string('leadId', { length: 36 });
      c.index('leadId');
      c.string('accountId', { length: 36 });
      c.index('accountId');
      c.string('opportunityId', { length: 36 });
      c.index('opportunityId');
    });
  },
});

export default migration;
