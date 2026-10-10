import {
  mailServiceToken,
  type MailMessageSummary,
} from '@nocobase/app-plugin-mail/server';
import type { QueryAdapter, Row } from '@nocobase/db';
import {
  createServiceToken,
  type ServiceResolver,
  type ServiceToken,
} from '@nocobase/service-provider';
import { randomUUID } from 'node:crypto';
import { listUsers, crmActor } from './authorization.js';
import { domainOf } from './mail-target.js';
import { toText } from './schema.js';
import type { CrmService } from './service.js';
import { decodeRow, encodeRow, jsonValue } from './values.js';

// A record's timeline shows the mail its people exchanged with the team, one
// entry per conversation (action `mail`): what it was about, how many
// messages, who wrote last and when. Every reader of the record sees that
// much; the messages themselves stay in the mailbox they were read from,
// which only its owner opens.
//
// The entries are brought in by reading each user's mail through the Mail
// plugin as that user, from where the last pass stopped (the first pass looks
// back 180 days). A conversation is matched to the records whose people are
// in it: a lead not yet converted by its email, a contact by its email (and
// with it the contact's company and the deals the contact is on), a company
// by the domain of its website.
//
// @temporary(nocobase-official): the Mail plugin tells only the browser that
// a mailbox changed (`mail.changed`), so the provider reads every mailbox once
// a minute, and the browser asks for its user's own after sending
// (`POST /api/mailTimeline/sync`). Replace the minute pass with a subscription
// once the plugin publishes a server-side event.

const BACKFILL_DAYS = 180;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
// Mail arriving late (a slow provider sync) is still read: each pass looks
// again at the last hour before where the previous one stopped.
const OVERLAP_MS = 60 * 60 * 1000;
// A reply this recent is news; older mail read on a first pass is history,
// and starts no follow-up.
const NEWS_MS = 24 * 60 * 60 * 1000;
const PARTICIPANT_LIMIT = 10;
const CURSOR_ID = 'mail-timeline';

export type MailEntity = 'leads' | 'contacts' | 'companies' | 'opportunities';

interface Target {
  entity: MailEntity;
  id: string;
}

// The records each address and domain belongs to, read once a pass.
export interface MailIndex {
  byAddress: Map<string, Target[]>;
  byDomain: Map<string, Target[]>;
  // The team's own addresses, never a customer's.
  internal: Set<string>;
}

// What a mail entry holds in `changes`.
export interface MailEntryChanges {
  subject: string;
  ownerId: string;
  accountId: string;
  conversationId: string;
  messageId: string;
  count: number;
  // The latest message: who wrote it, and whether the customer did.
  lastFrom: string;
  lastFromName: string;
  fromCustomer: boolean;
  // The customer's people in the conversation.
  participants: string[];
}

function lower(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function whenOf(message: MailMessageSummary): number {
  return Date.parse(message.receivedAt ?? message.sentAt ?? '') || 0;
}

function add(map: Map<string, Target[]>, key: string, target: Target): void {
  if (!key) return;
  const list = map.get(key) ?? [];
  if (!list.some((t) => t.entity === target.entity && t.id === target.id))
    list.push(target);
  map.set(key, list);
}

export async function mailIndex(query: QueryAdapter): Promise<MailIndex> {
  const byAddress = new Map<string, Target[]>();
  const byDomain = new Map<string, Target[]>();
  const leads = await query
    .selectFrom('crmLeads')
    .select(['id', 'email', 'status'])
    .where('email', 'is not', null)
    .execute();
  for (const lead of leads)
    if (lead.status !== 'converted')
      add(byAddress, lower(lead.email), {
        entity: 'leads',
        id: toText(lead.id),
      });
  const deals = await query
    .selectFrom('crmOpportunities')
    .select(['id', 'contacts'])
    .execute();
  const dealsOf = new Map<string, string[]>();
  for (const deal of deals) {
    const rows = jsonValue(deal.contacts);
    for (const row of Array.isArray(rows) ? rows : []) {
      const contactId = toText((row as Row | null)?.contactId);
      if (!contactId) continue;
      dealsOf.set(contactId, [
        ...(dealsOf.get(contactId) ?? []),
        toText(deal.id),
      ]);
    }
  }
  const contacts = await query
    .selectFrom('crmContacts')
    .select(['id', 'email', 'companyId'])
    .where('email', 'is not', null)
    .execute();
  for (const contact of contacts) {
    const address = lower(contact.email);
    const id = toText(contact.id);
    add(byAddress, address, { entity: 'contacts', id });
    if (contact.companyId)
      add(byAddress, address, {
        entity: 'companies',
        id: toText(contact.companyId),
      });
    for (const deal of dealsOf.get(id) ?? [])
      add(byAddress, address, { entity: 'opportunities', id: deal });
  }
  const companies = await query
    .selectFrom('crmCompanies')
    .select(['id', 'website'])
    .where('website', 'is not', null)
    .execute();
  for (const company of companies) {
    const domain = domainOf(company.website);
    if (domain)
      add(byDomain, domain, { entity: 'companies', id: toText(company.id) });
  }
  const internal = new Set(
    (await query.selectFrom('user').select('email').execute())
      .map((user) => lower(user.email))
      .filter(Boolean),
  );
  return { byAddress, byDomain, internal };
}

// The records an address belongs to: its own, and its company's by domain
// (a subdomain counting as the company's).
export function targetsOf(index: MailIndex, address: string): Target[] {
  const value = lower(address);
  if (!value || index.internal.has(value)) return [];
  const found = [...(index.byAddress.get(value) ?? [])];
  let host = value.slice(value.lastIndexOf('@') + 1);
  while (host.includes('.')) {
    for (const target of index.byDomain.get(host) ?? [])
      if (!found.some((t) => t.entity === target.entity && t.id === target.id))
        found.push(target);
    host = host.slice(host.indexOf('.') + 1);
  }
  return found;
}

// A conversation as one mailbox holds it: the messages a pass read, oldest
// first, without the copies a provider files in several folders.
export interface Conversation {
  key: string;
  accountId: string;
  conversationId: string;
  messages: MailMessageSummary[];
}

export function conversationsOf(
  messages: readonly MailMessageSummary[],
): Conversation[] {
  const seen = new Set<string>();
  const groups = new Map<string, Conversation>();
  for (const message of [...messages].sort((a, b) => whenOf(a) - whenOf(b))) {
    if (message.draft) continue;
    const copy = `${message.accountId}:${message.internetMessageId ?? message.id}`;
    if (seen.has(copy)) continue;
    seen.add(copy);
    const conversationId =
      message.conversationId ?? message.internetMessageId ?? message.id;
    const key = `${message.accountId}:${conversationId}`;
    const group = groups.get(key) ?? {
      key,
      accountId: message.accountId,
      conversationId,
      messages: [],
    };
    group.messages.push(message);
    groups.set(key, group);
  }
  return [...groups.values()];
}

// Who of the customer took part, and the records the conversation is
// about, each with the customer's people of it.
export function matchConversation(
  index: MailIndex,
  conversation: Conversation,
  own: ReadonlySet<string>,
): { targets: Target[]; customers: Set<string> } {
  const targets: Target[] = [];
  const customers = new Set<string>();
  for (const message of conversation.messages)
    for (const person of [message.from, ...message.to, ...message.cc]) {
      const address = lower(person?.address);
      if (!address || own.has(address)) continue;
      const found = targetsOf(index, address);
      if (!found.length) continue;
      customers.add(address);
      for (const target of found)
        if (
          !targets.some((t) => t.entity === target.entity && t.id === target.id)
        )
          targets.push(target);
    }
  return { targets, customers };
}

export const mailTimelineToken: ServiceToken<MailTimeline> =
  createServiceToken<MailTimeline>('crm.mailTimeline');

export class MailTimeline {
  private running = false;
  // Set by CrmProvider: a customer of the record wrote, so the AI follows
  // up the lead or the deal as the mailbox's owner.
  customerReplied?: (ownerId: string, target: Target) => void;

  constructor(
    private readonly service: CrmService,
    private readonly container: ServiceResolver,
  ) {}

  available(): boolean {
    return this.container.has(mailServiceToken);
  }

  // Every user's mail, one user after another; a pass still running is not
  // started again.
  async syncAll(now = new Date()): Promise<number> {
    if (this.running || !this.available()) return 0;
    this.running = true;
    try {
      const query = this.service.database.query();
      const index = await mailIndex(query);
      let written = 0;
      for (const user of await listUsers(this.service.database))
        written += await this.syncUser(toText(user.id), now, index).catch(
          () => 0,
        );
      return written;
    } finally {
      this.running = false;
    }
  }

  // One user's mail since their last pass; returns how many entries were
  // written.
  async syncUser(
    userId: string,
    now = new Date(),
    given?: MailIndex,
  ): Promise<number> {
    if (!userId || !this.available()) return 0;
    const mail = this.container.resolve(mailServiceToken);
    const context = { actorId: userId };
    const accounts = await mail.listAccounts(context).catch(() => []);
    if (!accounts.length) return 0;
    const own = new Set(accounts.map((a) => lower(a.address)));
    // The mailboxes whose first synchronization has finished: a mailbox
    // connected since the last pass brings its history only once the plugin
    // has imported it, dated long before this pass's cursor, so the pass
    // after that reads back the whole window again (the demo dataset's
    // mailboxes, and any mailbox a user connects later).
    const synced = await Promise.resolve()
      .then(() => mail.listSyncRuns(context, 0, 50))
      .then(
        (runs) =>
          new Set(
            runs
              .filter((run) => ['completed', 'partial'].includes(run.status))
              .map((run) => run.accountId),
          ),
      )
      .catch(() => undefined);
    const stored = (await this.cursors())[userId];
    const known = new Set(stored?.synced ?? []);
    const caughtUp =
      stored !== undefined &&
      (!synced || [...synced].every((id) => known.has(id)));
    const since = caughtUp
      ? Date.parse(stored.at) - OVERLAP_MS
      : now.getTime() - BACKFILL_DAYS * 86_400_000;
    const messages: MailMessageSummary[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await mail.listMessages(context, {
        limit: PAGE_SIZE,
        cursor,
      });
      const recent = result.items.filter((m) => whenOf(m) >= since);
      messages.push(...recent);
      cursor = result.nextCursor;
      if (!cursor || recent.length < result.items.length) break;
    }
    const index = given ?? (await mailIndex(this.service.database.query()));
    let written = 0;
    for (const conversation of conversationsOf(messages)) {
      const { targets, customers } = matchConversation(
        index,
        conversation,
        own,
      );
      for (const target of targets)
        if (await this.write(userId, target, conversation, customers, own, now))
          written += 1;
    }
    // Only the latest runs are listed, so a mailbox synced long ago may be
    // missing from them; keeping it avoids reading the window again.
    await this.saveCursor(userId, now, [
      ...new Set([...known, ...(synced ?? [])]),
    ]);
    return written;
  }

  // The record's entry for the conversation, added or brought up to date;
  // false when nothing in it is new.
  private async write(
    userId: string,
    target: Target,
    conversation: Conversation,
    customers: ReadonlySet<string>,
    own: ReadonlySet<string>,
    now: Date,
  ): Promise<boolean> {
    const latest = conversation.messages.at(-1);
    if (!latest) return false;
    const latestAt = whenOf(latest);
    const sourceKey = conversation.key.slice(0, 255);
    // Read before the transaction, which holds the connection.
    const actor = crmActor(this.service.authz, {
      id: userId,
      locale: await this.service.localeOf(userId),
    });
    return await this.service.database.transaction(async ({ query }) => {
      const existing = await query
        .selectFrom('crmHistory')
        .selectAll()
        .where('entity', '=', target.entity)
        .where('recordId', '=', target.id)
        .where('action', '=', 'mail')
        .where('sourceKey', '=', sourceKey)
        .executeTakeFirst();
      const before = existing ? decodeRow(existing) : undefined;
      const previous = (before?.changes ?? {}) as Partial<MailEntryChanges>;
      const previousAt = before?.occurredAt
        ? Date.parse(toText(before.occurredAt))
        : 0;
      const fresh = conversation.messages.filter((m) => whenOf(m) > previousAt);
      if (existing && !fresh.length) return false;
      const fromCustomer = !own.has(lower(latest.from?.address));
      const participants = [
        ...new Set([...(previous.participants ?? []), ...customers]),
      ].slice(0, PARTICIPANT_LIMIT);
      const changes: MailEntryChanges = {
        subject: latest.subject || previous.subject || '',
        ownerId: userId,
        accountId: conversation.accountId,
        conversationId: conversation.conversationId,
        messageId: latest.id,
        // The messages read, one copy each: a provider's own count (Gmail's
        // over IMAP) includes the copies it files in several folders.
        count: (previous.count ?? 0) + fresh.length,
        lastFrom: lower(latest.from?.address),
        lastFromName: toText(latest.from?.name),
        fromCustomer,
        participants,
      };
      const occurredAt = new Date(latestAt || now.getTime()).toISOString();
      if (existing)
        await query
          .updateTable('crmHistory')
          .set({
            changes: JSON.stringify(changes),
            occurredAt,
            createdAt: occurredAt,
          })
          .where('id', '=', toText(existing.id))
          .execute();
      else
        await query
          .insertInto('crmHistory')
          .values({
            id: randomUUID(),
            entity: target.entity,
            recordId: target.id,
            actorId: userId,
            action: 'mail',
            changes: JSON.stringify(changes),
            source: 'mail',
            sourceKey,
            occurredAt,
            createdAt: occurredAt,
          })
          .execute();
      if (target.entity === 'leads')
        await this.service.leadWorked(
          query,
          actor,
          target.id,
          now.toISOString(),
        );
      const replied = fresh.some(
        (m) =>
          !own.has(lower(m.from?.address)) &&
          now.getTime() - whenOf(m) < NEWS_MS,
      );
      if (
        replied &&
        (target.entity === 'leads' || target.entity === 'opportunities')
      )
        this.customerReplied?.(userId, target);
      return true;
    });
  }

  // Per user: when their last pass ran, and which of their mailboxes had
  // finished their first synchronization then. A cursor kept as a bare time
  // (before this was recorded) knows of no mailbox, so its first pass reads
  // back the whole window once, which writes nothing twice.
  private async cursors(): Promise<
    Record<string, { at: string; synced: string[] }>
  > {
    const row = await this.service.database
      .query()
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', CURSOR_ID)
      .executeTakeFirst();
    const value = jsonValue(row?.value);
    if (!value || typeof value !== 'object') return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([id, entry]) => [
        id,
        typeof entry === 'string'
          ? { at: entry, synced: [] }
          : {
              at: toText((entry as { at?: unknown }).at),
              synced: Array.isArray((entry as { synced?: unknown }).synced)
                ? (entry as { synced: unknown[] }).synced.map(toText)
                : [],
            },
      ]),
    );
  }

  private async saveCursor(
    userId: string,
    now: Date,
    synced: readonly string[],
  ): Promise<void> {
    await this.service.database.transaction(async ({ query }) => {
      const row = await query
        .selectFrom('crmSettings')
        .select('value')
        .where('id', '=', CURSOR_ID)
        .executeTakeFirst();
      const stored = jsonValue(row?.value);
      const value = {
        ...(stored && typeof stored === 'object' ? stored : {}),
        [userId]: { at: now.toISOString(), synced },
      };
      if (row)
        await query
          .updateTable('crmSettings')
          .set(encodeRow({ value, updatedAt: now }))
          .where('id', '=', CURSOR_ID)
          .execute();
      else
        await query
          .insertInto('crmSettings')
          .values(encodeRow({ id: CURSOR_ID, value, updatedAt: now }))
          .execute();
    });
  }
}
