import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '../../client/components/ui/sidebar.js';
import { crmEn } from '../../client/locales/crm/index.js';

// The user's conversations under the menu: which are listed and how, what a
// row and "New conversation" ask of the panel, and deleting one.

interface Row {
  id: string;
  title: string;
  employeeUsername: string;
  updatedAt: string;
  unread: boolean;
}

const state = vi.hoisted(() => ({
  assistant: true,
  ready: true,
  active: undefined as string | undefined,
  conversations: [] as Row[],
  failList: false,
  requests: [] as string[],
  destroyed: [] as string[],
}));

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
    useMetadata: () => ({ data: { assistant: state.assistant } }),
    useCrmText: () => ({ text: english, language: 'en-US' }),
    useSessionUserId: () => 'u1',
  };
});
vi.mock(
  '../../client/components/crm/assistant-state.js',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../../client/components/crm/assistant-state.js')
      >();
    return {
      ...actual,
      useAssistantReadiness: () =>
        state.ready
          ? { state: 'ready' }
          : { state: 'unavailable', reason: 'No model' },
      useActiveConversation: () => state.active,
      useCatalogSignature: () => undefined,
      requestConversation: (target: string) => state.requests.push(target),
      // The panel's chat is not mounted here: deletion goes to the plugin.
      deleteThroughPanel: () => undefined,
    };
  },
);
vi.mock('../../client/extensions/nocobase-ai/index.js', () => ({
  useAI: () => ({
    listConversations: () =>
      state.failList
        ? Promise.reject(new Error('down'))
        : Promise.resolve(state.conversations),
    destroyConversation: (id: string) => {
      state.destroyed.push(id);
      state.conversations = state.conversations.filter((row) => row.id !== id);
      return Promise.resolve();
    },
  }),
}));

const { SidebarChats } =
  await import('../../client/layouts/components/sidebar-chats.js');

const row = (id: string, values: Partial<Row> = {}): Row => ({
  id,
  title: `Conversation ${id}`,
  employeeUsername: 'crm-assistant',
  updatedAt: '2026-10-09T10:00:00Z',
  unread: false,
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
    state.assistant = true;
    state.ready = true;
    state.active = undefined;
    state.failList = false;
    state.requests = [];
    state.destroyed = [];
    state.conversations = [];
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lists the CRM assistant's conversations, ten at a time, and opens one", async () => {
    const user = userEvent.setup();
    state.conversations = [
      row('a', { title: 'New conversation', unread: true }),
      row('other', { employeeUsername: 'someone-else' }),
      ...Array.from({ length: 11 }, (_, index) => row(`c${String(index)}`)),
    ];
    state.active = 'c0';
    renderChats();
    const group = await screen.findByRole('group', {
      name: english('chats.title'),
    });
    // The plugin's English placeholder title reads as the interface says it.
    const untitled = await within(group).findByRole('button', {
      name: /^New conversation.*Unread$/u,
    });
    expect(
      within(group).queryByRole('button', { name: /Conversation other/u }),
    ).toBeNull();
    expect(
      within(group).getByRole('button', { name: 'Conversation c0' }),
    ).toHaveAttribute('aria-current', 'true');
    // Ten rows first; the rest on demand.
    expect(
      within(group).queryByRole('button', { name: 'Conversation c9' }),
    ).toBeNull();
    await user.click(
      within(group).getByRole('button', { name: english('loadMore') }),
    );
    expect(
      within(group).getByRole('button', { name: 'Conversation c10' }),
    ).toBeTruthy();
    await user.click(untitled);
    await user.click(
      screen.getByRole('button', { name: english('chats.new') }),
    );
    expect(state.requests).toEqual(['a', 'new']);
  });

  it('deletes a conversation after confirming it', async () => {
    const user = userEvent.setup();
    state.conversations = [row('a'), row('b')];
    renderChats();
    await user.click(
      await screen.findByRole('button', {
        name: english('chats.actions', { title: 'Conversation a' }),
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: english('chats.delete') }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: english('chats.deleteTitle', { title: 'Conversation a' }),
    });
    expect(state.destroyed).toEqual([]);
    await user.click(
      within(dialog).getByRole('button', { name: english('chats.delete') }),
    );
    await waitFor(() => expect(state.destroyed).toEqual(['a']));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Conversation a' }),
      ).toBeNull(),
    );
    expect(screen.getByRole('button', { name: 'Conversation b' })).toBeTruthy();
    // Focus does not fall to the page with the deleted row's menu.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: english('chats.new') }),
      ).toHaveFocus(),
    );
  });

  it('says when there are none, and when they cannot be loaded', async () => {
    const empty = renderChats();
    expect(await screen.findByText(english('chats.empty'))).toBeTruthy();
    empty.unmount();
    state.failList = true;
    renderChats();
    expect(await screen.findByText(english('chats.failed'))).toBeTruthy();
    expect(
      screen.getByRole('button', { name: english('chats.retry') }),
    ).toBeTruthy();
  });

  it('is absent while the assistant is off or cannot start', () => {
    state.assistant = false;
    const off = renderChats();
    expect(screen.queryByRole('group')).toBeNull();
    off.unmount();
    state.assistant = true;
    state.ready = false;
    renderChats();
    expect(screen.queryByRole('group')).toBeNull();
  });
});
