// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type {
  MailProviderAccount,
  MailProviderAdapter,
  MailProviderConfig,
  NormalizedMailMessage,
} from '@nocobase/app-plugin-mail/server';
import { demoContent } from '../../server/providers/crm/demo-content/index.js';
import type { DemoMailTopic } from '../../server/providers/crm/demo-content/types.js';
import {
  DEMO_FOLDERS,
  DEMO_MAIL_SECRET,
  buildDemoMail,
  createDemoMailProvider,
  type DemoConversation,
} from '../../server/providers/crm/demo-mail.js';

// The demo dataset's mail provider: what its conversations look like, who
// may connect a mailbox, and that it serves the import's messages once and
// delivers nothing.

const at = (day: number, hour: number): string =>
  new Date(Date.UTC(2026, 9, 10 + day, hour)).toISOString();

const owner = { address: 'liming@demo.example', name: '李明' };
const customer = { address: 'zhou@acme.example', name: '周晓' };
const colleague = { address: 'wangfang@demo.example', name: '王芳' };

const conversations: DemoConversation[] = [
  {
    topic: 'quotation',
    owner,
    other: customer,
    company: 'Acme',
    deal: 'ERP 二期',
    amount: '¥280,000',
    lastDay: 2,
  },
  {
    topic: 'internal',
    owner,
    other: colleague,
    internal: true,
    deal: 'ERP 二期',
    lastDay: 1,
  },
];

describe('the demo mail', () => {
  const store = buildDemoMail(demoContent('zh-CN'), conversations, at);

  it("fills a topic's thread with the dataset's people, as one conversation in order", () => {
    const thread = store[owner.address].filter(
      (m) => m.providerConversationId === 'demo-0',
    );
    const written = demoContent('zh-CN').mail.quotation.messages;
    expect(thread).toHaveLength(written.length);
    expect(thread[0]?.subject).toBe('ERP 二期 报价方案');
    expect(thread[1]?.subject).toBe('回复：ERP 二期 报价方案');
    expect(thread[0]?.text).toContain('周晓');
    expect(thread[0]?.text).toContain('¥280,000');
    expect(thread[0]?.text).not.toMatch(/\{\{/u);
    // Threaded by its headers, each a day after the one before, the last
    // the conversation's day.
    expect(thread[1]?.inReplyTo).toBe(thread[0]?.internetMessageId);
    expect(thread.at(-1)?.references).toEqual(
      thread.slice(0, -1).map((m) => m.internetMessageId),
    );
    expect(thread.at(-1)?.receivedAt?.slice(0, 10)).toBe('2026-10-08');
    // Filed by who wrote it; the last one received is unread.
    expect(thread[0]?.providerFolderIds).toEqual([DEMO_FOLDERS.sent]);
    expect(thread.at(-1)?.providerFolderIds).toEqual([DEMO_FOLDERS.inbox]);
    expect(thread.at(-1)?.read).toBe(false);
    expect(thread[0]?.preview).toBeTruthy();
  });

  it('puts an exchange between colleagues in both mailboxes', () => {
    const mine = store[owner.address].filter(
      (m) => m.providerConversationId === 'demo-1',
    );
    const theirs = store[colleague.address];
    expect(mine).toHaveLength(theirs.length);
    expect(theirs[0]?.providerFolderIds).toEqual([DEMO_FOLDERS.sent]);
    expect(mine[0]?.providerFolderIds).toEqual([DEMO_FOLDERS.inbox]);
  });

  it('returns a message to an address that does not exist from the delivery system', () => {
    const content = demoContent('zh-CN');
    const [sent, bounced] = buildDemoMail(
      content,
      [
        {
          topic: 'bounce',
          owner,
          other: customer,
          company: 'Acme',
          lastDay: 3,
        },
      ],
      at,
    )[owner.address];
    expect(bounced?.from).toEqual(content.mailSenders.postmaster);
    expect(bounced?.to).toEqual([owner]);
    expect(bounced?.subject).toBe(`退信：${sent?.subject ?? ''}`);
    expect(bounced?.text).toContain(customer.address);
  });

  it('writes every topic in both languages with every placeholder filled', () => {
    const zh = demoContent('zh-CN');
    const en = demoContent('en-US');
    expect(Object.keys(en.mail).sort()).toEqual(Object.keys(zh.mail).sort());
    for (const content of [zh, en]) {
      const every = (Object.keys(content.mail) as DemoMailTopic[]).map(
        (topic): DemoConversation => ({
          ...conversations[0],
          topic,
        }),
      );
      for (const message of Object.values(
        buildDemoMail(content, every, at),
      ).flat())
        expect([message.subject, message.text]).not.toContain(
          expect.stringMatching(/\{\{/u),
        );
    }
  });
});

describe('the demo mail provider', () => {
  const messages = store();
  let chinese = false;
  const provider = createDemoMailProvider(
    async (address) => (address === owner.address ? messages : []),
    () => chinese,
  );
  const vault = new Map<string, unknown>();
  const context = {
    publicBasePath: '/main',
    credentials: {
      put: async (value: unknown) => {
        const id = `ref-${String(vault.size)}`;
        vault.set(id, value);
        return id;
      },
      get: async (id: string) => vault.get(id),
      replace: async () => undefined,
      getOrRefresh: async (id: string) => vault.get(id),
      delete: async () => undefined,
    },
  } as never;
  const config = { type: 'crm-demo', name: 'crm-demo' } as MailProviderConfig;
  const account: MailProviderAccount = {
    id: 'a1',
    address: owner.address,
    provider: { type: 'crm-demo', name: 'crm-demo' },
    credentialReference: 'ref-0',
  };
  const adapter = (): Promise<MailProviderAdapter> =>
    provider.createAdapter(context, config, account);

  it('connects only with the demo import’s secret', async () => {
    const refused = await provider.connection?.connect(context, config, {
      address: owner.address,
      username: owner.address,
      password: 'guess',
    });
    expect(refused?.ok).toBe(false);
    const accepted = await provider.connection?.connect(context, config, {
      address: 'LiMing@Demo.example',
      displayName: '李明',
      username: owner.address,
      password: DEMO_MAIL_SECRET,
    });
    expect(accepted).toMatchObject({
      ok: true,
      value: { address: owner.address, credentialReference: 'ref-0' },
    });
  });

  it("serves the mailbox's messages once, in pages, and reports no changes after", async () => {
    const mail = await adapter();
    const folders = await mail.listFolders?.({ limit: 50 });
    expect(folders).toMatchObject({
      ok: true,
      value: {
        completeProviderFolderIds: Object.values(DEMO_FOLDERS),
      },
    });
    const first = await mail.listMessages?.({ limit: 3 });
    expect(first?.ok && first.value.messages).toHaveLength(3);
    const rest =
      first?.ok &&
      (await mail.listMessages?.({
        limit: 50,
        cursor: first.value.nextCursor,
      }));
    expect(
      (first?.ok ? first.value.messages.length : 0) +
        (rest && rest.ok ? rest.value.messages.length : 0),
    ).toBe(messages.length);
    expect(rest && rest.ok && rest.value.nextCursor).toBeUndefined();
    // Only what was received after the date asked for.
    const later = await mail.listMessages?.({
      limit: 50,
      receivedAfter: '2026-10-09T00:00:00Z',
    });
    expect(later?.ok && later.value.messages.length).toBeLessThan(
      messages.length,
    );
    const changes = await mail.listChanges?.({ limit: 50 });
    expect(changes).toMatchObject({
      ok: true,
      value: { messages: [], hasMore: false },
    });
    expect((await mail.getCurrentSyncCursor?.())?.ok).toBe(true);
  });

  it('accepts mail to the demo’s people without delivering it, and refuses anyone else', async () => {
    const mail = await adapter();
    const message = (to: string) =>
      ({
        trackingId: 't',
        identity: { address: owner.address },
        message: { to: [{ address: to }], cc: [], bcc: [], subject: 's' },
      }) as never;
    expect(
      await mail.sendMessage?.(message('zhou@acme.example')),
    ).toMatchObject({
      status: 'accepted',
      providerMessageId: expect.stringMatching(/^demo-sent-/u),
      internetMessageId: expect.stringMatching(/@demo\.example>$/u),
    });
    expect(
      await mail.sendMessage?.(message('buyer@real-customer.com')),
    ).toMatchObject({
      status: 'failed',
      error: { code: 'CRM_DEMO_MAILBOX_DEMO_RECIPIENTS_ONLY' },
    });
  });

  it("names itself in the demo's language", () => {
    chinese = true;
    expect(provider.label).toMatch(/^演示邮箱/u);
    chinese = false;
    expect(provider.label).toMatch(/^Demo mailbox/u);
  });
});

function store(): NormalizedMailMessage[] {
  return buildDemoMail(demoContent('en-US'), conversations, at)[owner.address];
}
