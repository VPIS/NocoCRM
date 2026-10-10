import { randomUUID } from 'node:crypto';
import {
  defineMailProviderDefinition,
  type MailProviderAdapter,
  type MailProviderCapabilities,
  type MailProviderConfig,
  type MailProviderDefinition,
  type MailProviderResult,
  type NormalizedMailMessage,
} from '@nocobase/app-plugin-mail/server';
import type { DemoContent, DemoMailTopic } from './demo-content/types.js';
import { pick } from '../../locales/crm-ai/index.js';
import { demoMailTexts } from '../../locales/crm-ai/demo-mail.js';

// The demo dataset's mailboxes (demo.ts): a mail provider of the CRM's own,
// registered through the Mail plugin's public provider registry, whose
// mailboxes hold the conversations the import wrote, so the mailbox, the
// records' Mail tabs, the timeline and the AI's follow-ups can be tried
// without a real mail server. Nothing is ever delivered: a message sent from
// a demo mailbox is accepted and filed in Sent by the plugin.
//
// The plugin copies a mailbox's messages once, on its first sync; after
// that its own copy holds read, starred, moved and deleted state, so the
// provider reports no changes ever. Only the demo import connects a demo
// mailbox: the connection accepts nothing but a secret this process holds.

export const DEMO_MAIL_TYPE = 'crm-demo';
// The provider instance, configured by the application's defaults
// (server/config/mail.ts).
export const DEMO_MAIL_NAME = 'crm-demo';
// Where the import keeps the mailboxes' messages (crmSettings).
export const DEMO_MAIL_ROW = 'demo-mail';

// The language of the demo imported, which the provider's label follows;
// set at boot from the import present and by each import and removal.
let demoLanguage: string | undefined;
export const setDemoMailLanguage = (language: string | undefined): void => {
  demoLanguage = language;
};
export const demoMailLanguage = (): string | undefined => demoLanguage;

// The password the demo import connects with; anyone else is refused.
export const DEMO_MAIL_SECRET = randomUUID();

const CAPABILITIES: MailProviderCapabilities = {
  receive: true,
  send: true,
  incrementalSync: false,
  pushNotifications: false,
  folders: true,
  labels: false,
  drafts: false,
  moveMessage: true,
  aliases: false,
};

export const DEMO_FOLDERS = {
  inbox: 'demo-inbox',
  sent: 'demo-sent',
  trash: 'demo-trash',
} as const;

// One mailbox's messages as the import stores them, by mailbox address.
export type DemoMailStore = Record<string, NormalizedMailMessage[]>;

const ok = <T>(value: T): MailProviderResult<T> => ({ ok: true, value });
const CURSOR = { value: 'demo', version: '1' };
const PAGE = 50;

// The addresses a demo mailbox sends to: the demo data's own, all at
// .example domains (the demo accounts, its companies' contacts, its leads),
// which no real mail reaches. Anyone else is refused, so mail meant for a
// real customer is never filed as sent while going nowhere.
export const isDemoAddress = (address: string): boolean =>
  /@([a-z0-9-]+\.)*example$/u.test(address.trim().toLowerCase());

export function createDemoMailProvider(
  // The messages of a mailbox, from the import's store.
  messagesOf: (address: string) => Promise<readonly NormalizedMailMessage[]>,
  // Whether the CRM's words are Chinese now: the demo's language while one
  // is imported, else the application's.
  chinese: () => boolean,
): MailProviderDefinition {
  const words = () => pick(demoMailTexts, chinese());
  return defineMailProviderDefinition<MailProviderConfig>({
    type: DEMO_MAIL_TYPE,
    // Read whenever the plugin lists its providers.
    get label() {
      return words().label;
    },
    capabilities: CAPABILITIES,
    connection: {
      async connect(context, _config, input) {
        if (input.password !== DEMO_MAIL_SECRET)
          return {
            ok: false,
            error: {
              code: 'CRM_DEMO_MAILBOX_IMPORT_ONLY',
              message: words().importOnly,
              category: 'authentication',
              retryable: false,
            },
          };
        const address = input.address.trim().toLowerCase();
        const credentialReference = await context.credentials.put(
          { demo: true },
          { purpose: 'account' },
        );
        return ok({
          address,
          displayName: input.displayName?.trim() || undefined,
          authorizationSubject: address,
          credentialReference,
          scopes: [],
          identities: [
            {
              address,
              displayName: input.displayName?.trim() || undefined,
              isPrimary: true,
              canSend: true,
            },
          ],
        });
      },
    },
    async createAdapter(_context, config, account) {
      const adapter: MailProviderAdapter = {
        identity: { type: DEMO_MAIL_TYPE, name: config.name },
        capabilities: CAPABILITIES,
        async listFolders() {
          return ok({
            folders: [
              {
                providerFolderId: DEMO_FOLDERS.inbox,
                type: 'inbox',
                name: 'Inbox',
                kind: 'folder',
              },
              {
                providerFolderId: DEMO_FOLDERS.sent,
                type: 'sent',
                name: 'Sent',
                kind: 'folder',
              },
              {
                providerFolderId: DEMO_FOLDERS.trash,
                type: 'trash',
                name: 'Trash',
                kind: 'folder',
              },
            ],
            completeProviderFolderIds: Object.values(DEMO_FOLDERS),
          });
        },
        async getCurrentSyncCursor() {
          return ok(CURSOR);
        },
        reconcileSyncCursor() {
          return ok(CURSOR);
        },
        async listMessages(input) {
          const after = input.receivedAfter
            ? Date.parse(input.receivedAfter)
            : 0;
          const all = (await messagesOf(account.address)).filter(
            (message) =>
              Date.parse(message.receivedAt ?? message.sentAt ?? '') >= after,
          );
          const start = Number(input.cursor ?? 0) || 0;
          const end = start + Math.min(input.limit ?? PAGE, PAGE);
          return ok({
            messages: all.slice(start, end),
            nextCursor: end < all.length ? String(end) : undefined,
            syncCursor: CURSOR,
          });
        },
        async listChanges() {
          return ok({
            messages: [],
            deletedProviderMessageIds: [],
            nextCursor: CURSOR,
            hasMore: false,
          });
        },
        async getMessage(providerMessageId) {
          const message = (await messagesOf(account.address)).find(
            (item) => item.providerMessageId === providerMessageId,
          );
          return message
            ? ok(message)
            : {
                ok: false,
                error: {
                  code: 'CRM_DEMO_MESSAGE_NOT_FOUND',
                  message: 'The demo message is gone.',
                  category: 'not_found',
                  retryable: false,
                },
              };
        },
        // Accepted and never delivered: the plugin files the copy in Sent.
        async sendMessage(input) {
          const outside = [
            ...input.message.to,
            ...input.message.cc,
            ...input.message.bcc,
          ].filter((recipient) => !isDemoAddress(recipient.address));
          if (outside.length)
            return {
              status: 'failed',
              error: {
                code: 'CRM_DEMO_MAILBOX_DEMO_RECIPIENTS_ONLY',
                message: words().demoRecipientsOnly,
                category: 'validation',
                retryable: false,
              },
            };
          const id = randomUUID();
          return {
            status: 'accepted',
            providerMessageId: `demo-sent-${id}`,
            internetMessageId: `<${id}@demo.example>`,
          };
        },
        async setRead() {
          return ok(undefined);
        },
        async setStarred() {
          return ok(undefined);
        },
        async moveMessage(providerMessageId) {
          return ok({ providerMessageId });
        },
        async deleteMessage() {
          return ok(undefined);
        },
      };
      return adapter;
    },
  });
}

// One conversation the import writes: its topic's text filled with the
// dataset's people, in the mailbox of the record's owner (and, between two
// colleagues, in both), its last message `lastDay` days before the import
// and each earlier one a day before the next.
export interface DemoMailbox {
  readonly address: string;
  readonly name: string;
}
export interface DemoConversation {
  readonly topic: DemoMailTopic;
  readonly owner: DemoMailbox;
  readonly other: DemoMailbox;
  // The other side's mailbox too: an internal exchange.
  readonly internal?: boolean;
  readonly company?: string;
  readonly deal?: string;
  readonly amount?: string;
  readonly lastDay: number;
}

const fill = (text: string, values: Record<string, string>): string =>
  text.replace(/\{\{(\w+)\}\}/gu, (_, key: string) => values[key] ?? '');

// The mailboxes' messages, by address, for the provider to serve. `at`
// places a day and an hour in the CRM's time zone, as the import's own
// dates are placed.
export function buildDemoMail(
  content: Pick<DemoContent, 'mail' | 'mailSenders' | 'replyPrefix'>,
  conversations: readonly DemoConversation[],
  at: (day: number, hour: number) => string,
): DemoMailStore {
  const store: DemoMailStore = {};
  const put = (address: string, message: NormalizedMailMessage): void => {
    (store[address] ??= []).push(message);
  };
  conversations.forEach((conversation, index) => {
    const thread = content.mail[conversation.topic];
    const values = {
      customer: conversation.other.name,
      colleague: conversation.other.name,
      owner: conversation.owner.name,
      company: conversation.company ?? '',
      deal: conversation.deal ?? '',
      amount: conversation.amount ?? '',
      address: conversation.other.address,
    };
    const subject = fill(thread.subject, values);
    const postmaster = content.mailSenders.postmaster;
    const count = thread.messages.length;
    const ids = thread.messages.map(
      (_, n) => `<demo-${String(index)}-${String(n)}@demo.example>`,
    );
    thread.messages.forEach((written, n) => {
      const fromOwner = written.from === 'owner';
      const from = fromOwner
        ? conversation.owner
        : written.from === 'postmaster'
          ? postmaster
          : conversation.other;
      const to = fromOwner ? conversation.other : conversation.owner;
      const when = at(
        -(conversation.lastDay + (count - 1 - n)),
        // Office hours, the replies later in the day than the first.
        10 + ((n * 3 + index) % 7),
      );
      const text = fill(written.body, values);
      const base = {
        internetMessageId: ids[n],
        providerConversationId: `demo-${String(index)}`,
        from: { address: from.address, name: from.name },
        to: [{ address: to.address, name: to.name }],
        cc: [],
        bcc: [],
        replyTo: [],
        inReplyTo: n ? ids[n - 1] : undefined,
        references: ids.slice(0, n),
        subject: written.subject
          ? fill(written.subject, { ...values, subject })
          : n
            ? `${content.replyPrefix}${subject}`
            : subject,
        preview: text.replace(/\s+/gu, ' ').trim().slice(0, 160),
        text,
        receivedAt: when,
        sentAt: when,
        starred: false,
        draft: false,
        attachments: [],
        contentStatus: 'complete' as const,
      };
      // The owner's copy, and between colleagues the other's too; the last
      // message received stays unread.
      const copies: [DemoMailbox, boolean][] = [
        [conversation.owner, fromOwner],
      ];
      if (conversation.internal) copies.push([conversation.other, !fromOwner]);
      for (const [mailbox, sent] of copies)
        put(mailbox.address, {
          ...base,
          providerMessageId: `demo-${String(index)}-${String(n)}`,
          providerFolderIds: [sent ? DEMO_FOLDERS.sent : DEMO_FOLDERS.inbox],
          read: sent || n < count - 1,
        });
    });
  });
  return store;
}
