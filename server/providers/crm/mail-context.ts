import {
  mailServiceToken,
  type MailMessageSummary,
} from '@nocobase/app-plugin-mail/server';
import type { QueryAdapter, Row } from '@nocobase/db';
import type { ServiceResolver } from '@nocobase/service-provider';
import { concerns, searchTerms, type MailTarget } from './mail-target.js';

// The mail the team exchanged with a record's customer, as the AI
// follow-ups read it: what the customer wrote is information gained in
// conversation, beside the tasks a salesperson logs. Read through the
// Mail plugin as each mailbox's owner: the record's owner, and whoever else
// exchanged mail with its customer, as the record's timeline names them
// (mailboxOwnersOf). The text serves the AI's run alone: nobody but a
// mailbox's owner opens its messages, and the card shows only what the AI
// concluded. Without the plugin, or with nothing found, it is empty.

// How far back, how many messages, and how much of each.
const MAIL_DAYS = 180;
const MAIL_COUNT = 10;
const BODY_LIMIT = 1500;

// Where a quoted earlier message starts, in English and Chinese clients:
// what follows repeats mail already listed, or mail older than the window.
const QUOTE_START = [
  /^>/u,
  /^On .+wrote:\s*$/u,
  /^在.+写道[:：]?\s*$/u,
  /^-{2,}\s*(Original Message|原始邮件)\s*-{2,}/iu,
  /^(From|发件人)[:：]\s/u,
];

// A message's own words: its text without the quoted earlier messages,
// blank lines squeezed, cut to length.
export function ownText(text: string): string {
  const lines: string[] = [];
  for (const line of text.replace(/\r\n?/gu, '\n').split('\n')) {
    if (QUOTE_START.some((pattern) => pattern.test(line.trim()))) break;
    lines.push(line.trimEnd());
  }
  return lines
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
    .slice(0, BODY_LIMIT);
}

function plain(html: string): string {
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/giu, '')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/giu, '\n')
    .replace(/<[^>]+>/gu, '')
    .replace(/&nbsp;/gu, ' ')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&amp;/gu, '&');
}

function whenOf(message: MailMessageSummary): number {
  return Date.parse(message.receivedAt ?? message.sentAt ?? '') || 0;
}

function person(address?: { name?: string; address: string }): string {
  if (!address) return '';
  return address.name && address.name !== address.address
    ? `${address.name} <${address.address}>`
    : address.address;
}

// Who else holds mail with a record's customer: the owners of the mailboxes
// whose conversations reached the record's timeline (mail-timeline.ts writes
// each as an entry by its mailbox's owner).
export async function mailboxOwnersOf(
  database: { query: () => QueryAdapter },
  entity: string,
  recordId: string,
): Promise<string[]> {
  const rows = await database
    .query()
    .selectFrom('crmHistory')
    .select('actorId')
    .where('entity', '=', entity)
    .where('recordId', '=', recordId)
    .where('action', '=', 'mail')
    .execute();
  return [
    ...new Set(
      rows
        .map((row) => (typeof row.actorId === 'string' ? row.actorId : ''))
        .filter(Boolean),
    ),
  ];
}

export async function mailOf(
  container: ServiceResolver,
  ownerId: string,
  target: MailTarget,
  timeZone: string,
  options: {
    now?: Date;
    signal?: AbortSignal;
    // Others whose mailboxes hold mail with the customer (mailboxOwnersOf).
    readers?: readonly string[];
  } = {},
): Promise<Row[]> {
  const terms = searchTerms(target);
  const readers = [
    ...new Set([ownerId, ...(options.readers ?? [])].filter(Boolean)),
  ];
  if (!terms.length || !readers.length || !container.has(mailServiceToken))
    return [];
  try {
    const mail = container.resolve(mailServiceToken);
    const since =
      (options.now ?? new Date()).getTime() - MAIL_DAYS * 86_400_000;
    // Each reader's own mailboxes, searched as them.
    const found = await Promise.all(
      readers.flatMap((actorId) =>
        terms.map(async (query) => {
          const page = await mail
            .listMessages(
              { actorId, signal: options.signal },
              {
                query,
                limit: 50,
              },
            )
            .catch(() => null);
          return (page?.items ?? []).map((message) => ({ actorId, message }));
        }),
      ),
    );
    // One copy of each message: over IMAP, Gmail files a message in every
    // folder its labels put it in, each copy sharing its Message-ID, and a
    // message between two of the team is in both their mailboxes.
    const seen = new Map<
      string,
      { actorId: string; message: MailMessageSummary }
    >();
    for (const item of found.flat()) {
      const { message } = item;
      if (message.draft || whenOf(message) < since) continue;
      const people = [message.from, ...message.to, ...message.cc];
      if (!people.some((p) => concerns(target, p?.address))) continue;
      const key =
        message.internetMessageId ?? `${message.accountId}:${message.id}`;
      if (!seen.has(key)) seen.set(key, item);
    }
    const recent = [...seen.values()]
      .sort((a, b) => whenOf(b.message) - whenOf(a.message))
      .slice(0, MAIL_COUNT);
    const time = new Intl.DateTimeFormat('sv-SE', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    return await Promise.all(
      recent.map(async ({ actorId, message }) => {
        const full = await mail
          .getMessage(
            { actorId, signal: options.signal },
            message.accountId,
            message.id,
          )
          .catch(() => undefined);
        const body = full?.text ?? (full?.html ? plain(full.html) : '');
        const when = whenOf(message);
        // No ref: a model given one cites it ("email M1") in text written
        // for people; a message is named by its date instead.
        return {
          at: when ? time.format(new Date(when)) : null,
          // Who wrote it: the customer, or the owner to the customer.
          direction: concerns(target, message.from?.address)
            ? 'fromCustomer'
            : 'toCustomer',
          from: person(message.from) || null,
          to: message.to.map(person).filter(Boolean),
          subject: message.subject || null,
          text: ownText(body) || message.preview?.slice(0, 300) || null,
          attachments: message.hasAttachments,
        };
      }),
    );
  } catch {
    return [];
  }
}
