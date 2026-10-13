import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
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
    companies: [],
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
      // The task's AI preparation: none yet.
      path.endsWith('/preparations/latest')
        ? { isLoading: false, data: null }
        : path.startsWith('tasks/')
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
  // The plans agents proposed that would change the record: none.
  state.api.mockImplementation(async (path: string) =>
    path.startsWith('plans') ? { data: [], meta: { total: 0 } } : { data: {} },
  );
  state.record = { ...planned };
  state.canDelete = true;
  state.history = [];
});

describe('the task page', () => {
  it('heads the page with the name, its lead in a card of its own', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      '新域零售 培训计划沟通',
    );
    // No generic header line with the record's id.
    expect(screen.queryByText(/ID: act-1/)).toBeNull();
    // The task's card, then the card of the lead it concerns, picked there.
    for (const group of ['概况', '关联线索'])
      expect(screen.getByRole('heading', { name: group })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '详情' })).toBeNull();
    expect(
      screen.getByRole('link', { name: '罗雨萱 / 新域零售' }),
    ).toBeTruthy();
    // A planned task has no completion time yet.
    expect(screen.queryByText('完成时间')).toBeNull();
  });

  // Its owner may have the AI prepare it, before the first preparation by
  // the button the chip later replaces (task-preparation.tsx).
  it('offers the AI prep to the owner of an open task with a record', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'AI 准备' })).toBeTruthy();
  });

  it('offers completing it only while the task is open', () => {
    renderPage();
    expect(screen.getByRole('button', { name: '完成' })).toBeTruthy();
  });

  it('cancels an open task once that is confirmed', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '取消任务' }));
    expect(state.api).not.toHaveBeenCalledWith(
      'tasks/act-1',
      'PATCH',
      expect.anything(),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: '取消任务' }),
    );
    expect(state.api).toHaveBeenCalledWith('tasks/act-1', 'PATCH', {
      status: 'cancelled',
    });
  });

  // The outcome of a planned task goes through "Record outcome", which
  // completes it and has the AI follow up; typed into the field it would
  // do neither, so the field waits until there is one.
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

  it('tells the result in the timeline, under the entry that completed it', () => {
    state.record = {
      ...planned,
      status: 'completed',
      completedAt: '2026-10-23T04:30:00.000Z',
      result: '客户确认了报价',
    };
    state.history = [
      {
        id: 'done',
        entity: 'tasks',
        recordId: 'act-1',
        actorId: 'rep',
        action: 'status',
        fromValue: 'open',
        toValue: 'completed',
        changes: { status: 'completed', result: '客户确认了报价' },
        createdAt: '2026-10-23T04:30:00.000Z',
      },
    ];
    renderPage();
    expect(screen.queryByRole('button', { name: '完成' })).toBeNull();
    // Not a row of the page: told once, under its entry.
    expect(screen.queryByText('结果')).toBeNull();
    expect(screen.getAllByText('客户确认了报价')).toHaveLength(1);
  });

  it('shows a comment of several lines whole under its line, and edits it in place', async () => {
    const comment = {
      id: 'comment-1',
      action: 'comment',
      entity: 'tasks',
      recordId: 'act-1',
      actorId: 'rep',
      changes: { text: '客户确认下周三演示\n需要准备报价单' },
      editedAt: '2026-09-23T02:00:00.000Z',
      createdAt: '2026-09-22T03:00:00.000Z',
    };
    state.history = [
      {
        ...comment,
        id: 'edit-1',
        action: 'commentEdited',
        changes: { text: comment.changes.text, commentId: 'comment-1' },
        createdAt: '2026-09-23T02:00:00.000Z',
      },
      comment,
    ];
    renderPage();
    // No word before a comment on its line; its text reads whole below it,
    // as the UI Library's comment thread shows one, and its edits are not
    // entries.
    expect(screen.queryByText('评论：')).toBeNull();
    expect(screen.getAllByText(/需要准备报价单/)).toHaveLength(1);
    expect(screen.getByText('已编辑')).toBeTruthy();
    expect(screen.queryByText('编辑了评论')).toBeNull();
    // Its author changes it in place, from the line's "…" menu.
    const line = document.querySelector<HTMLElement>(
      '[data-comment="comment-1"]',
    );
    await userEvent.click(
      within(line as HTMLElement).getByRole('button', { name: '更多…' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: '编辑' }),
    );
    expect(
      (
        screen
          .getAllByRole('textbox', { name: '评论' })
          .at(-1) as HTMLTextAreaElement
      ).value,
    ).toContain('需要准备报价单');
  });

  it('writes comments in the timeline, with no Comments tab, and keeps the tab in the address', async () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /动态/ }).textContent).toBe('动态');
    expect(screen.queryByRole('tab', { name: /评论/ })).toBeNull();
    expect(screen.getByRole('textbox', { name: '评论' })).toBeTruthy();
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
