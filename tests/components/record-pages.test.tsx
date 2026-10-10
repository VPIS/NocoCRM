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
        : path === 'approvals/rec-1/review'
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
  state.api.mockResolvedValue({ data: {} });
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
    expect(screen.getByText('地区')).toBeTruthy();
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

  it('gives the approver the decision and the marker, its times left to the timeline', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /通过/ })).toBeTruthy();
    expect(screen.getByText('待你审批')).toBeTruthy();
    for (const time of ['创建时间', '提交时间', '更新时间'])
      expect(screen.queryByText(time)).toBeNull();
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
