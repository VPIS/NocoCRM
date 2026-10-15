import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// A company's Signals tab (client/components/crm/company-signals.tsx): its
// signals with their sources, the daily-check switch, checking now, and
// marking a signal seen or dismissing it, for whoever may edit the company.
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
const { CompanySignals } =
  await import('../../client/components/crm/company-signals.js');
const signal = {
  id: 's1',
  type: 'funding',
  title: 'Acme raised a Series B.',
  summary: 'Led by Example Capital.',
  occurredOn: '2026-10-02',
  sources: [{ title: 'Acme B', url: 'https://n.example.cn/b', site: 'News' }],
  status: 'new',
  createdAt: '2026-10-03T01:30:00.000Z',
};
const page = (): ReactElement => (
  <QueryClientProvider client={new QueryClient()}>
    <CompanySignals companyId='c1' />
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
    signals: [
      signal,
      { ...signal, id: 's2', title: 'Old news', status: 'dismissed' },
    ],
  };
});

it('lists the signals with their sources, and lets an editor decide, watch and check', async () => {
  state.api.mockResolvedValue({ data: { found: [signal] } });
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
  // A dismissed one is listed last, without its buttons.
  expect(screen.getByText('Dismissed')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Seen' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Seen' }));
  await waitFor(() =>
    expect(state.api).toHaveBeenCalledWith('signals/s1', 'PATCH', {
      status: 'seen',
    }),
  );
  fireEvent.click(
    screen.getByLabelText('Watch', { selector: '[aria-label="Watch"]' }),
  );
  await waitFor(() =>
    expect(state.api).toHaveBeenCalledWith(
      'companies/c1/signals/watch',
      'PUT',
      {
        watched: true,
      },
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
  expect(
    screen.getByText(
      'Checking on the web needs the Qwen model service (DASHSCOPE_API_KEY).',
    ),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Check now' })).toBeNull();
  expect(screen.queryByLabelText('Watch')).toBeNull();
  expect(screen.getByText(/No signals yet/)).toBeTruthy();
});
