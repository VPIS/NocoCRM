// @vitest-environment node
import { randomBytes, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '@nocobase/app-testing/server';
import {
  signIn,
  type TestSession,
} from '@nocobase/app-plugin-authentication/testing';
import { authorizationToken } from '@nocobase/app-plugin-authorization/server';
import {
  demoDataToken,
  demoConfigurationToken,
  type DemoDataService,
} from '@nocobase/app-plugin-demo-mode/server/tokens';
import { createStandaloneServer } from '../../server/standalone.js';
import { crmToken } from '../../server/providers/crm/index.js';
import { crmActor } from '../../server/providers/crm/authorization.js';
import { demoAccountsIn } from '../../server/providers/crm/demo.js';

// The CRM's demo dataset on the demo mode plugin, in a running application:
// imported through /api/demoMode/data in both languages, its accounts
// signing in, clearing taking back only what it made, a failed import
// rolled back, the CRM's AI answered by the demo model, and a read-only
// demo refusing writes except the one an administrator allows.

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const ADMIN = {
  username: 'demoadmin',
  email: 'demoadmin@example.com',
  password: 'demoadmin123',
};
const json = { 'Content-Type': 'application/json', origin: 'http://localhost' };
const post = (body: object = {}) => ({
  method: 'POST',
  headers: json,
  body: JSON.stringify(body),
});

const start = (mode: 'observe' | 'read-only') =>
  createTestApp({
    createServer: createStandaloneServer,
    env: {
      ...process.env,
      NOCOBASE_TEST_DB_SQLITE_DIRECTORY: path.join(
        tmpdir(),
        `nococrm-demo-data-${randomUUID()}`,
      ),
    },
    server: {
      env: { DB_FILENAME: undefined, APP_PUBLIC_ORIGIN: 'http://localhost' },
    },
    config: {
      app: { publicOrigin: 'http://localhost' },
      users: { initialAdmin: { ...ADMIN, name: 'Demo data admin' } },
      secrets: { keys: [{ version: 1, key: randomBytes(32).toString('hex') }] },
      agents: { vectors: { store: false } },
      demoMode: { mode },
    },
  });

// Asks an AI card for a record and waits for its answer.
async function askAi(
  session: TestSession,
  route: string,
  latest: string,
): Promise<{ status: string; ai: { result?: Record<string, unknown> } }> {
  const asked = await session.fetch(route, post());
  expect(asked.status).toBe(201);
  for (let tries = 0; tries < 60; tries += 1) {
    const entry = (
      (await (await session.fetch(latest)).json()) as {
        data: { status: string; ai: { result?: Record<string, unknown> } };
      }
    ).data;
    if (entry.status !== 'running') return entry;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${route} did not finish`);
}

describe('the demo dataset on the demo mode plugin', () => {
  let app: TestApp;
  let demo: DemoDataService;
  let admin: TestSession;
  beforeAll(async () => {
    app = await start('observe');
    demo = app.application.container.resolve(demoDataToken);
    admin = await signIn(app, ADMIN);
  });
  afterAll(() => app?.close());

  const crm = () => app.application.container.resolve(crmToken);
  const adminActor = () =>
    crmActor(app.application.container.resolve(authorizationToken), {
      id: admin.user.id,
      locale: 'en-US',
    });
  const companies = async (): Promise<string[]> =>
    (
      await app.connection.query
        .selectFrom('crmCompanies')
        .select('name')
        .execute<{ name: string }>()
    ).map((row) => row.name);

  it('is managed only by administrators', async () => {
    expect((await app.request('/demoMode/data')).status).toBe(401);
    const status = await (await admin.fetch('/demoMode/data')).json();
    expect(status.data).toMatchObject({
      available: true,
      datasetId: 'crm',
      languages: ['zh-CN', 'en-US'],
      present: false,
      mode: 'observe',
    });
  });

  it('imports in Chinese, signs its accounts in, answers the CRM’s AI from the demo model and clears all business data', async () => {
    // A company of the CRM's own, which the demo must leave alone, owned
    // by the administrator as a sales manager.
    await app.application.container
      .resolve(authorizationToken)
      .permissionSets.assign({
        permissionSet: 'crm-sales-manager',
        subject: { type: 'user', id: admin.user.id },
      });
    await crm().save(adminActor(), 'companies', {
      name: 'Kept Company',
      status: 'prospect',
    });
    expect(
      (await admin.fetch('/demoMode/data/import', post({ language: 'zh-CN' })))
        .status,
    ).toBe(200);
    await demo.whenIdle();
    const status = await demo.status();
    expect(status).toMatchObject({
      present: true,
      state: 'ready',
      language: 'zh-CN',
      failure: null,
      model: { enabled: true },
      counts: { accounts: 4, companies: 11 },
    });
    expect(status.records).toBeGreaterThan(200);
    // The business settings still at their defaults are the dataset's now.
    expect(await crm().settings()).toMatchObject({
      currency: 'CNY',
      timeZone: 'Asia/Shanghai',
      aiLanguage: 'zh-CN',
    });

    const [manager] = demoAccountsIn('zh-CN');
    const seller = await signIn(app, {
      username: manager!.username,
      password: `${manager!.username}123`,
    });
    expect((await seller.fetch('/workspace')).status).toBe(200);
    const deals = (
      (await (await seller.fetch('/opportunities?pageSize=50')).json()) as {
        data: { id: string; ownerId: string; stage: string }[];
      }
    ).data;
    expect(deals.length).toBeGreaterThan(10);
    // A demo account manages no demo data.
    expect((await seller.fetch('/demoMode/data/clear', post())).status).toBe(
      403,
    );

    // A business operation, answered in process by the demo model with the
    // card its parser reads.
    const deal = deals.find(
      (d) => d.ownerId === seller.user.id && !['won', 'lost'].includes(d.stage),
    )!;
    const followUp = await askAi(
      seller,
      `/opportunities/${deal.id}/evaluate`,
      `/opportunities/${deal.id}/evaluations/latest`,
    );
    expect(followUp.status).toBe('pending');
    expect(String(followUp.ai.result?.summary)).toContain('演示模型');

    // The CRM's own agents answer from the demo model alone meanwhile.
    const service = (await demo.status()).model.service!;
    const agentModels = async () =>
      (
        await app.connection.query
          .selectFrom('agAgents')
          .select('modelEntries')
          .execute<{ modelEntries: unknown }>()
      ).map((row) => JSON.stringify(row.modelEntries));
    expect(await agentModels()).not.toHaveLength(0);
    for (const entries of await agentModels())
      expect(entries).toContain(service);
    expect((await admin.fetch('/demoMode/data/clear', post())).status).toBe(
      200,
    );
    expect(await demo.status()).toMatchObject({ present: false, state: null });
    // And get their models back.
    for (const entries of await agentModels())
      expect(entries).toContain(service);
    expect(await companies()).toEqual([]);
    for (const table of ['crmLeads', 'crmOpportunities', 'crmApprovals'])
      expect(
        await app.connection.query.selectFrom(table).select('id').execute(),
      ).toEqual([]);
    expect(
      await app.connection.query
        .selectFrom('agConversations')
        .select('id')
        .where('userId', '=', admin.user.id)
        .execute(),
    ).toEqual([]);
    // Its accounts no longer sign in, and the settings are back.
    await expect(
      signIn(app, {
        username: manager!.username,
        password: `${manager!.username}123`,
      }),
    ).rejects.toThrow();
    expect(await crm().settings()).toMatchObject({
      currency: 'CNY',
      timeZone: 'Asia/Shanghai',
      aiLanguage: 'zh-CN',
    });
  });

  it('takes a failed import back, then imports in English with the same accounts enabled again', async () => {
    const service = crm();
    const original = service.addComment.bind(service);
    service.addComment = () => Promise.reject(new Error('boom'));
    try {
      expect(
        (
          await admin.fetch(
            '/demoMode/data/import',
            post({ language: 'zh-CN' }),
          )
        ).status,
      ).toBe(200);
      await demo.whenIdle();
    } finally {
      service.addComment = original;
    }
    expect(await demo.status()).toMatchObject({
      present: false,
      state: 'failed',
      failure: { message: 'boom' },
    });
    expect(await companies()).toEqual([]);
    expect(await crm().settings()).toMatchObject({
      currency: 'CNY',
    });

    expect(
      (await admin.fetch('/demoMode/data/import', post({ language: 'en-US' })))
        .status,
    ).toBe(200);
    await demo.whenIdle();
    expect(await demo.status()).toMatchObject({
      present: true,
      language: 'en-US',
      accounts: demoAccountsIn('en-US').map(({ username }) =>
        expect.objectContaining({ username }),
      ),
    });
    expect(await companies()).not.toContain('Kept Company');
    const [manager] = demoAccountsIn('en-US');
    const seller = await signIn(app, {
      username: manager!.username,
      password: `${manager!.username}123`,
    });
    expect((await seller.fetch('/workspace')).status).toBe(200);
    // The CRM's own agents answer from the demo model while it is there.
    const configuration = app.application.container.resolve(
      demoConfigurationToken,
    );
    await configuration.save('chat', (await configuration.read()).revision, {
      enabled: true,
      model: null,
      tools: { 'crm.read': 'read' },
    });
    const assistant = (
      (await (
        await seller.fetch(
          '/agents/conversations/start',
          post({
            source: 'crm',
            text: 'How is this week going?',
          }),
        )
      ).json()) as {
        data: { conversation: { model: { modelService: string } } };
      }
    ).data;
    expect(assistant.conversation.model.modelService).toBe(
      demo.models.serviceName,
    );
    expect((await admin.fetch('/demoMode/data/clear', post())).status).toBe(
      200,
    );
    expect(await companies()).toEqual([]);
  });
});

describe('a read-only demo', () => {
  let app: TestApp;
  let demo: DemoDataService;
  let admin: TestSession;
  beforeAll(async () => {
    app = await start('read-only');
    demo = app.application.container.resolve(demoDataToken);
    admin = await signIn(app, ADMIN);
  });
  afterAll(() => app?.close());

  it('allows online chat without opening unrelated writes and observes revocation', async () => {
    await app.application.container
      .resolve(authorizationToken)
      .permissionSets.assign({
        permissionSet: 'crm-sales-manager',
        subject: { type: 'user', id: admin.user.id },
      });
    const configuration = app.application.container.resolve(
      demoConfigurationToken,
    );
    const request = () =>
      admin.fetch(
        '/agents/conversations/start',
        post({ source: 'crm', text: 'Hello' }),
      );
    expect((await request()).status).toBe(400);
    await configuration.save('chat', (await configuration.read()).revision, {
      enabled: true,
      model: null,
      tools: {},
    });
    const started = await request();
    const payload = await started.json();
    expect(started.status).toBe(200);
    expect(payload.data.conversation.mode).toBe('online');
    // Direct business mutations are still guarded, even after a successful chat request.
    const denied = await admin.fetch(
      '/leads',
      post({ name: 'Must not exist', source: 'website' }),
    );
    expect(denied.status).toBe(400);
    expect(await denied.json()).toMatchObject({
      error: { reason: 'DEMO_READ_ONLY' },
    });
    await configuration.save('chat', (await configuration.read()).revision, {
      enabled: false,
      model: null,
      tools: {},
    });
    expect((await request()).status).toBe(400);
  });

  it('refuses visitors’ writes, except asking the AI about a demo record once an administrator allows it', async () => {
    const crm = app.application.container.resolve(crmToken);
    const authz = app.application.container.resolve(authorizationToken);
    // A lead of the CRM's own, made outside a request.
    await authz.permissionSets.assign({
      permissionSet: 'crm-sales-manager',
      subject: { type: 'user', id: admin.user.id },
    });
    const own = await crm.save(
      crmActor(authz, { id: admin.user.id, locale: 'en-US' }),
      'leads',
      { name: 'Own lead', source: 'website', status: 'new' },
    );
    expect(
      (await admin.fetch('/demoMode/data/import', post({ language: 'en-US' })))
        .status,
    ).toBe(200);
    await demo.whenIdle();
    expect(await demo.status()).toMatchObject({
      present: true,
      mode: 'read-only',
    });
    const [manager] = demoAccountsIn('en-US');
    const seller = await signIn(app, {
      username: manager!.username,
      password: `${manager!.username}123`,
    });
    // Browsing works; the workspace's best-effort write is swallowed.
    expect((await seller.fetch('/workspace')).status).toBe(200);
    const created = await seller.fetch(
      '/leads',
      post({ name: 'Visitor lead', source: 'website' }),
    );
    expect(created.status).toBe(400);
    expect(await created.json()).toMatchObject({
      error: { reason: 'DEMO_READ_ONLY' },
    });
    const leads = (
      (await (await seller.fetch('/leads?pageSize=50')).json()) as {
        data: { id: string; ownerId: string; status: string }[];
      }
    ).data;
    const lead = leads.find(
      (l) =>
        l.ownerId === seller.user.id && ['new', 'working'].includes(l.status),
    )!;
    const ask = (id: string) => seller.fetch(`/leads/${id}/evaluate`, post());
    const refused = await ask(lead.id);
    expect(refused.status).toBe(400);
    expect(await refused.json()).toMatchObject({
      error: { reason: 'DEMO_READ_ONLY' },
    });

    const configuration = (
      (await (await admin.fetch('/demoMode/configuration')).json()) as {
        data: { revision: number; rules: unknown[] };
      }
    ).data;
    expect(configuration.rules).toEqual([]);
    expect(
      (
        await admin.fetch('/demoMode/configuration/writeRules', {
          method: 'PUT',
          headers: json,
          body: JSON.stringify({
            expectedRevision: configuration.revision,
            value: ['insert', 'update'].map((operation) => ({
              capability: 'crm.aiWork',
              operation,
              scope: 'demo-records',
            })),
          }),
        })
      ).status,
    ).toBe(200);
    const followUp = await askAi(
      seller,
      `/leads/${lead.id}/evaluate`,
      `/leads/${lead.id}/evaluations/latest`,
    );
    expect(followUp.ai.result).toMatchObject({ recommendation: 'follow' });
    // Not a demo record: out of the rule's scope.
    const outside = await admin.fetch(`/leads/${own.id}/evaluate`, post());
    expect(outside.status).toBe(400);
    expect(await outside.json()).toMatchObject({
      error: { reason: 'DEMO_SCOPE_DENIED' },
    });

    // The lifecycle stays the administrator's, read-only or not.
    expect((await admin.fetch('/demoMode/data/clear', post())).status).toBe(
      200,
    );
    expect(await demo.status()).toMatchObject({ present: false });
  });
});
