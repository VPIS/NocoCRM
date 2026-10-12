import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RecordMailPanel,
  type MailScope,
} from '../../client/components/crm/record-mail.js';

// A record's Mail tab: the line naming whose mail it lists, and the empty
// state, for a reader with a connected mailbox; and the record's
// conversations in colleagues' mailboxes, listed after the reader's own.

const colleagues = vi.hoisted(() => ({ list: undefined as unknown }));
vi.mock('../../client/components/crm/colleagues-mail.js', () => ({
  useColleaguesMail: () => colleagues.list,
}));

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
  useMailSent: () => () => undefined,
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

function show(
  addresses: string[],
  more: { domain?: string; scope?: MailScope; record?: boolean } = {},
): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <RecordMailPanel
          target={{ addresses, domain: more.domain }}
          scope={more.scope}
          record={more.record ? { entity: 'leads', id: 'l1' } : undefined}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  colleagues.list = undefined;
});

describe('a record’s Mail tab', () => {
  it("lists the conversations in colleagues' mailboxes, in place of an empty list of the reader's own", () => {
    colleagues.list = [
      {
        key: 'acc:c1',
        subject: 'Re: data migration',
        count: 2,
        lastFrom: 'Zheng Liang',
        owner: 'Chen',
        at: '2026-10-10T03:00:00.000Z',
      },
    ];
    show(['zheng@lead.example'], { record: true });
    expect(screen.getByText(/mail\.inColleagues/)).toBeInTheDocument();
    expect(screen.getByText('Re: data migration')).toBeInTheDocument();
    expect(screen.getByText('Zheng Liang')).toBeInTheDocument();
    expect(screen.getByText(/mail\.mailboxOf/)).toHaveTextContent('Chen');
    // The reader's own mailboxes hold none, but there is mail to show.
    expect(screen.queryByText('mail.empty')).not.toBeInTheDocument();
  });

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

  it('names a company by its name, its contacts and its domain, the addresses on hover', () => {
    show(['xu@zhixing-edu.example', 'jet@gmail.com'], {
      domain: 'zhixing-edu.example',
      scope: { kind: 'company', name: 'Zhixing' },
    });
    const line = screen.getByText(/mail\.scopeCompany/);
    expect(line).toHaveTextContent('"name":"Zhixing"');
    expect(line).toHaveTextContent('mail.scopeContacts {"count":2}');
    expect(line).toHaveTextContent('"domain":"zhixing-edu.example"');
    expect(line).toHaveAttribute(
      'title',
      'xu@zhixing-edu.example, jet@gmail.com, @zhixing-edu.example',
    );
  });

  it("names a deal by its contacts, or its company's while it names none", () => {
    show(['a@x.example', 'b@x.example'], {
      scope: { kind: 'opportunity', fromCompany: false },
    });
    expect(screen.getByText(/mail\.scopeDeal /)).toHaveTextContent(
      '{"count":2}',
    );
    cleanup();
    show(['a@x.example'], {
      scope: { kind: 'opportunity', fromCompany: true },
    });
    expect(screen.getByText(/mail\.scopeDealCompany/)).toHaveTextContent(
      '{"count":1}',
    );
  });
});
