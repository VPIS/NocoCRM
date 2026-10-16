import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// A company's signals (client/components/crm/company-signals.tsx): the
// whole list with their sources, marking a signal seen or dismissing it;
// and, under the company's title, the chip that checks now and the Watch
// button, for whoever may edit the company.
function english(key: string, options?: Record<string, unknown>): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  if (typeof value !== 'string')
    return typeof options?.defaultValue === 'string'
      ? options.defaultValue
      : key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(options?.[name] ?? ''),
  );
}
const state = vi.hoisted(() => ({
  api: vi.fn(),
  data: {} as Record<string, unknown>,
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({ text: english, language: 'en-US' }),
  useCrmQuery: () => ({ isLoading: false, data: state.data }),
  useCrmApi: () => state.api,
  useCrmScopeKey: () => ['crm'],
  useMetadata: () => ({ data: { settings: { timeZone: 'Asia/Shanghai' } } }),
}));
const { CompanySignals, SignalsStatus, WatchButton } =
  await import('../../client/components/crm/company-signals.js');
const signal = {
  id: 's1',
  type: 'funding',
  title: 'Acme raised a Series B.',
  summary: 'Led by Example Capital.',
  occurredOn: '2026-10-02',
  sources: [{ title: 'Acme B', url: 'https://n.example.cn/b', site: 'News' }],
  status: 'new',
  // Found yesterday: new for a week.
  createdAt: new Date(Date.now() - 86_400_000).toISOString(),
};
const page = (): ReactElement => (
  <QueryClientProvider client={new QueryClient()}>
    <CompanySignals companyId='c1' />
  </QueryClientProvider>
);
const heading = (): ReactElement => (
  <QueryClientProvider client={new QueryClient()}>
    <SignalsStatus companyId='c1' companyName='Acme' />
    <WatchButton companyId='c1' />
  </QueryClientProvider>
);
beforeEach(() => {
  state.api.mockReset();
  state.data = {
    available: true,
    watched: false,
    inDailyCheck: true,
    checkedAt: '2026-10-14T01:30:00.000Z',
    canEdit: true,
    total: 2,
    open: 1,
    fresh: 1,
    page: 1,
    pageSize: 20,
    signals: [
      signal,
      { ...signal, id: 's2', title: 'Old news', status: 'dismissed' },
    ],
  };
});

it('lists the signals with their sources, and lets an editor decide', async () => {
  state.api.mockResolvedValue({});
  render(page());
  expect(screen.getByText('Acme raised a Series B.')).toBeTruthy();
  expect(screen.getAllByText('Funding')).toHaveLength(2);
  expect(
    (screen.getAllByText('News')[0]!.closest('a') as HTMLAnchorElement).href,
  ).toBe('https://n.example.cn/b');
  expect(
    screen.getByText(
      'Checked on the web every week while it has an open deal. Last checked 2026-10-14 09:30.',
    ),
  ).toBeTruthy();
  // A dismissed one is listed last; dismissing is the one decision, which
  // can be undone, and nothing is marked seen.
  expect(screen.getByText('Dismissed')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Seen' })).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(1);
  // A dismissed one can be restored.
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
  await waitFor(() =>
    expect(state.api).toHaveBeenCalledWith('signals/s2', 'PATCH', {
      status: 'new',
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  await waitFor(() =>
    expect(state.api).toHaveBeenCalledWith('signals/s1', 'PATCH', {
      status: 'dismissed',
    }),
  );
  // Checked now from the list too; its Watch is under the company's title.
  expect(screen.queryByRole('button', { name: 'Watch' })).toBeNull();
  state.api.mockResolvedValue({ data: { found: [] } });
  fireEvent.click(screen.getByRole('button', { name: 'Check now' }));
  await waitFor(() =>
    expect(screen.getByText('Nothing new found.')).toBeTruthy(),
  );
});

it("checks now from the chip under the company's title, which counts the new ones, and watches it", async () => {
  state.api.mockResolvedValue({ data: { found: [signal] } });
  // The chip counts the new ones as the server does, whatever the page.
  state.data = { ...state.data, fresh: 1, total: 9, open: 7 };
  render(heading());
  expect(screen.getByText('1 new')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Watch' }));
  await waitFor(() =>
    expect(state.api).toHaveBeenCalledWith(
      'companies/c1/signals/watch',
      'PUT',
      { watched: true },
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Check now' }));
  await waitFor(() =>
    expect(screen.getByText('New signals found: 1.')).toBeTruthy(),
  );
  expect(state.api).toHaveBeenCalledWith('companies/c1/signals/check', 'POST');
});

it('says when nothing can search, and offers no changes to a reader', () => {
  state.data = { ...state.data, available: false, canEdit: false, signals: [] };
  render(page());
  render(heading());
  expect(
    screen.getByText(
      'Checking on the web needs a model service, set up on Agent team → Models.',
    ),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Check now' })).toBeNull();
  expect(screen.queryByLabelText('Watch')).toBeNull();
  expect(screen.getByText(/No signals yet/)).toBeTruthy();
});

it('loads the next page as the list reaches its end', async () => {
  state.data = { ...state.data, total: 3 };
  state.api.mockResolvedValue({
    data: {
      ...state.data,
      page: 2,
      signals: [{ ...signal, id: 's3', title: 'Older news' }],
    },
  });
  render(page());
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  await waitFor(() => expect(screen.getByText('Older news')).toBeTruthy());
  expect(state.api).toHaveBeenCalledWith(
    'companies/c1/signals?page=2&pageSize=20',
  );
  // All three loaded: nothing more to load.
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
});
