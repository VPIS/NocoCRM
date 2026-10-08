import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordMailPanel } from '../../client/components/crm/record-mail.js';

// A record's Mail tab: the line naming whose mail it lists, and the empty
// state, for a reader with a connected mailbox.

vi.mock('@nocobase/app-plugin-mail/client', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@nocobase/app-plugin-mail/client')
  >()),
  useMailClient: () => ({}),
}));
vi.mock('@nocobase/i18n/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nocobase/i18n/client')>()),
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? '',
  }),
}));
vi.mock('../../client/components/crm/mail.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/mail.js')
  >()),
  useMailSetup: () => ({
    can: true,
    accounts: [{ id: 'acc-1' }],
    providers: [],
    senders: [],
    loading: false,
  }),
  useMailComposer: () => ({
    available: true,
    compose: () => undefined,
    composer: null,
  }),
  useRecordMessages: () => ({ data: [], isLoading: false, error: null }),
  useLogSentMail: () => () => undefined,
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({
    text: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
  useMetadata: () => ({ data: { settings: { timeZone: 'UTC' } } }),
}));

function show(addresses: string[]): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <RecordMailPanel target={{ addresses }} link={{ leadId: 'l1' }} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

describe('a record’s Mail tab', () => {
  it('names the addresses it looks for', () => {
    show(['zhang@wg.example']);
    expect(screen.getByText(/mail\.scope/)).toHaveTextContent(
      'zhang@wg.example',
    );
    expect(screen.getByText('mail.empty')).toBeInTheDocument();
  });

  it('names nobody when the record has no address, and says so once', () => {
    show([]);
    expect(screen.queryByText(/mail\.scope/)).not.toBeInTheDocument();
    expect(screen.getByText('mail.noAddress')).toBeInTheDocument();
    expect(screen.getByText('mail.write')).toBeInTheDocument();
  });
});
