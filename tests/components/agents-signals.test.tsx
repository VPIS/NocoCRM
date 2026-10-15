import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// The Auto follow-up page's Company signals tab (client/pages/crm-agents.tsx):
// its checks as its runs, the signals' seen, dismissed and new as its
// outcomes, and each check opening its company.
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
const overview = {
  agent: 'signals',
  switches: { enabled: true, triggers: { daily: true } },
  triggers: ['daily'],
  week: {
    runs: 3,
    accepted: 1,
    dismissed: 1,
    pending: 2,
    failed: 0,
    acceptance: 0.5,
  },
  month: {
    runs: 3,
    accepted: 1,
    dismissed: 1,
    pending: 2,
    failed: 0,
    acceptance: 0.5,
  },
  total: 1,
  page: 1,
  pageSize: 20,
  runs: [
    {
      id: 'k1',
      recordId: 'c1',
      name: 'Shanghai Electric',
      ownerId: 'rep',
      createdAt: new Date().toISOString(),
      trigger: 'daily',
      status: 'found',
      recommendation: null,
      grade: null,
      summary: 'Shanghai Electric names a new CIO.',
    },
  ],
};
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({ text: english, language: 'en-US' }),
  useCrmQuery: () => ({ data: overview, isFetching: false }),
  useCrmApi: () => vi.fn(),
  useRefresh: () => async () => {},
  useMetadata: () => ({
    data: {
      settingsAccess: true,
      settings: { timeZone: 'Asia/Shanghai' },
      methodSkills: {},
      agents: { signals: { enabled: true, triggers: { daily: true } } },
    },
  }),
}));
vi.mock('../../client/components/crm/waiting-count.js', () => ({
  useRunningAgents: () => ({}),
}));
vi.mock('@nocobase/app-plugin-authorization/client', () => ({
  useCan: () => ({ can: false }),
}));
vi.mock('../../client/components/crm/common.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/common.js')
  >()),
  CrmFrame: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  RecordLink: ({
    entity,
    record,
  }: {
    entity: string;
    record: { id: string; name: string };
  }) => <a href={`/crm/${entity}/${record.id}`}>{record.name}</a>,
}));
const { default: AgentsPage } =
  await import('../../client/pages/crm-agents.js');

it('shows the company signals as an agent: its checks, the signals read, and each check opening its company', () => {
  render(
    <MemoryRouter initialEntries={['/crm/agents/signals']}>
      <AgentsPage />
    </MemoryRouter>,
  );
  expect(screen.getAllByText('Company signals').length).toBeGreaterThan(0);
  expect(screen.getByText(/09:30 in the business time zone/)).toBeTruthy();
  // The signals' own names for the figures.
  for (const label of ['Checks', 'Seen', 'New signals', 'Seen rate'])
    expect(screen.getByText(label)).toBeTruthy();
  expect(screen.getByText('50%')).toBeTruthy();
  // A check's outcomes to filter by, and the check opening its company.
  for (const label of ['Found news', 'Nothing new'])
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  expect(
    (
      screen.getByText('Shanghai Electric').closest('a') as HTMLAnchorElement
    ).getAttribute('href'),
  ).toBe('/crm/companies/c1');
  expect(screen.getByText('Shanghai Electric names a new CIO.')).toBeTruthy();
});
