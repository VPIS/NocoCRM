import { randomUUID } from 'node:crypto';
import type { QueryAdapter, Row } from '@nocobase/db';

import type { DemoContent } from './demo-content/index.js';
import { normalizePhone } from './phone.js';
import { toText } from './schema.js';
import type { WhatsAppService } from './whatsapp/service.js';

// The demo's WhatsApp numbers and their conversations, written as the
// webhook would have kept them, so the WhatsApp page, the records' WhatsApp
// tabs and their timelines show the channel at work with no connection to
// Meta. The numbers are marked 'demo': they receive nothing, the connection
// settings never touch them, and removal deletes them with everything on
// them.

// What removal deletes; recorded before anything is written, so a failed
// import takes back what it wrote too.
export interface DemoWhatsAppManifest {
  numberIds: string[];
  // The one number of a demo imported before there were two.
  numberId?: string;
  customerIds: string[];
}

// The demo's numbers: the sales line at home, and the line abroad. Their
// business names are the content's (displayNames), in this order.
const demoNumbers = ['+1 555 010 0199', '+44 7700 900123'];

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

// Each conversation: who it is with, the number it came in on
// (demoNumbers), and its messages. One awaits a reply when the customer wrote last:
// as many as they wrote since the team's last reply.
export const demoWhatsAppSchedule: {
  customer: Customer;
  number: number;
  messages: Message[];
}[] = [
  {
    customer: { contact: [0, 0] },
    number: 0,
    messages: [
      ['in', -42, 16, 10],
      ['out', -42, 16, 25],
      ['in', -42, 16, 40],
      ['in', -42, 16, 41],
      ['out', -42, 17, 5],
      ['out', -42, 17, 6],
      ['in', -42, 17, 30],
      ['out', -42, 17, 32],
      ['in', -37, 11, 50],
      ['in', -37, 11, 52],
      ['out', -37, 13, 15],
      ['out', -37, 16, 40],
      ['in', -36, 9, 20],
      ['in', -33, 18, 5],
      ['out', -33, 18, 30],
      ['in', -33, 18, 42],
      ['in', -30, 10, 15],
      ['out', -30, 10, 40],
      ['in', -30, 10, 52],
      ['out', -30, 11, 5],
      ['in', -30, 11, 20],
      ['out', -30, 15, 30],
      ['in', -27, 14, 0],
      ['out', -27, 14, 20],
      ['in', -27, 14, 35],
      ['out', -26, 17, 10],
      ['in', -26, 17, 45],
      ['in', -22, 9, 30],
      ['out', -22, 9, 45],
      ['in', -22, 10, 2],
      ['out', -22, 10, 5],
      ['in', -20, 15, 15],
      ['out', -20, 15, 50],
      ['in', -20, 16, 5],
      ['in', -16, 11, 30],
      ['out', -16, 12, 10],
      ['in', -16, 12, 25],
      ['out', -16, 12, 40],
      ['in', -16, 12, 41],
      ['in', -12, 19, 20],
      ['in', -12, 19, 21],
      ['out', -12, 19, 35],
      ['out', -10, 16, 0],
      ['in', -10, 17, 30],
      ['out', -10, 17, 50],
      ['in', -10, 18, 5],
      ['in', -6, 10, 40],
      ['out', -6, 11, 0],
      ['in', -6, 11, 12],
      ['out', -4, 15, 20],
      ['in', -3, 14, 20],
      ['out', -3, 14, 45],
      ['in', -3, 15, 2],
      ['in', -1, 17, 40],
      ['in', -1, 17, 41],
    ],
  },
  {
    customer: { contact: [2, 0] },
    number: 0,
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
    number: 0,
    messages: [
      ['in', -2, 20, 10],
      ['out', -1, 9, 5],
      ['in', -1, 9, 30],
    ],
  },
  {
    customer: { hworld: 0 },
    number: 0,
    messages: [
      ['in', -30, 20, 10],
      ['out', -30, 20, 30],
      ['in', -30, 20, 45],
      ['in', -30, 20, 46],
      ['out', -30, 21, 0],
      ['in', -30, 21, 5],
      ['out', -28, 10, 30],
      ['in', -28, 11, 0],
      ['in', -25, 17, 20],
      ['out', -25, 17, 45],
      ['in', -25, 18, 0],
      ['out', -23, 16, 10],
      ['in', -21, 22, 15],
      ['in', -21, 22, 16],
      ['out', -21, 22, 30],
      ['in', -18, 9, 40],
      ['out', -18, 10, 0],
      ['in', -18, 10, 10],
      ['in', -14, 15, 30],
      ['in', -14, 15, 31],
      ['out', -14, 16, 0],
      ['in', -11, 13, 20],
      ['out', -11, 13, 50],
      ['in', -11, 14, 5],
      ['out', -8, 11, 30],
      ['in', -8, 12, 10],
      ['in', -6, 19, 45],
      ['out', -6, 20, 0],
      ['in', -6, 20, 10],
      ['in', -5, 18, 30],
      ['out', -5, 18, 45],
      ['in', -1, 21, 5],
      ['in', -1, 21, 6],
    ],
  },
  {
    customer: { state: 'unlinked' },
    number: 1,
    messages: [
      ['in', -1, 11, 20],
      ['in', -1, 11, 21],
    ],
  },
  {
    customer: { phone: '+971 50 555 0142', state: 'unlinked' },
    number: 1,
    messages: [
      ['in', -14, 16, 0],
      ['out', -14, 16, 30],
      ['in', -13, 10, 15],
      ['out', -13, 11, 0],
      ['in', -13, 11, 20],
      ['in', -11, 9, 5],
      ['out', -11, 9, 40],
      ['in', -11, 9, 55],
      ['in', -11, 9, 56],
      ['out', -11, 10, 30],
      ['in', -9, 14, 10],
      ['out', -9, 14, 45],
      ['in', -9, 15, 0],
      ['out', -9, 15, 20],
      ['in', -7, 11, 30],
      ['out', -7, 12, 5],
      ['in', -7, 12, 20],
      ['in', -5, 16, 40],
      ['out', -5, 17, 10],
      ['in', -5, 17, 25],
      ['out', -5, 17, 30],
      ['in', -2, 16, 0],
      ['out', -2, 16, 30],
      ['in', -1, 10, 15],
    ],
  },
  {
    customer: { phone: '+86 139 0555 0188', state: 'dismissed' },
    number: 0,
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
    contacts: Row[][];
    leads: Row[];
    hworldPeople: Row[];
  },
  // Called with what removal deletes before any of it is written.
  record: (manifest: DemoWhatsAppManifest) => void,
): Promise<void> {
  const now = new Date().toISOString();
  const manifest: DemoWhatsAppManifest = {
    numberIds: demoNumbers.map(() => randomUUID()),
    customerIds: [],
  };
  record(manifest);
  for (const [index, numberId] of manifest.numberIds.entries())
    await query
      .insertInto('crmWaNumbers')
      .values({
        id: numberId,
        phoneNumberId: `demo-${numberId}`,
        displayPhone: demoNumbers[index],
        displayName: input.text.displayNames[index],
        mode: 'demo',
        status: 'CONNECTED',
        qualityRating: 'GREEN',
        connectedAt: input.at(-30 + index * 10, 9, 0),
        createdAt: now,
        updatedAt: now,
      })
      .execute();
  for (const [
    index,
    { number, customer, messages },
  ] of demoWhatsAppSchedule.entries()) {
    const numberId = manifest.numberIds[number];
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
    const conversationId = randomUUID();
    const inbound = messages
      .map(([direction], i) => (direction === 'in' ? times[i] : ''))
      .filter(Boolean);
    await query
      .insertInto('crmWaConversations')
      .values({
        id: conversationId,
        numberId,
        waContactId: id,
        lastInboundAt: inbound.at(-1) ?? null,
        lastMessageAt: times.at(-1),
        lastDirection: messages.at(-1)?.[0],
        unreadCount: awaitingReply(messages),
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
          numberId,
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

// How many messages the customer wrote since the team's last reply.
export function awaitingReply(messages: Message[]): number {
  return (
    messages.length -
    1 -
    messages.map(([direction]) => direction).lastIndexOf('out')
  );
}

// Deletes the demo numbers with their conversations, messages and customers;
// the records' WhatsApp lines go with the records (demo.ts).
export async function removeDemoWhatsApp(
  query: QueryAdapter,
  manifest: DemoWhatsAppManifest,
): Promise<void> {
  const numberIds = [
    ...(manifest.numberIds ?? []),
    ...(manifest.numberId ? [manifest.numberId] : []),
  ];
  if (!numberIds.length) return;
  await query
    .deleteFrom('crmWaMessages')
    .where('numberId', 'in', numberIds)
    .execute();
  await query
    .deleteFrom('crmWaConversations')
    .where('numberId', 'in', numberIds)
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
  await query.deleteFrom('crmWaNumbers').where('id', 'in', numberIds).execute();
}
