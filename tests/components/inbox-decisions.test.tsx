import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nRuntime } from '@nocobase/i18n';
import { I18nProvider } from '@nocobase/i18n/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import locales from '../../client/locales/index.js';
import { crmZh } from '../../client/locales/crm/index.js';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';

// The AI's suggestions waiting on the reader are a category of the inbox's
// To do view: listed there, counted on To do, chosen into the address and
// decided in the detail pane; the old Waiting on me address leads there.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  can: true,
  wide: true,
  request: vi.fn(),
}));

vi.mock('@nocobase/app-plugin-authentication/client', () => ({
  useAuthentication: () => ({
    session: { user: { id: 'rep' } },
    isPending: false,
  }),
}));
vi.mock(
  '@nocobase/app-plugin-authorization/client',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@nocobase/app-plugin-authorization/client')
    >()),
    useCan: () => ({ can: state.can }),
  }),
);
vi.mock('@nocobase/app-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nocobase/app-client')>();
  const client = { request: state.request };
  const realtime = { subscribe: () => vi.fn(), onOpen: () => vi.fn() };
  return {
    ...actual,
    useApiClient: () => client,
    useService: (token: unknown) =>
      token === actual.realtimeClientToken ? realtime : client,
  };
});
vi.mock('../../client/components/crm/lead-evaluation.js', () => ({
  VerdictBadge: () => null,
  VerdictPanel: ({ entry }: { entry: { id: string } }) => (
    <p>panel {entry.id}</p>
  ),
}));
vi.mock('../../client/components/crm/approval-review.js', () => ({
  ReviewPanel: ({ entry }: { entry: { id: string } }) => (
    <p>review {entry.id}</p>
  ),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    userId: 'rep',
    assistant: true,
    settings: { ...defaultSettings, timeZone: 'Asia/Shanghai' },
    definitions,
    users: [{ id: 'rep', name: '赵敏', roles: [], disabled: false }],
    permissions: { leads: { update: { fields: '*', all: false } } },
  };
  return {
    ...actual,
    useCrmApi: () => state.api,
    useRefresh: () => () => Promise.resolve(),
    useCrmScopeKey: () => ['crm', 'rep', 'zh-CN'],
    useMetadata: () => ({ data: metadata }),
    useCrmText: () => ({
      text: (key: string): string => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            crmZh,
          );
        return typeof value === 'string' ? value : key;
      },
      language: 'zh-CN',
    }),
  };
});

const { default: InboxPage } = await import('../../client/pages/inbox.js');
const { default: DecisionsRedirect } =
  await import('../../client/pages/crm-decisions.js');

function Where(): ReactElement {
  const location = useLocation();
  return (
    <output data-testid='where'>{location.pathname + location.search}</output>
  );
}

const entry = (id: string, name: string, status = 'pending') => ({
  id,
  entity: 'leads',
  status,
  createdAt: '2026-10-03T05:00:00.000Z',
  lead: {
    id: `lead-${id}`,
    name,
    company: null,
    ownerId: 'rep',
    status: 'working',
  },
  ai: { result: { recommendation: 'follow', summary: `${name} 的建议` } },
});

let runtime: I18nRuntime;
beforeEach(async () => {
  state.can = true;
  state.wide = true;
  state.api.mockReset();
  state.api.mockResolvedValue({
    data: [entry('e1', '周晓'), entry('e2', '林悦', 'accepted')],
    total: 2,
    pending: 1,
  });
  state.request.mockReset();
  state.request.mockImplementation(
    async ({ path }: { readonly path: string }) => {
      if (path.endsWith('/unreadCount')) return { data: { count: 0 } };
      if (path.startsWith('notificationInApp/messages?'))
        return { data: [], meta: {} };
      return { data: {} };
    },
  );
  window.matchMedia = ((query: string) => ({
    matches: state.wide,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  runtime = new I18nRuntime({
    defaultLocale: 'en-US',
    locales: ['en-US', 'zh-CN'],
    applicationNamespace: 'test-app',
  });
  runtime.registerApplicationNamespace('test-app', locales);
  await runtime.init('en-US');
});

function renderAt(path: string): void {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <I18nProvider runtime={runtime}>
          <Routes>
            <Route
              path='/inbox'
              element={
                <>
                  <InboxPage />
                  <Where />
                </>
              }
            />
            <Route path='/crm/decisions' element={<DecisionsRedirect />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("The inbox's AI suggestions", () => {
  it('opens on its tab, first of the two, counts what waits there and opens the first beside the list', async () => {
    renderAt('/inbox');
    expect(await screen.findByText('panel e1')).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent?.replace(/\d+/gu, ''))).toEqual([
      'AI suggestions',
      'Notifications',
    ]);
    expect(tabs[0]!.textContent).toContain('1');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    // Handled ones wait to be asked for; there is no type filter to pick.
    expect(screen.queryByText('林悦')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByTestId('where').textContent).toContain('decision=e1');
  });

  it('shows and hides the handled ones from the list, and puts a pick in the address', async () => {
    renderAt('/inbox');
    await userEvent.click(await screen.findByText('查看已处理的建议'));
    await userEvent.click(await screen.findByText('林悦'));
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toContain('decision=e2'),
    );
    expect(screen.getByText('panel e2')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '收起' }));
    // The list lets it go; the detail keeps the one being read.
    expect(screen.getByText('查看已处理的建议')).toBeTruthy();
    expect(screen.getAllByText('林悦')).toHaveLength(1);
  });

  it('opens nothing by itself on a narrow screen', async () => {
    state.wide = false;
    renderAt('/inbox?view=todo');
    expect(await screen.findByText('周晓')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/inbox?view=todo');
  });

  // An approval's review handled says what became of it, as a lead's does:
  // here the applicant withdrew the approval, which voided the review.
  it("says an approval's review was withdrawn", async () => {
    state.api.mockResolvedValue({
      data: [
        entry('e1', '周晓'),
        {
          id: 'r1',
          entity: 'approvals',
          status: 'superseded',
          createdAt: '2026-10-03T05:00:00.000Z',
          approval: {
            id: 'ap-1',
            name: '源码交付条款',
            topic: 'contractTerms',
            status: 'withdrawn',
            ownerId: 'rep',
            opportunityId: 'opp-1',
            opportunity: '老板电器',
          },
          ai: {
            approvalOutcome: 'withdrawn',
            retiredById: 'rep',
            retiredAt: '2026-10-03T06:00:00.000Z',
            result: { recommendation: 'conditional', summary: '改为源码托管' },
          },
        },
      ],
      total: 2,
      pending: 1,
    });
    renderAt('/inbox?view=todo&kind=crm-decisions');
    const item = (await screen.findByText('源码交付条款')).closest('button')!;
    expect(item.textContent).toContain('已撤回');
    expect(within(item).getByText(/建议有条件批准/u)).toBeTruthy();
  });

  it('is notifications alone without the page grant', async () => {
    state.can = false;
    renderAt('/inbox?view=todo');
    expect(await screen.findByText(/Nothing here/u)).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(state.api).not.toHaveBeenCalled();
  });

  it("opens Waiting on me's old address in the inbox", async () => {
    renderAt('/crm/decisions?entry=e2');
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe(
        '/inbox?view=todo&kind=crm-decisions&decision=e2',
      ),
    );
    expect(await screen.findByText('panel e2')).toBeTruthy();
  });
});
