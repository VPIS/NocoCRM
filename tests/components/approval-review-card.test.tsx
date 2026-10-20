import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { crmZh } from '../../client/locales/crm/index.js';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';

// The assistant can answer, so the cards offer Discuss (tests/setup/agent-chat-fake).
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) =>
  (await import('../setup/agent-chat-fake.js')).fakeChatModule(
    await importOriginal(),
  ),
);

// The AI's review of an approval reads as a follow-up's card does: in the
// timeline it leaves its heading to its line, and everything to do with it
// sits at its foot, Discuss at the left, Ignore and the accept at the right.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  // Whether there is a model to ask (the workspace's `assistant`).
  assistant: true,
  approval: { approverId: 'boss', status: 'pending' } as Record<
    string,
    unknown
  >,
}));

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    userId: 'boss',
    get assistant() {
      return state.assistant;
    },
    settings: { ...defaultSettings, timeZone: 'Asia/Shanghai' },
    definitions,
    users: [{ id: 'boss', name: '李明', roles: [], disabled: false }],
  };
  return {
    ...actual,
    useCrmApi: () => state.api,
    useRefresh: () => () => Promise.resolve(),
    useMetadata: () => ({ data: metadata }),
    useCrmQuery: () => ({ data: { record: state.approval } }),
    useCrmText: () => ({
      text: (key: string): string => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            crmZh,
          );
        return typeof value === 'string' ? value : key;
      },
      language: 'zh-CN',
    }),
  };
});

const { ReviewPanel } =
  await import('../../client/components/crm/approval-review.js');

const entry = {
  id: 'review-1',
  recordId: 'approval-1',
  status: 'pending' as const,
  createdAt: '2026-10-09T03:00:00.000Z',
  ai: {
    result: {
      recommendation: 'approve' as const,
      summary: '折扣在标准之内，建议批准。',
      asked: '九折',
      reasons: [],
      together: null,
      precedents: '无',
      risks: [],
      missing: [],
      conditions: null,
      comment: '同意。',
    },
  },
};

beforeEach(() => {
  state.api.mockReset();
  state.api.mockResolvedValue({ data: {} });
  state.approval = { approverId: 'boss', status: 'pending' };
  state.assistant = true;
});

describe('the approval review card', () => {
  it('leaves its heading to the timeline line and keeps its actions at its foot', async () => {
    const { container } = render(
      <ReviewPanel
        entry={entry}
        approvalId='approval-1'
        approvalName='九折申请'
        onChanged={() => Promise.resolve()}
        inFeed
      />,
    );
    expect(screen.queryByText('AI 审批建议')).toBeNull();
    expect(screen.getByText('折扣在标准之内，建议批准。')).toBeTruthy();
    const foot = container.querySelector('.border-t') as HTMLElement;
    expect(within(foot).getByRole('button', { name: /讨论/ })).toBeTruthy();
    expect(within(foot).getByRole('button', { name: /忽略/ })).toBeTruthy();
    const accept = within(foot).getByRole('button', { name: /按建议批准/ });
    await userEvent.click(accept);
    expect(state.api).toHaveBeenCalledWith(
      'approvals/approval-1/reviews/review-1/decide',
      'POST',
      { decision: 'approve', comment: '同意。' },
    );
  });

  it('is decided as it is without a model to ask, its redo button greyed', async () => {
    const card = () =>
      render(
        <ReviewPanel
          entry={entry}
          approvalId='approval-1'
          approvalName='九折申请'
          onChanged={() => Promise.resolve()}
          inFeed
        />,
      );
    const first = card();
    expect(screen.getByPlaceholderText('告诉 AI 怎么改')).toBeTruthy();
    first.unmount();
    state.assistant = false;
    card();
    expect(screen.getByText('折扣在标准之内，建议批准。')).toBeTruthy();
    expect(screen.getByRole('button', { name: /按建议批准/ })).toBeTruthy();
    await userEvent.type(
      screen.getByPlaceholderText('告诉 AI 怎么改'),
      '再看看',
    );
    expect(
      (screen.getByRole('button', { name: '调整' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('offers only Discuss to anyone but the approver', () => {
    state.approval = { approverId: 'someone-else', status: 'pending' };
    const { container } = render(
      <ReviewPanel
        entry={entry}
        approvalId='approval-1'
        approvalName='九折申请'
        onChanged={() => Promise.resolve()}
      />,
    );
    expect(screen.getByText('AI 审批建议')).toBeTruthy();
    const foot = container.querySelector('.border-t') as HTMLElement;
    expect(within(foot).getByRole('button', { name: /讨论/ })).toBeTruthy();
    expect(within(foot).queryByRole('button', { name: /忽略/ })).toBeNull();
    expect(within(foot).queryByRole('textbox')).toBeNull();
  });
});
