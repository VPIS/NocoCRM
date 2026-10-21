import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';
import { defaultSettings } from '../../server/providers/crm/schema.js';

// The settings page's in-app notification switches: each kind of message
// the CRM sends, on by default, saved by the reminders card's own Save with
// that card's settings alone; and the business guidance page, the shipped
// guidance until an administrator writes over it.

const state = vi.hoisted(() => ({
  api: vi.fn(),
}));

// The demo configuration a read-only demo starts with: no rule yet.
const configuration = vi.hoisted(() => ({
  revision: 0,
  rules: [] as unknown[],
  busy: false,
  capabilities: [
    {
      id: 'crm.aiWork',
      title: 'Ask the AI about a demo record',
      table: 'crm_history',
      operations: ['insert', 'update'],
      scopes: [{ id: 'demo-records', title: 'Demo records' }],
    },
  ],
}));

// The demo mode plugin's hook, as the demo page reads it.
const demo = vi.hoisted(() => ({
  status: {
    available: true,
    present: false,
    state: null,
    mode: 'read-only',
    languages: ['zh-CN', 'en-US'],
    accounts: [],
    accountsByLanguage: {
      'en-US': [
        {
          username: 'daniel',
          name: 'Daniel Brooks',
          role: 'sales-manager',
          password: 'daniel123',
        },
      ],
    },
    importing: null,
    failure: null,
    createdAt: null,
    records: 0,
  } as Record<string, unknown> | null,
  importData: vi.fn(async () => undefined),
  clear: vi.fn(async () => undefined),
}));
vi.mock('@nocobase/app-plugin-demo-mode/client/demo-data', () => ({
  useDemoData: () => ({
    status: demo.status,
    loading: false,
    error: null,
    pending: false,
    refresh: async () => undefined,
    importData: demo.importData,
    clear: demo.clear,
    reset: async () => undefined,
  }),
}));

const lookup = (key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[part]
          : undefined,
      crmEn,
    );

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmQuery: (path: string) => ({
      isLoading: false,
      data:
        path === 'systemSettings'
          ? defaultSettings
          : path === 'demoMode/configuration'
            ? configuration
            : { present: false, createdAt: null, records: 0, accounts: [] },
      refetch: async () => undefined,
    }),
    useCrmApi: () => state.api,
    useCrmScopeKey: () => ['crm'],
    useRefresh: () => async () => undefined,
    useCrmText: () => ({
      text: (key: string): string => {
        const value = lookup(key);
        return typeof value === 'string' ? value : key;
      },
      language: 'en-US',
    }),
  };
});

const { default: SettingsPage } =
  await import('../../client/pages/crm-settings.js');
const { default: GuidancePage } =
  await import('../../client/pages/crm-guidance.js');
const { default: DemoDataPage } =
  await import('../../client/pages/settings/demo-data.js');

describe('the settings page', () => {
  it("switches a kind of in-app message off and saves it with the reminders card's settings", async () => {
    const user = userEvent.setup();
    state.api.mockResolvedValue({ data: {} });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/settings/crm']}>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const approvals = screen.getByRole('switch', {
      name: crmEn.notifications.notifyApprovals,
    });
    for (const name of [
      crmEn.notifications.notifyApprovals,
      crmEn.notifications.notifyRecordChanges,
      crmEn.notifications.notifyTaskReminders,
    ])
      expect(
        screen.getByRole('switch', { name }).getAttribute('aria-checked'),
      ).toBe('true');
    const card = document.getElementById('settings-reminders') as HTMLElement;
    const save = within(card).getByRole('button', { name: crmEn.save });
    // Nothing to save until something on the card changes.
    expect(save).toHaveProperty('disabled', true);
    await user.click(approvals);
    expect(approvals.getAttribute('aria-checked')).toBe('false');
    await user.click(save);
    expect(state.api).toHaveBeenCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({
        notifyApprovals: false,
        notifyRecordChanges: true,
        notifyTaskReminders: true,
      }),
    );
    // The business card's settings are its own Save's.
    expect(state.api.mock.lastCall?.[2]).not.toHaveProperty('currency');
  });

  it("switches the AI ask box at the bottom of pages off with the business card's settings", async () => {
    const user = userEvent.setup();
    state.api.mockResolvedValue({ data: {} });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/settings/crm']}>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const card = document.getElementById('settings-business') as HTMLElement;
    const dock = within(card).getByRole('switch', {
      name: crmEn.fields.assistantDock,
    });
    expect(dock.getAttribute('aria-checked')).toBe('true');
    await user.click(dock);
    await user.click(within(card).getByRole('button', { name: crmEn.save }));
    expect(state.api).toHaveBeenLastCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({ assistantDock: false, currency: 'USD' }),
    );
    expect(state.api.mock.lastCall?.[2]).not.toHaveProperty('notifyApprovals');
  });

  it('shows the shipped business guidance, saves one written over it, and restores the default', async () => {
    const user = userEvent.setup();
    state.api.mockReset();
    state.api.mockResolvedValue({ data: {} });
    render(
      <MemoryRouter initialEntries={['/guidance']}>
        <GuidancePage />
      </MemoryRouter>,
    );
    const box = screen.getByRole('textbox', { name: crmEn.guidance });
    // The shipped guidance, in the AI language (English by default).
    expect((box as HTMLTextAreaElement).value).toContain('Company: NocoBase');
    expect(screen.getByText(crmEn.guidanceShipped)).toBeTruthy();
    const restore = screen.getByRole('button', {
      name: crmEn.guidanceRestore,
    });
    expect(restore).toHaveProperty('disabled', true);
    await user.clear(box);
    await user.type(box, '# Our rules{Enter}- Quote list prices only');
    expect(screen.getByText(crmEn.guidanceCustom)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: crmEn.save }));
    expect(state.api).toHaveBeenLastCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({
        businessGuidance: '# Our rules\n- Quote list prices only',
      }),
    );
    // Back to the shipped one: saved as empty.
    await user.click(restore);
    expect((box as HTMLTextAreaElement).value).toContain('Company: NocoBase');
    await user.click(screen.getByRole('button', { name: crmEn.save }));
    expect(state.api).toHaveBeenLastCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({ businessGuidance: '' }),
    );
  });

  it('imports the demo data through the demo mode plugin in the language chosen, and lets a read-only demo allow asking the AI', async () => {
    const user = userEvent.setup();
    state.api.mockReset();
    state.api.mockImplementation(
      (_path: string, _method: string, input: { value: unknown[] }) =>
        Promise.resolve({
          data: { ...configuration, revision: 1, rules: input.value },
        }),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/settings/demo-data']}>
          <DemoDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('daniel')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: crmEn.demoImport }));
    await user.click(screen.getByRole('button', { name: crmEn.confirm }));
    expect(demo.importData).toHaveBeenCalledWith('en-US');
    await user.click(await screen.findByRole('checkbox'));
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'demoMode/configuration/writeRules',
        'PUT',
        {
          expectedRevision: 0,
          value: ['insert', 'update'].map((operation) => ({
            capability: 'crm.aiWork',
            operation,
            scope: 'demo-records',
          })),
        },
      ),
    );
  });

  it('says demo data needs a demo deployment', () => {
    demo.status = { ...demo.status!, mode: 'off' };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/settings/demo-data']}>
          <DemoDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(crmEn.demoUnavailable)).toBeTruthy();
    expect(screen.queryByRole('button', { name: crmEn.demoImport })).toBeNull();
  });
});

describe('the General settings tab', () => {
  it('no longer carries the demo dataset, which has a tab of its own', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/settings/crm']}>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('button', { name: crmEn.demoImport })).toBeNull();
  });
});
