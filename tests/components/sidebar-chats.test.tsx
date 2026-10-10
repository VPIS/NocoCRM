import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '../../client/components/ui/sidebar.js';
import { crmEn } from '../../client/locales/crm/index.js';

// The user's conversations with the assistant under the menu: which are listed and
// how, what a row and "New conversation" ask of the panel, and archiving one.

function english(key: string, options: Record<string, unknown> = {}): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  const textValue = typeof value === 'string' ? value : key;
  return textValue.replace(/\{\{(\w+)\}\}/gu, (_, name: string) =>
    String(options[name] ?? ''),
  );
}

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmText: () => ({ text: english, language: 'en-US' }),
  };
});
// The assistant on the Agents plugin (tests/setup/agent-chat-fake).
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) =>
  (await import('../setup/agent-chat-fake.js')).fakeChatModule(
    await importOriginal(),
  ),
);
const { chatFake } = await import('../setup/agent-chat-fake.js');

const { SidebarChats } =
  await import('../../client/layouts/components/sidebar-chats.js');

const row = (
  id: string,
  values: { title?: string | null; read?: boolean } = {},
) => ({
  id,
  title: `Conversation ${id}`,
  read: true,
  ...values,
});

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SidebarProvider>{children}</SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const renderChats = () => render(<SidebarChats />, { wrapper: Wrapper });

describe('the sidebar conversations', () => {
  beforeEach(() => {
    chatFake.reset();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lists the person's conversations and opens one in the panel", async () => {
    const user = userEvent.setup();
    chatFake.conversations = [
      row('a', { read: false }),
      row('b', { title: null }),
    ];
    chatFake.open = true;
    chatFake.conversationId = 'b';
    renderChats();
    const group = screen.getByRole('group', { name: english('chats.title') });
    // Unread is said, not only drawn; an untitled one reads as new.
    expect(
      within(group).getByRole('button', { name: /^Conversation a/u }),
    ).toHaveTextContent(english('chats.unread'));
    const untitled = within(group).getByRole('button', {
      name: english('chats.untitled'),
    });
    // The conversation the panel shows is marked.
    expect(untitled).toHaveAttribute('aria-current', 'true');
    await user.click(
      within(group).getByRole('button', { name: /^Conversation a/u }),
    );
    await user.click(
      within(group).getByRole('button', { name: english('chats.new') }),
    );
    expect(chatFake.opened).toEqual([
      { conversationId: 'a', view: 'chat' },
      { conversationId: null, view: 'chat' },
    ]);
  });

  it('archives a conversation from its menu', async () => {
    const user = userEvent.setup();
    chatFake.conversations = [row('a'), row('b')];
    renderChats();
    await user.click(
      screen.getByRole('button', {
        name: english('chats.actions', { title: 'Conversation a' }),
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: english('chats.archive') }),
    );
    expect(chatFake.archived).toEqual(['a']);
  });

  it('says when there are none, and when they cannot be loaded', async () => {
    const empty = renderChats();
    expect(await screen.findByText(english('chats.empty'))).toBeTruthy();
    empty.unmount();
    chatFake.listFails = true;
    renderChats();
    expect(await screen.findByText(english('chats.failed'))).toBeTruthy();
  });

  it('is absent while the assistant cannot answer or the agents load', () => {
    chatFake.agents = [];
    const none = renderChats();
    expect(screen.queryByRole('group')).toBeNull();
    none.unmount();
    chatFake.reset();
    chatFake.loading = true;
    renderChats();
    expect(screen.queryByRole('group')).toBeNull();
  });
});
