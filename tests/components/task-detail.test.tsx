import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import { crmZh } from '../../client/locales/crm/index.js';

// The task page is laid out as the lead's: no header, the particulars
// in groups on the left, the timeline and its other tabs on the right.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  record: {} as Record<string, unknown>,
  history: [] as Record<string, unknown>[],
  canDelete: true,
}));

// No mail in these pages: the Mail plugin needs the application root, which
// these tests do not mount (tests/components/record-mail.test.tsx covers mail).
vi.mock('../../client/components/crm/mail.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/mail.js')
  >()),
  useMailSetup: () => ({
    can: false,
    accounts: [],
    providers: [],
    senders: [],
    loading: false,
  }),
  useMailComposer: () => ({
    available: false,
    compose: () => undefined,
    composer: null,
  }),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    userId: 'rep',
    assign: true,
    approve: false,
    export: false,
    settingsAccess: false,
    assistant: true,
    probabilities: {},
    settings: { ...defaultSettings, timeZone: 'Asia/Shanghai' },
    definitions,
    users: [
      {
        id: 'rep',
        name: '赵敏',
        roles: ['sales-representative'],
        disabled: false,
        canApprove: false,
      },
    ],
    permissions: {},
  };
  return {
    ...actual,
    useCrmApi: () => state.api,
    useRefresh: () => () => Promise.resolve(),
    useSessionUserId: () => 'rep',
    useCrmScopeKey: () => ['crm', 'rep', 'zh-CN'],
    useAssistantAvailable: () => true,
    useMetadata: () => ({ data: metadata }),
    useMore: (
      _base: unknown,
      initial?: { data: unknown[]; total: number },
    ) => ({
      records: initial?.data ?? [],
      total: initial?.total ?? 0,
      titles: {},
      hasMore: false,
      loading: false,
      loadMore: () => Promise.resolve(),
    }),
    useCrmQuery: (path: string) =>
      path.startsWith('tasks/')
        ? {
            isLoading: false,
            data: {
              record: state.record,
              titles: { 'lead-1': '罗雨萱 / 新域零售' },
              names: {},
              related: {},
              relatedTotals: {},
              history: state.history,
              historyTotal: state.history.length,
              permissions: {
                edit: true,
                delete: state.canDelete,
                approve: false,
              },
            },
          }
        : path === 'metadata'
          ? { isLoading: false, data: metadata }
          : { isLoading: false, data: undefined },
    useCrmText: () => ({
      text: (key: string, values?: Record<string, unknown>): string => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            crmZh,
          );
        return typeof value === 'string'
          ? value.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
              String(values?.[k] ?? ''),
            )
          : key;
      },
      language: 'zh-CN',
    }),
  };
});

// The long text's fold measures itself; jsdom has no observer to do so.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const { default: EntityDetail } =
  await import('../../client/pages/crm-entity-detail.js');

function Where(): ReactElement {
  return <output data-testid='where'>{useLocation().pathname}</output>;
}

function renderPage(path = '/crm/tasks/act-1'): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path='/crm/:entity/:id/*'
            element={
              <>
                <EntityDetail entity='tasks' id='act-1' />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const planned = {
  id: 'act-1',
  name: '新域零售 培训计划沟通',
  status: 'open',
  ownerId: 'rep',
  dueAt: '2026-10-23T03:00:00.000Z',
  endAt: '2026-10-23T04:00:00.000Z',
  leadId: 'lead-1',
  description: '回顾最新进展',
  attachments: [],
  createdAt: '2026-09-22T02:00:00.000Z',
  updatedAt: '2026-09-22T02:00:00.000Z',
};

beforeEach(() => {
  state.api.mockReset();
  state.api.mockResolvedValue({ data: {} });
  state.record = { ...planned };
  state.canDelete = true;
  state.history = [];
});

describe('the task page', () => {
  it('heads the page with the name and groups the particulars', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      '新域零售 培训计划沟通',
    );
    // No generic header line with the record's id.
    expect(screen.queryByText(/ID: act-1/)).toBeNull();
    for (const group of ['概况', '关联'])
      expect(screen.getByRole('heading', { name: group })).toBeTruthy();
    const related = screen
      .getByRole('heading', { name: '关联' })
      .closest('section') as HTMLElement;
    expect(within(related).getByText('关联线索')).toBeTruthy();
    expect(
      within(related).getByRole('link', { name: '罗雨萱 / 新域零售' }),
    ).toBeTruthy();
    // A planned task has no completion time yet.
    expect(screen.queryByText('完成时间')).toBeNull();
  });

  it('offers completing it only while the task is open', () => {
    renderPage();
    expect(screen.getByRole('button', { name: '完成' })).toBeTruthy();
  });

  // The outcome of a planned task goes through "Record outcome", which
  // completes it and has the AI follow up; typed into the field it would
  // do neither, so the field waits until there is one.
  it('keeps the outcome field out of a planned task until it has one', () => {
    renderPage();
    expect(screen.queryByText('结果')).toBeNull();
    cleanup();
    state.record = { ...planned, result: '客户确认了报价' };
    renderPage();
    expect(screen.getByText('结果')).toBeTruthy();
  });

  // Marking it done from the status menu records its outcome, as the
  // button does, rather than completing it with nothing for the AI to read.
  it('records the outcome when the status menu marks a planned task completed', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '状态' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: '已完成' }),
    );
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(state.api).not.toHaveBeenCalledWith(
      expect.stringContaining('tasks/'),
      'PATCH',
      expect.objectContaining({ status: 'completed' }),
    );
  });

  it('shows the result and no complete button once completed', () => {
    state.record = {
      ...planned,
      status: 'completed',
      completedAt: '2026-10-23T04:30:00.000Z',
    };
    renderPage();
    expect(screen.queryByRole('button', { name: '完成' })).toBeNull();
    expect(screen.getByText('结果')).toBeTruthy();
  });

  it('shows a note of several lines whole under its line, and edits it in place', async () => {
    const note = {
      id: 'note-1',
      action: 'note',
      entity: 'tasks',
      recordId: 'act-1',
      actorId: 'rep',
      changes: { text: '客户确认下周三演示\n需要准备报价单' },
      editedAt: '2026-09-23T02:00:00.000Z',
      createdAt: '2026-09-22T03:00:00.000Z',
    };
    state.history = [
      {
        ...note,
        id: 'edit-1',
        action: 'noteEdited',
        changes: { text: note.changes.text, noteId: 'note-1' },
        createdAt: '2026-09-23T02:00:00.000Z',
      },
      note,
    ];
    renderPage();
    // "Note:" on the entry's line; a note of several lines reads whole
    // below it, as Clarify shows a comment, and its edits are not entries.
    expect(screen.getByText('备注：')).toBeTruthy();
    // (The line keeps its one-line text unseen, to measure.)
    expect(
      screen
        .getAllByText(/需要准备报价单/)
        .filter((node) => !node.closest('[aria-hidden="true"]')),
    ).toHaveLength(1);
    expect(screen.getByText('已编辑')).toBeTruthy();
    expect(screen.queryByText('编辑了备注')).toBeNull();
    // Its author changes it in place, from the line's edit button.
    await userEvent.click(screen.getByRole('button', { name: '编辑' }));
    expect(
      (
        screen
          .getAllByRole('textbox', { name: '备注' })
          .at(-1) as HTMLTextAreaElement
      ).value,
    ).toContain('需要准备报价单');
  });

  it('writes notes in the timeline, with no Notes tab, and keeps the tab in the address', async () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /动态/ }).textContent).toBe('动态');
    expect(screen.queryByRole('tab', { name: /备注/ })).toBeNull();
    expect(screen.getByRole('textbox', { name: '备注' })).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: /附件/ }));
    expect(screen.getByTestId('where').textContent).toBe(
      '/crm/tasks/act-1/attachments',
    );
  });

  it('puts deleting in the More menu only for whoever may delete', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '更多…' }));
    expect(
      await screen.findByRole('menuitem', { name: '删除任务' }),
    ).toBeTruthy();
  });

  it('leaves the More menu out without delete permission', () => {
    state.canDelete = false;
    renderPage();
    expect(screen.queryByRole('button', { name: '更多…' })).toBeNull();
  });
});
