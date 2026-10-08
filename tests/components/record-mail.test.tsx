import { expect, it } from 'vitest';
import { emailsOf, threadsOf } from '../../client/components/crm/mail.js';
import {
  domainOf,
  searchTerms,
} from '../../server/providers/crm/mail-target.js';
import type { MailMessageSummary } from '@nocobase/app-plugin-mail/client';

it("takes an account's own domain from its website, never a shared mail service's", () => {
  expect(domainOf('https://www.Acme-Robotics.com/about')).toBe(
    'acme-robotics.com',
  );
  expect(domainOf('acme.cn')).toBe('acme.cn');
  expect(domainOf('https://mail.qq.com')).toBe('mail.qq.com');
  expect(domainOf('qq.com')).toBeUndefined();
  expect(domainOf('gmail.com')).toBeUndefined();
  expect(domainOf('')).toBeUndefined();
  expect(domainOf('not a site')).toBeUndefined();
});

it('searches each address once and the domain by its at sign', () => {
  expect(
    searchTerms({
      addresses: ['Lin@Acme.com', 'lin@acme.com', ' ', 'wu@acme.com'],
      domain: 'acme.com',
    }),
  ).toEqual(['lin@acme.com', 'wu@acme.com', '@acme.com']);
  expect(
    emailsOf([{ email: ' a@b.com ' }, { email: '' }, { name: 'x' }]),
  ).toEqual(['a@b.com']);
});

const message = (
  id: string,
  values: Partial<MailMessageSummary>,
): MailMessageSummary =>
  ({
    id,
    accountId: 'a1',
    providerMessageId: `imap:${id}`,
    folderIds: [],
    labelIds: [],
    to: [],
    cc: [],
    bcc: [],
    subject: 'Pilot',
    read: true,
    starred: false,
    draft: false,
    hasAttachments: false,
    todo: false,
    ...values,
  }) as MailMessageSummary;

it("groups a record's mail into conversations, one copy of each message", () => {
  const threads = threadsOf([
    // The same reply in the inbox and in Gmail's All Mail.
    message('1', {
      internetMessageId: '<r@x>',
      conversationId: 'rfc:t',
      receivedAt: '2026-09-14T04:00:00Z',
      read: false,
    }),
    message('2', {
      internetMessageId: '<r@x>',
      conversationId: 'rfc:t',
      receivedAt: '2026-09-14T04:00:00Z',
    }),
    message('3', {
      internetMessageId: '<o@x>',
      conversationId: 'rfc:t',
      receivedAt: '2026-09-13T04:00:00Z',
    }),
    message('4', {
      internetMessageId: '<s@x>',
      receivedAt: '2026-09-15T04:00:00Z',
    }),
  ]);
  expect(threads.map((t) => [t.latest.id, t.count, t.unread])).toEqual([
    ['4', 1, false],
    ['1', 2, true],
  ]);
});
