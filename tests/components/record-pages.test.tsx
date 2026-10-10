import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  definitions,
  defaultSettings,
  probabilities,
} from '../../server/providers/crm/schema.js';
import { crmZh } from '../../client/locales/crm/index.js';

// The company, contact and approval pages are laid out as the lead's: the
// heading over grouped particulars, every action under it, tabs on the right.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  entity: 'companies' as string,
  record: {} as Record<string, unknown>,
  related: {} as Record<string, unknown>,
  canDelete: true,
  canApprove: true,
  userId: 'rep',
  history: [] as Record<string, unknown>[],
  // The approval's latest AI review, when it has one.
  review: null as Record<string, unknown> | null,
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
    get userId() {
      return state.userId;
    },
    assign: true,
    approve: true,
    export: false,
    settingsAccess: false,
    assistant: true,
    probabilities,
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
      {
        id: 'manager',
        name: '李明',
        roles: ['sales-manager'],
        disabled: false,
        canApprove: true,
      },
    ],
    permissions: {
      contacts: { create: false },
      tasks: { create: false },
      approvals: { create: false, delete: false },
      opportunities: { create: false },
    },
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
      path === `${state.entity}/rec-1`
        ? {
            isLoading: false,
            data: {
              record: state.record,
              titles: { 'company-1': '沃格光电', 'opp-1': '沃格光电 / 供应链' },
              names: {},
              related: state.related,
              relatedTotals: {},
              history: state.history,
              historyTotal: state.history.length,
              permissions: {
                edit: true,
                delete: state.canDelete,
                approve: state.canApprove,
              },
            },
          }
        : path === 'approvals/rec-1/reviews/latest'
          ? { isLoading: false, data: state.review }
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

function renderPage(path = `/crm/${state.entity}/rec-1`): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path='/crm/:entity' element={<Where />} />
          <Route
            path='/crm/:entity/:id/*'
            element={
              <>
                <EntityDetail entity={state.entity as 'companies'} id='rec-1' />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const stamps = {
  createdAt: '2026-10-01T02:00:00.000Z',
  updatedAt: '2026-10-01T03:00:00.000Z',
};

beforeEach(() => {
  state.api.mockReset();
  // The plans agents proposed that would change the record: none.
  state.api.mockImplementation(async (path: string) =>
    path.startsWith('plans') ? { data: [], meta: { total: 0 } } : { data: {} },
  );
  state.canDelete = true;
  state.userId = 'rep';
  state.canApprove = true;
  state.related = {};
  state.history = [];
  state.review = null;
});

describe('the company page', () => {
  beforeEach(() => {
    state.entity = 'companies';
    state.record = {
      id: 'rec-1',
      name: '杭州海康威视',
      ownerId: 'rep',
      status: 'churned',
      churnReason: 'toCompetitor',
      website: 'https://example.com',
      country: 'CN',
      attachments: [],
      ...stamps,
    };
    state.related = {
      contacts: [],
      opportunities: [],
      leads: [{ id: 'lead-1', name: '张伟', company: '海康' }],
    };
  });

  it('heads the page with the name and groups the particulars, with no header or ID line', () => {
    renderPage();
    for (const heading of screen.getAllByRole('heading', { level: 1 }))
      expect(heading.textContent).toContain('杭州海康威视');
    expect(screen.queryByText(/ID: rec-1/)).toBeNull();
    for (const group of ['概况', '公司'])
      expect(screen.getByRole('heading', { name: group })).toBeTruthy();
    // The region and the street address are one row, the location.
    expect(screen.getByText('地址')).toBeTruthy();
    expect(screen.queryByText('地区')).toBeNull();
  });

  it('lists the leads it came from', () => {
    renderPage();
    const company = screen
      .getByRole('heading', { name: '公司' })
      .closest('section') as HTMLElement;
    expect(within(company).getByText('转化自线索')).toBeTruthy();
    expect(within(company).getByRole('link', { name: /张伟/ })).toBeTruthy();
  });

  it('offers no AI button of its own: the assistant is asked from the dock', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /问 AI/ })).toBeNull();
    // Nor the former canned shortcuts: the dock suggests such questions.
    for (const name of ['总结客户', '调研公司', '发现销售机会'])
      expect(
        screen.queryByRole('button', { name: new RegExp(name) }),
      ).toBeNull();
    for (const name of ['动态', '任务', '联系人', '商机', '附件'])
      expect(
        screen.getAllByRole('tab', { name: new RegExp(name) }),
      ).toHaveLength(1);
  });
});

describe("the company page's churn reason", () => {
  beforeEach(() => {
    state.entity = 'companies';
    state.record = {
      id: 'rec-1',
      name: '丰味食品',
      ownerId: 'rep',
      status: 'churned',
      churnReason: 'toCompetitor',
      attachments: [],
      ...stamps,
    };
    state.related = { contacts: [], opportunities: [] };
  });

  it("keeps a churned company's reason editable as its own row", () => {
    renderPage();
    expect(screen.getByRole('button', { name: '流失原因' })).toBeTruthy();
  });
});

describe('the way back on a phone', () => {
  beforeEach(() => {
    state.entity = 'contacts';
    state.record = { id: 'rec-1', name: '周晓', ownerId: 'rep', ...stamps };
    state.related = { opportunities: [] };
  });

  it('names the kind of record and, opened from a link, goes back to its list', async () => {
    renderPage();
    const back = screen.getByRole('button', {
      name: /返回|navigation.back|Back/,
    });
    expect(back.parentElement?.textContent).toContain('联系人');
    await userEvent.click(back);
    expect(screen.getByTestId('where').textContent).toBe('/crm/contacts');
  });
});

describe('the contact page', () => {
  beforeEach(() => {
    state.entity = 'contacts';
    state.record = {
      id: 'rec-1',
      name: '周晓',
      companyId: 'company-1',
      ownerId: 'rep',
      phone: '138 0000 5217',
      ...stamps,
    };
    state.related = { opportunities: [] };
  });

  it('heads the page with the name and its company, and has no attachments tab', () => {
    renderPage();
    for (const heading of screen.getAllByRole('heading', { level: 1 })) {
      expect(heading.textContent).toContain('周晓');
      expect(heading.textContent).toContain('沃格光电');
    }
    // One list headed Details.
    expect(screen.getByRole('heading', { name: '详情' })).toBeTruthy();
    for (const group of ['概况', '联系方式'])
      expect(screen.queryByRole('heading', { name: group })).toBeNull();
    expect(screen.queryByRole('tab', { name: /附件/ })).toBeNull();
    expect(screen.getAllByRole('tab', { name: /商机/ })).toHaveLength(1);
  });
});

describe('the approval page', () => {
  beforeEach(() => {
    state.entity = 'approvals';
    state.record = {
      id: 'rec-1',
      name: '华策精密 企业版折扣特批',
      ownerId: 'applicant',
      approverId: 'rep',
      status: 'pending',
      topic: 'discount',
      opportunityId: 'opp-1',
      description: '申请 10% 折扣',
      submittedAt: '2026-10-01T03:00:00.000Z',
      attachments: [],
      ...stamps,
    };
  });

  it('gives the approver the decision and the marker, created and updated among its details', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /通过/ })).toBeTruthy();
    expect(screen.getByText('待你审批')).toBeTruthy();
    // When it was created and last changed close its details; the rest of
    // its times are the timeline's.
    for (const time of ['创建时间', '更新时间'])
      expect(screen.getByText(time)).toBeTruthy();
    expect(screen.queryByText('提交时间')).toBeNull();
    // Not decided yet: no comment.
    expect(screen.queryByText('审批意见')).toBeNull();
  });

  // The AI's review (approval-review.tsx) replaced the chat briefing: its
  // status under the buttons, and asking for it while the approval waits,
  // one button whether it is the first review or another.
  it('offers the AI review to the approver while it waits', () => {
    renderPage();
    expect(screen.getAllByRole('button', { name: /辅助审批/ })).toHaveLength(1);
  });

  // Once reviewed, one chip as a lead's suggestion reads: the
  // recommendation, where it stands, then asking again, the approver's.
  it('reads the latest review on one chip that ends in asking again', () => {
    state.review = {
      id: 'review-1',
      status: 'pending',
      createdAt: '2026-10-01T04:00:00.000Z',
      ai: { result: { recommendation: 'conditional' } },
    };
    renderPage();
    expect(screen.getByText('建议有条件批准')).toBeTruthy();
    expect(screen.getByText('待处理')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '重新分析' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /辅助审批/ })).toBeNull();
    cleanup();
    state.userId = 'someone';
    renderPage();
    expect(screen.queryByRole('button', { name: '重新分析' })).toBeNull();
  });

  // The review is the approver's alone: the applicant, like anyone else,
  // may not ask for one.
  it('withholds asking for it from everyone but the approver', () => {
    for (const userId of ['applicant', 'someone']) {
      state.userId = userId;
      renderPage();
      expect(screen.queryByRole('button', { name: /辅助审批/ })).toBeNull();
      cleanup();
    }
  });

  it('shows the applicant no marker', () => {
    state.userId = 'applicant';
    renderPage();
    expect(screen.queryByText('待你审批')).toBeNull();
  });

  it('tells the decision and its comment in the timeline', () => {
    state.record = {
      ...state.record,
      status: 'approved',
      decidedAt: '2026-10-02T03:00:00.000Z',
      decisionComment: '同意 60 天账期',
    };
    // A decision from before the comment was kept on its entry: the
    // approval's own comment is read for it.
    state.history = [
      {
        id: 'decided',
        entity: 'approvals',
        recordId: 'rec-1',
        actorId: 'rep',
        action: 'status',
        fromValue: 'pending',
        toValue: 'approved',
        changes: {},
        createdAt: '2026-10-02T03:00:00.000Z',
      },
    ];
    renderPage();
    expect(screen.queryByText('审批时间')).toBeNull();
    // Not a field of the page any more.
    expect(screen.queryByText('审批意见')).toBeNull();
    expect(screen.getByText('同意 60 天账期')).toBeTruthy();
    expect(screen.getByText('你是审批人')).toBeTruthy();
  });
});

// A person's edits of one field, one after another, read as the last of
// them, from the value before the first.
describe('the timeline', () => {
  it("keeps the last of one person's consecutive edits of the same field", () => {
    state.entity = 'companies';
    state.record = { id: 'rec-1', name: '杭州海康威视', ownerId: 'rep' };
    const edit = (id: string, from: string | null, to: string, at: string) => ({
      id,
      entity: 'companies',
      recordId: 'rec-1',
      actorId: 'rep',
      action: 'updated',
      changes: { phone: to },
      previous: { phone: from },
      createdAt: at,
    });
    state.history = [
      edit('third', '0571-2', '0571-3', '2026-10-03T03:00:00.000Z'),
      edit('second', '0571-1', '0571-2', '2026-10-02T03:00:00.000Z'),
      edit('first', null, '0571-1', '2026-10-01T03:00:00.000Z'),
      {
        ...edit('other', '0571-0', '0571-9', '2026-09-30T03:00:00.000Z'),
        actorId: 'manager',
      },
    ];
    renderPage();
    expect(screen.getByText('0571-3')).toBeTruthy();
    expect(screen.queryByText('0571-2')).toBeNull();
    expect(screen.queryByText('0571-1')).toBeNull();
    // Another person's edit stays its own.
    expect(screen.getByText('0571-9')).toBeTruthy();
  });
});

// A comment's replies read under it; anyone answers it from its line; a comment
// deleted while it had replies keeps its place for them.
describe("a comment's thread", () => {
  const comment = (id: string, actorId: string, text: string) => ({
    id,
    entity: 'companies',
    recordId: 'rec-1',
    actorId,
    action: 'comment',
    changes: { text },
    createdAt: '2026-10-02T03:00:00.000Z',
  });
  beforeEach(() => {
    state.entity = 'companies';
    state.record = { id: 'rec-1', name: '杭州海康威视', ownerId: 'rep' };
  });

  it('reads the replies under the comment and posts a reply to it', async () => {
    state.history = [
      {
        ...comment('n1', 'manager', '客户想看演示'),
        replies: [
          {
            id: 'r1',
            actorId: 'rep',
            createdAt: '2026-10-02T04:00:00.000Z',
            changes: { text: '我来约时间' },
          },
        ],
      },
    ];
    renderPage();
    expect(screen.getByText('我来约时间')).toBeTruthy();
    // The comment's own reply, then the reply's.
    const [answer] = screen.getAllByRole('button', { name: '回复' });
    await userEvent.click(answer);
    // It opens empty: the reply says whom it answers without a mention.
    const box = screen.getByRole('textbox', { name: '回复' });
    expect((box as HTMLTextAreaElement).value).toBe('');
    await userEvent.type(box, '好的');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(state.api).toHaveBeenCalledWith('companies/rec-1/comments', 'POST', {
      text: '好的',
      mentions: [],
      replyTo: 'n1',
    });
  });

  it('lists a reply to a reply at the same level, saying whom it answers, and answers a reply', async () => {
    state.history = [
      {
        ...comment('n1', 'manager', '客户想看演示'),
        replies: [
          {
            id: 'r1',
            replyToId: 'n1',
            actorId: 'rep',
            createdAt: '2026-10-02T04:00:00.000Z',
            changes: { text: '我来约时间' },
          },
          {
            id: 'r2',
            replyToId: 'r1',
            actorId: 'manager',
            createdAt: '2026-10-02T05:00:00.000Z',
            changes: { text: '周三下午可以' },
          },
        ],
      },
    ];
    renderPage();
    // One level, in the order they were written, each naming whom it answers.
    const first = screen.getByText('我来约时间').closest('.min-w-0');
    expect(first?.textContent).not.toContain('周三下午可以');
    expect(screen.getByText('回复 李明')).toBeTruthy();
    expect(screen.getByText('回复 赵敏')).toBeTruthy();
    // A reply's own Reply opens the box at the thread's end, answering it.
    const replyButtons = screen.getAllByRole('button', { name: '回复' });
    await userEvent.click(replyButtons[1]);
    await userEvent.type(screen.getByRole('textbox', { name: '回复' }), '好');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(state.api).toHaveBeenCalledWith('companies/rec-1/comments', 'POST', {
      text: '好',
      mentions: [],
      replyTo: 'r1',
    });
  });

  it('folds a long thread to its first and last replies until unfolded', async () => {
    state.history = [
      {
        ...comment('n1', 'manager', '客户想看演示'),
        replies: ['一', '二', '三', '四', '五'].map((text, index) => ({
          id: `r${index}`,
          replyToId: 'n1',
          actorId: 'rep',
          createdAt: `2026-10-02T0${index + 1}:00:00.000Z`,
          changes: { text },
        })),
      },
    ];
    renderPage();
    expect(screen.getByText('一')).toBeTruthy();
    expect(screen.getByText('五')).toBeTruthy();
    expect(screen.queryByText('三')).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: '展开另外 3 条回复' }),
    );
    for (const text of ['二', '三', '四'])
      expect(screen.getByText(text)).toBeTruthy();
  });

  it("keeps a deleted comment's place for its replies", () => {
    state.history = [
      {
        ...comment('n1', 'rep', ''),
        changes: { text: '', deleted: true },
        replies: [
          {
            id: 'r1',
            actorId: 'manager',
            createdAt: '2026-10-02T04:00:00.000Z',
            changes: { text: '收到' },
          },
        ],
      },
    ];
    renderPage();
    expect(screen.getByText('此评论已删除')).toBeTruthy();
    expect(screen.getByText('收到')).toBeTruthy();
    // Its author may no longer edit what is gone.
    expect(screen.queryByRole('button', { name: '编辑' })).toBeNull();
  });
});
