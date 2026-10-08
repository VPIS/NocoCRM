import {
  mailServiceToken,
  type MailMessageSummary,
} from '@nocobase/app-plugin-mail/server';
import type { Row } from '@nocobase/db';
import type { ServiceResolver } from '@nocobase/service-provider';
import { concerns, searchTerms, type MailTarget } from './mail-target.js';

// The mail a record's owner exchanged with its customer, as the AI
// follow-ups read it: what the customer wrote is information gained in
// conversation, beside the activities a salesperson logs. Read through the
// Mail plugin as the owner, so a follow-up sees only the owner's own
// mailboxes, as the owner's Mail tab on the record does; without the plugin,
// or with nothing found, it is empty.

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

export async function mailOf(
  container: ServiceResolver,
  ownerId: string,
  target: MailTarget,
  timeZone: string,
  options: { now?: Date; signal?: AbortSignal } = {},
): Promise<Row[]> {
  const terms = searchTerms(target);
  if (!terms.length || !ownerId || !container.has(mailServiceToken)) return [];
  try {
    const mail = container.resolve(mailServiceToken);
    const context = { actorId: ownerId, signal: options.signal };
    const since =
      (options.now ?? new Date()).getTime() - MAIL_DAYS * 86_400_000;
    const pages = await Promise.all(
      terms.map((query) =>
        mail.listMessages(context, { query, limit: 50 }).catch(() => null),
      ),
    );
    // One copy of each message: over IMAP, Gmail files a message in every
    // folder its labels put it in, each copy sharing its Message-ID.
    const seen = new Map<string, MailMessageSummary>();
    for (const message of pages.flatMap((page) => page?.items ?? [])) {
      if (message.draft || whenOf(message) < since) continue;
      const people = [message.from, ...message.to, ...message.cc];
      if (!people.some((p) => concerns(target, p?.address))) continue;
      const key = `${message.accountId}:${message.internetMessageId ?? message.id}`;
      if (!seen.has(key)) seen.set(key, message);
    }
    const recent = [...seen.values()]
      .sort((a, b) => whenOf(b) - whenOf(a))
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
      recent.map(async (message, index) => {
        const full = await mail
          .getMessage(context, message.accountId, message.id)
          .catch(() => undefined);
        const body = full?.text ?? (full?.html ? plain(full.html) : '');
        const when = whenOf(message);
        return {
          ref: `M${index + 1}`,
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
