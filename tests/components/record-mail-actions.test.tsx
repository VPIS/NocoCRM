import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A record's Mail tab acting on a conversation's message: read or unread,
// and deleted, which moves it to the mailbox's trash where the provider can
// move messages. The message the API returns replaces the one shown.

const state = vi.hoisted(() => ({
  updateMessage: vi.fn(),
  deleteMessage: vi.fn(),
  movable: true,
}));
const message = {
  id: 'm1',
  accountId: 'acc-1',
  conversationId: 'c1',
  subject: 'Quote',
  read: true,
  starred: false,
  receivedAt: '2026-10-09T01:00:00.000Z',
};

// Only the reader's own mail here: no colleagues' conversations.
vi.mock('../../client/components/crm/colleagues-mail.js', () => ({
  useColleaguesMail: () => undefined,
}));
vi.mock('@nocobase/app-plugin-mail/client', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@nocobase/app-plugin-mail/client')
  >()),
  useMailClient: () => ({
    listConversationMessages: async () => ({ items: [message] }),
    updateMessage: state.updateMessage,
    deleteMessage: state.deleteMessage,
  }),
}));
// The plugin's conversation view, reduced to its actions on each message.
vi.mock('@nocobase/app-plugin-mail/client/components', () => ({
  MailConversationView: ({
    messages,
    actions,
  }: {
    messages: (typeof message)[];
    actions?: {
      toggleRead: (m: typeof message) => void;
      delete: (m: typeof message) => void;
      canDelete?: (m: typeof message) => boolean;
    };
  }) => (
    <ul>
      {messages.map((m) => (
        <li key={m.id}>
          <span>{m.read ? 'read' : 'unread'}</span>
          <button type='button' onClick={() => actions?.toggleRead(m)}>
            toggle
          </button>
          {actions?.canDelete?.(m) ? (
            <button type='button' onClick={() => actions.delete(m)}>
              delete
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  ),
}));
vi.mock('@nocobase/app-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nocobase/app-client')>()),
  useToaster: () => ({ show: vi.fn() }),
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
    accounts: [{ id: 'acc-1', provider: { type: 'gmail', name: 'gmail' } }],
    providers: [
      { name: 'gmail', capabilities: { moveMessage: state.movable } },
    ],
    senders: [],
    loading: false,
  }),
  useMailComposer: () => ({
    available: true,
    compose: () => undefined,
    composer: null,
  }),
  useRecordMessages: () => ({
    data: [{ key: 'acc-1:c1', latest: message, count: 1, unread: false }],
    isLoading: false,
    error: null,
  }),
  useMailSent: () => () => undefined,
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({ text: (key: string) => key }),
  useMetadata: () => ({ data: { settings: { timeZone: 'UTC' } } }),
}));

const { RecordMailPanel } =
  await import('../../client/components/crm/record-mail.js');

beforeEach(() => {
  state.movable = true;
  state.updateMessage.mockReset();
  state.deleteMessage.mockReset();
  state.updateMessage.mockImplementation(async (input: { read?: boolean }) => ({
    ...message,
    read: input.read ?? message.read,
  }));
  state.deleteMessage.mockResolvedValue(undefined);
});
afterEach(cleanup);

function show(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <RecordMailPanel target={{ addresses: ['a@x.example'] }} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("a record's Mail tab, on a message", () => {
  it('marks it unread at once, from what the API returns', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: /Quote/u }));
    expect(await screen.findByText('read')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(state.updateMessage).toHaveBeenCalledWith({
      accountId: 'acc-1',
      messageId: 'm1',
      read: false,
    });
    expect(await screen.findByText('unread')).toBeTruthy();
  });

  it('moves it to the trash, never deleting it outright', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: /Quote/u }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'delete' }),
    );
    expect(state.deleteMessage).toHaveBeenCalledWith('acc-1', 'm1', false);
    await waitFor(() => expect(screen.queryByText('read')).toBeNull());
  });

  it('offers no delete where the provider cannot move messages', async () => {
    state.movable = false;
    show();
    await userEvent.click(screen.getByRole('button', { name: /Quote/u }));
    expect(await screen.findByText('read')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'delete' })).toBeNull();
  });
});
