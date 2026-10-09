// @vitest-environment node

import { mailServiceToken } from '@nocobase/app-plugin-mail/server';
import type { ServiceResolver } from '@nocobase/service-provider';
import { describe, expect, it } from 'vitest';
import { mailOf, ownText } from '../../server/providers/crm/mail-context.js';
import {
  concerns,
  domainOf,
  searchTerms,
} from '../../server/providers/crm/mail-target.js';

// The mail an AI follow-up reads: the owner's own messages with the
// customer, through the Mail plugin's service, as the owner.

const NOW = new Date('2026-10-08T08:00:00Z');

interface FakeMessage {
  id: string;
  accountId?: string;
  internetMessageId?: string;
  from: string;
  to: string[];
  subject: string;
  receivedAt: string;
  draft?: boolean;
  text?: string;
  html?: string;
  // Whose mailbox it is in; everyone's when left out.
  owner?: string;
}

function container(
  messages: FakeMessage[],
  calls: { actor: string; query: string }[] = [],
  reads: { actor: string; id: string }[] = [],
): ServiceResolver {
  const summary = (m: FakeMessage) => ({
    id: m.id,
    accountId: m.accountId ?? 'acc-1',
    providerMessageId: m.id,
    internetMessageId: m.internetMessageId,
    folderIds: [],
    labelIds: [],
    from: { address: m.from },
    to: m.to.map((address) => ({ address })),
    cc: [],
    bcc: [],
    subject: m.subject,
    preview: (m.text ?? '').slice(0, 40),
    receivedAt: m.receivedAt,
    read: true,
    starred: false,
    draft: m.draft ?? false,
    hasAttachments: false,
    todo: false,
  });
  const service = {
    listMessages: async (
      context: { actorId: string },
      input: { query?: string },
    ) => {
      calls.push({ actor: context.actorId, query: input.query ?? '' });
      // Like the plugin: the query matches subjects and addresses alike.
      const q = (input.query ?? '').toLowerCase();
      return {
        items: messages
          .filter((m) => !m.owner || m.owner === context.actorId)
          .filter((m) =>
            [m.subject, m.from, ...m.to].some((v) =>
              v.toLowerCase().includes(q),
            ),
          )
          .map(summary),
      };
    },
    getMessage: async (
      context: { actorId: string },
      _accountId: string,
      id: string,
    ) => {
      reads.push({ actor: context.actorId, id });
      const m = messages.find(
        (message) =>
          message.id === id &&
          (!message.owner || message.owner === context.actorId),
      );
      return m
        ? { ...summary(m), text: m.text, html: m.html, attachments: [] }
        : undefined;
    },
  };
  return {
    has: (token: unknown) => token === mailServiceToken,
    resolve: (token: unknown) => {
      if (token !== mailServiceToken) throw new Error('not registered');
      return service;
    },
  } as unknown as ServiceResolver;
}

describe('mail with a record, for an AI follow-up', () => {
  it('reads the owner’s mail with the customer, newest first, one copy each', async () => {
    const calls: { actor: string; query: string }[] = [];
    const rows = await mailOf(
      container(
        [
          {
            id: 'm1',
            internetMessageId: '<a@x>',
            from: 'zhang@wg.example',
            to: ['me@nocobase.com'],
            subject: 'Budget',
            receivedAt: '2026-10-01T02:00:00Z',
            text: 'We can spend 300,000 yuan.\n\nOn Mon, Sep 1 2026, Me wrote:\n> Hello',
          },
          // Gmail's All Mail copy of the same message.
          {
            id: 'm1b',
            internetMessageId: '<a@x>',
            from: 'zhang@wg.example',
            to: ['me@nocobase.com'],
            subject: 'Budget',
            receivedAt: '2026-10-01T02:00:00Z',
          },
          {
            id: 'm2',
            from: 'me@nocobase.com',
            to: ['zhang@wg.example'],
            subject: 'Proposal',
            receivedAt: '2026-09-20T02:00:00Z',
            html: '<p>Our proposal &amp; prices</p>',
          },
          // A draft, mail older than six months, and a message that only
          // mentions the address in its subject.
          {
            id: 'm3',
            from: 'me@nocobase.com',
            to: ['zhang@wg.example'],
            subject: 'Draft',
            receivedAt: '2026-10-02T02:00:00Z',
            draft: true,
          },
          {
            id: 'm4',
            from: 'zhang@wg.example',
            to: ['me@nocobase.com'],
            subject: 'Old',
            receivedAt: '2026-01-01T02:00:00Z',
          },
          {
            id: 'm5',
            from: 'other@else.example',
            to: ['me@nocobase.com'],
            subject: 'About zhang@wg.example',
            receivedAt: '2026-10-03T02:00:00Z',
          },
        ],
        calls,
      ),
      'user-1',
      { addresses: ['Zhang@WG.example'] },
      'Asia/Shanghai',
      { now: NOW },
    );
    expect(calls).toEqual([{ actor: 'user-1', query: 'zhang@wg.example' }]);
    expect(rows.map((r) => r.subject)).toEqual(['Budget', 'Proposal']);
    expect(rows[0]).toMatchObject({
      at: '2026-10-01 10:00',
      direction: 'fromCustomer',
      text: 'We can spend 300,000 yuan.',
    });
    expect(rows[1]).toMatchObject({
      direction: 'toCustomer',
      text: 'Our proposal & prices',
    });
  });

  it('finds anyone at the account’s domain, but not a shared mail service', async () => {
    expect(domainOf('https://www.wg.example/about')).toBe('wg.example');
    expect(domainOf('qq.com')).toBeUndefined();
    const target = { addresses: [], domain: 'wg.example' };
    expect(searchTerms(target)).toEqual(['@wg.example']);
    expect(concerns(target, 'li@sales.wg.example')).toBe(true);
    expect(concerns(target, 'li@notwg.example')).toBe(false);
  });

  it('is empty without the Mail plugin, an address or a reachable mailbox', async () => {
    const none = {
      has: () => false,
      resolve: () => {
        throw new Error('not registered');
      },
    } as unknown as ServiceResolver;
    expect(
      await mailOf(none, 'user-1', { addresses: ['a@b.example'] }, 'UTC'),
    ).toEqual([]);
    expect(
      await mailOf(container([]), 'user-1', { addresses: [] }, 'UTC'),
    ).toEqual([]);
    const failing = {
      has: () => true,
      resolve: () => ({
        listMessages: async () => {
          throw new Error('mailbox unavailable');
        },
      }),
    } as unknown as ServiceResolver;
    expect(
      await mailOf(failing, 'user-1', { addresses: ['a@b.example'] }, 'UTC'),
    ).toEqual([]);
  });

  it('keeps a message’s own words, not the messages it quotes', () => {
    expect(
      ownText('好的，下周二可以。\n\n在 2026年9月1日，张伟 写道：\n> 时间？'),
    ).toBe('好的，下周二可以。');
    expect(
      ownText('Thanks.\n-----Original Message-----\nFrom: me\nOld text'),
    ).toBe('Thanks.');
    expect(ownText('x'.repeat(3000))).toHaveLength(1500);
  });
});

describe('mail in a colleague’s mailbox', () => {
  it('reads it too, as that colleague, once even when both hold it', async () => {
    const reads: { actor: string; id: string }[] = [];
    const rows = await mailOf(
      container(
        [
          {
            id: 'reply',
            owner: 'admin',
            internetMessageId: '<r@x>',
            from: 'zhou@x.example',
            to: ['admin@team.example'],
            subject: 'Re: 方案',
            receivedAt: '2026-10-08T07:00:00Z',
            text: '售后 60 人，ERP 是用友 U8。',
          },
          {
            id: 'copy',
            owner: 'owner',
            internetMessageId: '<r@x>',
            from: 'zhou@x.example',
            to: ['admin@team.example', 'owner@team.example'],
            subject: 'Re: 方案',
            receivedAt: '2026-10-08T07:00:00Z',
            text: '售后 60 人，ERP 是用友 U8。',
          },
        ],
        [],
        reads,
      ),
      'owner',
      { addresses: ['zhou@x.example'] },
      'UTC',
      { now: NOW, readers: ['admin'] },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ direction: 'fromCustomer' });
    expect(String(rows[0].text)).toContain('用友 U8');
    // Read as whoever's mailbox the kept copy is in.
    expect(reads).toHaveLength(1);
  });

  it('reads only the owner’s mailbox when nobody else holds mail with the customer', async () => {
    const calls: { actor: string; query: string }[] = [];
    await mailOf(
      container([], calls),
      'owner',
      { addresses: ['zhou@x.example'] },
      'UTC',
      { now: NOW },
    );
    expect(new Set(calls.map((c) => c.actor))).toEqual(new Set(['owner']));
  });
});
