import { randomUUID } from 'node:crypto';
import type { QueryAdapter, Row } from '@nocobase/db';

import type { DemoContent } from './demo-content/index.js';
import { normalizePhone } from './phone.js';
import { toText } from './schema.js';
import type { WhatsAppService } from './whatsapp/service.js';

// The demo's WhatsApp number and its conversations, written as the webhook
// would have kept them, so the WhatsApp page, the records' WhatsApp tabs and
// their timelines show the channel at work with no connection to Meta. The
// number is marked 'demo': it receives nothing, the connection settings
// never touch it, and removal deletes it with everything on it.

// What removal deletes; recorded before anything is written, so a failed
// import takes back what it wrote too.
export interface DemoWhatsAppManifest {
  numberId: string;
  customerIds: string[];
}

// Who a conversation is with: a demo contact (by company and person), a
// demo lead, one of the importer's H World people, or a customer nobody
// linked, by their number when WhatsApp gives one.
type Customer =
  | { contact: [number, number] }
  | { lead: number }
  | { hworld: number }
  | { phone?: string; state: 'unlinked' | 'dismissed' };

// Each message: who wrote it, then its day and time of day; the texts are
// the content's (demo-content/whatsapp-*.ts), by index.
type Message = ['in' | 'out', number, number, number];

// How many of the customer's last messages nobody has read yet.
export const demoWhatsAppSchedule: {
  customer: Customer;
  unread: number;
  messages: Message[];
}[] = [
  {
    customer: { contact: [0, 0] },
    unread: 2,
    messages: [
      ['in', -3, 14, 20],
      ['out', -3, 14, 45],
      ['in', -3, 15, 2],
      ['in', -1, 17, 40],
      ['in', -1, 17, 41],
    ],
  },
  {
    customer: { contact: [2, 0] },
    unread: 0,
    messages: [
      ['in', -4, 10, 5],
      ['out', -4, 10, 30],
      ['out', -2, 11, 15],
      ['in', -2, 11, 40],
      ['out', -1, 16, 20],
    ],
  },
  {
    customer: { lead: 5 },
    unread: 1,
    messages: [
      ['in', -2, 20, 10],
      ['out', -1, 9, 5],
      ['in', -1, 9, 30],
    ],
  },
  {
    customer: { hworld: 0 },
    unread: 2,
    messages: [
      ['in', -5, 18, 30],
      ['out', -5, 18, 45],
      ['in', -1, 21, 5],
      ['in', -1, 21, 6],
    ],
  },
  {
    customer: { state: 'unlinked' },
    unread: 2,
    messages: [
      ['in', -1, 11, 20],
      ['in', -1, 11, 21],
    ],
  },
  {
    customer: { phone: '+971 50 555 0142', state: 'unlinked' },
    unread: 1,
    messages: [
      ['in', -2, 16, 0],
      ['out', -2, 16, 30],
      ['in', -1, 10, 15],
    ],
  },
  {
    customer: { phone: '+86 139 0555 0188', state: 'dismissed' },
    unread: 0,
    messages: [
      ['in', -6, 13, 0],
      ['out', -6, 13, 20],
    ],
  },
];

export async function populateDemoWhatsApp(
  query: QueryAdapter,
  whatsapp: WhatsAppService,
  input: {
    text: DemoContent['whatsapp'];
    at: (day: number, hour: number, minute: number) => string;
    // Who answers the customers nobody linked: the importer.
    receptionistId: string;
    contacts: Row[][];
    leads: Row[];
    hworldPeople: Row[];
  },
  // Called with what removal deletes before any of it is written.
  record: (manifest: DemoWhatsAppManifest) => void,
): Promise<void> {
  const now = new Date().toISOString();
  const manifest: DemoWhatsAppManifest = {
    numberId: randomUUID(),
    customerIds: [],
  };
  record(manifest);
  await query
    .insertInto('crmWaNumbers')
    .values({
      id: manifest.numberId,
      phoneNumberId: `demo-${manifest.numberId}`,
      displayPhone: '+1 555 010 0199',
      displayName: input.text.displayName,
      mode: 'demo',
      status: 'CONNECTED',
      qualityRating: 'GREEN',
      defaultHandlerId: input.receptionistId,
      connectedAt: input.at(-30, 9, 0),
      createdAt: now,
      updatedAt: now,
    })
    .execute();
  for (const [
    index,
    { customer, unread, messages },
  ] of demoWhatsAppSchedule.entries()) {
    const content = input.text.conversations[index];
    const linked: Row | undefined =
      'contact' in customer
        ? input.contacts[customer.contact[0]][customer.contact[1]]
        : 'lead' in customer
          ? input.leads[customer.lead]
          : 'hworld' in customer
            ? input.hworldPeople[customer.hworld]
            : undefined;
    const phoneOf = linked
      ? linked.phone
        ? `+86 ${toText(linked.phone)}`
        : undefined
      : 'phone' in customer
        ? customer.phone
        : undefined;
    const phone = phoneOf ? normalizePhone(phoneOf) : null;
    const times = messages.map(([, day, hour, minute]) =>
      input.at(day, hour, minute),
    );
    const id = randomUUID();
    manifest.customerIds.push(id);
    await query
      .insertInto('crmWaContacts')
      .values({
        id,
        waId: phone ? phone.replace(/\D/g, '') : null,
        phone,
        username: content.username ?? null,
        profileName: linked
          ? toText(linked.name)
          : (content.profileName ?? null),
        leadId: 'lead' in customer ? toText(linked?.id) : null,
        contactId: linked && !('lead' in customer) ? toText(linked.id) : null,
        matchedBy: linked ? 'phone' : null,
        state: 'state' in customer ? customer.state : 'linked',
        marketingConsent: 'unknown',
        firstSeenAt: times[0],
        createdAt: times[0],
        updatedAt: now,
      })
      .execute();
    // Linked, the record's owner answers; otherwise the receptionist.
    const handlerId = linked ? toText(linked.ownerId) : input.receptionistId;
    const conversationId = randomUUID();
    const inbound = messages
      .map(([direction], i) => (direction === 'in' ? times[i] : ''))
      .filter(Boolean);
    await query
      .insertInto('crmWaConversations')
      .values({
        id: conversationId,
        numberId: manifest.numberId,
        waContactId: id,
        handlerId,
        lastInboundAt: inbound.at(-1) ?? null,
        lastMessageAt: times.at(-1),
        lastDirection: messages.at(-1)?.[0],
        unreadCount: unread,
        createdAt: times[0],
        updatedAt: now,
      })
      .execute();
    for (const [i, [direction]] of messages.entries())
      await query
        .insertInto('crmWaMessages')
        .values({
          id: randomUUID(),
          waMessageId: `demo-${randomUUID()}`,
          conversationId,
          numberId: manifest.numberId,
          direction,
          // The team's replies as made in the WhatsApp Business app on the
          // number's phone: the CRM receives and does not send yet.
          origin: direction === 'in' ? 'customer' : 'businessApp',
          type: 'text',
          text: content.messages[i],
          mediaAttempts: 0,
          occurredAt: times[i],
          createdAt: times[i],
        })
        .execute();
    // A line a day on the records the customer reaches, as the webhook
    // writes them.
    if (linked)
      await whatsapp.rewriteTimeline(query, {
        id,
        state: 'linked',
        profileName: toText(linked.name),
        leadId: 'lead' in customer ? toText(linked.id) : null,
        contactId: 'lead' in customer ? null : toText(linked.id),
      });
  }
}

// Deletes the demo number with its conversations, messages and customers;
// the records' WhatsApp lines go with the records (demo.ts).
export async function removeDemoWhatsApp(
  query: QueryAdapter,
  manifest: DemoWhatsAppManifest,
): Promise<void> {
  await query
    .deleteFrom('crmWaMessages')
    .where('numberId', '=', manifest.numberId)
    .execute();
  await query
    .deleteFrom('crmWaConversations')
    .where('numberId', '=', manifest.numberId)
    .execute();
  if (manifest.customerIds.length) {
    // Their lines on records the demo did not create, should someone have
    // linked one of them to such a record.
    for (const id of manifest.customerIds)
      await query
        .deleteFrom('crmHistory')
        .where('action', '=', 'whatsapp')
        .where('sourceKey', 'like', `${id}:%`)
        .execute();
    await query
      .deleteFrom('crmWaIdentities')
      .where('waContactId', 'in', manifest.customerIds)
      .execute();
    await query
      .deleteFrom('crmWaContacts')
      .where('id', 'in', manifest.customerIds)
      .execute();
  }
  await query
    .deleteFrom('crmWaNumbers')
    .where('id', '=', manifest.numberId)
    .execute();
}
