import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// The company's WhatsApp number, through Meta's Cloud API, brought into the
// CRM: the numbers connected, the customers who write to them (known by
// Meta's business-scoped user id, a phone number only when Meta gives one),
// each customer's conversation with a number, its messages, and every
// webhook delivery kept as it arrived until it is processed, so none is
// lost (server/providers/crm/whatsapp/).
const migration: MigrationDefinition = defineMigration({
  name: '202610150004_crm_whatsapp',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.createCollection('crmWaNumbers', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('phoneNumberId', { length: 64, nullable: false });
      c.unique(['phoneNumberId'], { name: 'crm_wa_numbers_phone_number' });
      c.string('wabaId', { length: 64 });
      c.string('displayPhone', { length: 64 });
      c.string('displayName');
      // api: a number on the API alone; coexistence: one also on the
      // WhatsApp Business App (not yet supported).
      c.string('mode', { length: 16, nullable: false });
      c.string('status', { length: 32 });
      c.string('qualityRating', { length: 16 });
      c.string('messagingLimit', { length: 32 });
      c.string('defaultHandlerId', { length: 64 });
      // The system user's access token, sealed by the secrets service.
      c.text('accessToken');
      c.datetimeTz('connectedAt');
      c.datetimeTz('lastWebhookAt');
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });
    await builder.createCollection('crmWaContacts', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('waId', { length: 32 });
      c.index(['waId'], { name: 'crm_wa_contacts_wa_id' });
      c.string('phone', { length: 64 });
      c.index(['phone'], { name: 'crm_wa_contacts_phone' });
      c.string('username');
      c.string('profileName');
      c.string('leadId', { length: 36 });
      c.index(['leadId'], { name: 'crm_wa_contacts_lead' });
      c.string('contactId', { length: 36 });
      c.index(['contactId'], { name: 'crm_wa_contacts_contact' });
      // phone, manual or created: how it came to be linked.
      c.string('matchedBy', { length: 16 });
      // unlinked, linked, dismissed or spam.
      c.string('state', { length: 16, nullable: false });
      // unknown, granted or revoked, for marketing templates.
      c.string('marketingConsent', { length: 16, nullable: false });
      c.datetimeTz('consentChangedAt');
      c.string('consentChangedById', { length: 64 });
      c.string('consentSource', { length: 16 });
      c.datetimeTz('firstSeenAt', { nullable: false });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });
    // Every business-scoped user id a customer has had: Meta issues a new
    // one when they change their number, kept beside the old.
    await builder.createCollection('crmWaIdentities', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('userId', { length: 128, nullable: false });
      c.unique(['userId'], { name: 'crm_wa_identities_user' });
      c.string('waContactId', { length: 36, nullable: false });
      c.index(['waContactId'], { name: 'crm_wa_identities_contact' });
      c.string('parentUserId', { length: 128 });
      c.datetimeTz('firstSeenAt', { nullable: false });
      c.datetimeTz('replacedAt');
    });
    await builder.createCollection('crmWaConversations', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('numberId', { length: 36, nullable: false });
      c.string('waContactId', { length: 36, nullable: false });
      c.unique(['numberId', 'waContactId'], {
        name: 'crm_wa_conversations_pair',
      });
      c.string('handlerId', { length: 64 });
      c.index(['handlerId'], { name: 'crm_wa_conversations_handler' });
      // The customer's last message, from which the 24-hour window counts.
      c.datetimeTz('lastInboundAt');
      c.datetimeTz('lastMessageAt');
      c.index(['lastMessageAt'], { name: 'crm_wa_conversations_last' });
      c.string('lastDirection', { length: 8 });
      c.integer('unreadCount').notNull().defaultTo(0);
      // When the customer's latest messages have been quiet long enough to
      // start a follow-up; null once started or when none is due.
      c.datetimeTz('followUpDueAt');
      c.index(['followUpDueAt'], { name: 'crm_wa_conversations_follow_up' });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });
    await builder.createCollection('crmWaMessages', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('waMessageId', { length: 128, nullable: false });
      c.unique(['waMessageId'], { name: 'crm_wa_messages_wa_id' });
      c.string('conversationId', { length: 36, nullable: false });
      c.index(['conversationId', 'occurredAt'], {
        name: 'crm_wa_messages_conversation',
      });
      c.string('numberId', { length: 36, nullable: false });
      // in or out.
      c.string('direction', { length: 8, nullable: false });
      // customer, crm, businessApp (coexistence) or imported (coexistence).
      c.string('origin', { length: 16, nullable: false });
      c.string('type', { length: 32, nullable: false });
      c.text('text');
      c.text('caption');
      c.string('mediaId', { length: 128 });
      c.string('mediaMime', { length: 128 });
      c.string('mediaSha256', { length: 128 });
      c.string('mediaFilename');
      c.string('mediaFileId', { length: 36 });
      // pending, stored or unavailable.
      c.string('mediaStatus', { length: 16 });
      c.index(['mediaStatus'], { name: 'crm_wa_messages_media' });
      c.integer('mediaAttempts').notNull().defaultTo(0);
      c.string('templateId', { length: 36 });
      c.json('templateParams');
      c.string('replyTo', { length: 128 });
      // sent, delivered, read or failed, for a message the team sent.
      c.string('status', { length: 16 });
      c.string('errorCode', { length: 32 });
      c.string('pricingCategory', { length: 32 });
      c.boolean('billable');
      c.datetimeTz('editedAt');
      c.datetimeTz('revokedAt');
      c.json('translation');
      c.string('sentById', { length: 64 });
      c.datetimeTz('occurredAt', { nullable: false });
      c.datetimeTz('createdAt', { nullable: false });
    });
    // Each webhook delivery as Meta sent it, answered at once and processed
    // after, retried until it succeeds or is reported.
    await builder.createCollection('crmWaInbox', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.text('body').notNull();
      c.datetimeTz('receivedAt', { nullable: false });
      // pending, processed or failed.
      c.string('status', { length: 16, nullable: false });
      c.index(['status', 'receivedAt'], { name: 'crm_wa_inbox_status' });
      c.integer('attempts').notNull().defaultTo(0);
      c.string('error');
      c.datetimeTz('processedAt');
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    for (const table of [
      'crmWaInbox',
      'crmWaMessages',
      'crmWaConversations',
      'crmWaIdentities',
      'crmWaContacts',
      'crmWaNumbers',
    ])
      await builder.dropCollection(table);
  },
});

export default migration;
