import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '../../client/components/ui/sidebar.js';
import { crmEn } from '../../client/locales/crm/index.js';

// The global search: ⌘K, keyword results grouped by kind, going to a record
// or its list, and asking the AI in a conversation of its own.

const state = vi.hoisted(() => ({
  assistant: true,
  readiness: { state: 'ready' } as
    | { state: 'ready' }
    | { state: 'loading' }
    | { state: 'unavailable'; reason: string },
  requests: [] as string[],
  asked: [] as { prompt: string; model?: unknown }[],
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

const lead = {
  id: 'l1',
  name: 'Zhou Wei',
  company: 'Orbit Kitchen',
  status: 'new',
};
const account = { id: 'a1', name: 'Orbit Group', industry: 'retail' };

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useMetadata: () => ({
      data: {
        assistant: state.assistant,
        definitions: {
          leads: { fields: [{ key: 'status', type: 'select' }] },
          accounts: { fields: [{ key: 'industry', type: 'select' }] },
        },
        settings: { timeZone: 'Asia/Shanghai' },
      },
    }),
    useCrmText: () => ({ text: english, language: 'en-US' }),
    useCrmScopeKey: () => ['crm', 'u1', 'en-US'],
    useCrmApi:
      () =>
      (path: string): Promise<unknown> => {
        state.requests.push(path);
        if (path.startsWith('search?'))
          return Promise.resolve({
            data: [
              {
                entity: 'leads',
                total: 7,
                rows: [lead],
                titles: {},
                names: {},
              },
              {
                entity: 'accounts',
                total: 1,
                rows: [account],
                titles: {},
                names: {},
              },
            ],
          });
        return Promise.resolve({ data: [], total: 0 });
      },
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
      useAssistantReadiness: () => state.readiness,
    };
  },
);
vi.mock(
  '../../client/extensions/nocobase-ai/index.js',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../../client/extensions/nocobase-ai/index.js')
      >();
    return {
      ...actual,
      useAI: () => ({
        employees: [{ username: 'crm-assistant' }],
        models: [{ llmService: 'qwen', value: 'qwen-max', label: 'Qwen Max' }],
      }),
      useAIPageElementHandle: () => ({
        ref: () => undefined,
        context: { type: 'page-element', id: 'crm-global-search' },
      }),
    };
  },
);

const { GlobalSearchProvider } =
  await import('../../client/components/crm/global-search.js');
const { GlobalSearchDialog, SearchNavButton } =
  await import('../../client/components/crm/search-dialog.js');
const { searchChat } =
  await import('../../client/components/crm/search-chat.js');

function Where() {
  const location = useLocation();
  return (
    <output data-testid='where'>{location.pathname + location.search}</output>
  );
}

function renderSearch(extra?: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/crm/tasks']}>
        <SidebarProvider>
          <GlobalSearchProvider>
            <SearchNavButton />
            <GlobalSearchDialog />
            {extra}
            <Routes>
              <Route path='*' element={<Where />} />
            </Routes>
          </GlobalSearchProvider>
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const pressShortcut = () =>
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
    );
  });

describe('the global search', () => {
  const ask = vi.spyOn(searchChat, 'ask');
  beforeEach(() => {
    state.assistant = true;
    state.readiness = { state: 'ready' };
    state.requests = [];
    ask.mockReset();
    // cmdk measures its list and scrolls the selection into view.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opens with the shortcut, lists matches by kind, and goes to a record', async () => {
    const user = userEvent.setup();
    renderSearch();
    pressShortcut();
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByRole('combobox', {
      name: english('globalSearch.placeholder'),
    });
    await user.type(input, 'orbit');
    expect(
      await within(dialog).findByText(`${english('entities.leads')} · 7`),
    ).toBeTruthy();
    expect(
      within(dialog).getByText(`${english('entities.accounts')} · 1`),
    ).toBeTruthy();
    expect(state.requests).toContain('search?q=orbit');
    // The typed word in bold, in the name and on the detail line.
    expect(
      within(dialog)
        .getAllByText('Orbit')
        .every((node) => node.tagName === 'STRONG'),
    ).toBe(true);
    // The first result is selected; Enter opens it.
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where').textContent).toBe('/crm/leads/l1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it("opens a kind's whole list with the search, and asks the AI from the last row", async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.click(
      screen.getByRole('button', {
        name: new RegExp(english('globalSearch.label')),
      }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('combobox'), 'orbit');
    await user.click(
      await within(dialog).findByText(
        english('globalSearch.showAllIn', {
          list: english('entities.leads'),
          count: 7,
        }),
      ),
    );
    expect(screen.getByTestId('where').textContent).toBe(
      '/crm/leads?search=orbit',
    );
    pressShortcut();
    const again = await screen.findByRole('dialog');
    await user.click(
      await within(again).findByText(
        english('globalSearch.askAbout', { text: 'orbit' }),
      ),
    );
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0]?.[0]).toBe('[CRM search] orbit');
    expect(ask.mock.calls[0]?.[2]).toEqual({
      llmService: 'qwen',
      model: 'qwen-max',
    });
    // The answer card shows the question while Noco works.
    expect(
      within(again).getByRole('region', {
        name: english('globalSearch.answerTitle'),
      }),
    ).toBeTruthy();
  });

  it('keeps the answer when complete and lets its conversation go', async () => {
    const user = userEvent.setup();
    const removed: string[] = [];
    renderSearch();
    pressShortcut();
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('tab', { name: english('globalSearch.askTab') }),
    );
    const input = within(dialog).getByRole('textbox', {
      name: english('globalSearch.askPlaceholder'),
    });
    await user.type(input, 'big deals{Enter}');
    expect(ask.mock.calls[0]?.[0]).toBe('[CRM search] big deals');
    act(() =>
      searchChat.setState({
        status: 'ready',
        conversationId: 'c-9',
        removeConversation: (id: string) => {
          removed.push(id);
          return Promise.resolve();
        },
        messages: [
          {
            id: 'u',
            role: 'user',
            parts: [{ type: 'text', text: '[CRM search] big deals' }],
          },
          {
            id: 'a',
            role: 'assistant',
            parts: [{ type: 'text', text: 'Two deals over a million.' }],
          },
        ] as never,
      }),
    );
    expect(
      await within(dialog).findByText('Two deals over a million.'),
    ).toBeTruthy();
    expect(removed).toEqual(['c-9']);
    expect(
      within(dialog).getByRole('button', {
        name: english('globalSearch.followUp'),
      }),
    ).toBeTruthy();
  });

  it('offers the AI disabled with the reason while the chat cannot start, and not at all with the assistant off', async () => {
    const user = userEvent.setup();
    state.readiness = { state: 'unavailable', reason: 'No model is enabled.' };
    const first = renderSearch();
    pressShortcut();
    let dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('tab', { name: english('globalSearch.askTab') }),
    ).toHaveAttribute('aria-disabled', 'true');
    await user.type(within(dialog).getByRole('combobox'), 'orbit');
    const askRow = await within(dialog).findByText(
      english('globalSearch.askAbout', { text: 'orbit' }),
    );
    expect(askRow.closest('[cmdk-item]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // The reason in the open, since a disabled row takes no pointer.
    expect(within(dialog).getByText('No model is enabled.')).toBeTruthy();
    first.unmount();

    state.assistant = false;
    renderSearch();
    pressShortcut();
    dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('tab')).toBeNull();
  });

  it('does not open over another dialog', () => {
    renderSearch(<div role='dialog' aria-label='Another' />);
    pressShortcut();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true, isComposing: true });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
