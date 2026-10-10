import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiClientError } from '@nocobase/app-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { crmZh } from '../../client/locales/crm/index.js';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import type { PlanView } from '../../client/components/crm/plans.js';

// A plan an agent proposed is decided on its card: what each step changes,
// old value beside new, which steps to keep, and what came of the decision.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  plans: [] as unknown[],
}));

// The assistant panel the conversation opens in (tests/setup/agent-chat-fake).
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) =>
  (await import('../setup/agent-chat-fake.js')).fakeChatModule(
    await importOriginal(),
  ),
);
const { chatFake } = await import('../setup/agent-chat-fake.js');
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    userId: 'rep',
    settings: { ...defaultSettings, timeZone: 'Asia/Shanghai' },
    definitions,
    users: [{ id: 'rep', name: '赵敏', roles: [], disabled: false }],
    permissions: {},
  };
  // The Chinese wording, with plurals and placeholders as i18next fills them.
  const lookup = (key: string): unknown =>
    key
      .split('.')
      .reduce<unknown>(
        (node, part) => (node as Record<string, unknown>)?.[part],
        crmZh,
      );
  const text = (key: string, options: Record<string, unknown> = {}): string => {
    const value =
      'count' in options
        ? (lookup(`${key}_other`) ?? lookup(key))
        : lookup(key);
    if (typeof value !== 'string') return key;
    return value.replace(/\{\{(\w+)\}\}/gu, (_, name: string) =>
      String(options[name] ?? ''),
    );
  };
  return {
    ...actual,
    useCrmApi: () => state.api,
    useCrmScopeKey: () => ['crm', 'rep', 'zh-CN'],
    useMetadata: () => ({ data: metadata }),
    useCrmText: () => ({ text, language: 'zh-CN' }),
  };
});

const { PlanCard, WaitingPlans } =
  await import('../../client/components/crm/plan-card.js');

const step = (
  position: number,
  changes: { field: string; from: unknown; to: unknown }[],
  op: PlanView['steps'][number]['op'] = 'record.update',
) => ({
  id: `s${position}`,
  position,
  op,
  ref: null,
  params: {},
  check: { entity: 'leads' as const, id: 'lead-1', name: '周晓', changes },
  status: 'pending' as const,
  result: null,
});

const plan = (overrides: Partial<PlanView> = {}): PlanView => ({
  id: 'p1',
  title: '更新周晓的线索',
  summary: null,
  status: 'pending',
  revision: 3,
  proposerUserId: 'rep',
  agentId: 'a1',
  agentName: 'AI',
  runId: 'r1',
  conversationId: 'c1',
  deciderUserId: null,
  decidedAt: null,
  failure: null,
  expiresAt: new Date(Date.now() + 5 * 3_600_000).toISOString(),
  createdAt: new Date().toISOString(),
  steps: [
    step(1, [{ field: 'name', from: '周小', to: '周晓' }]),
    step(
      2,
      [{ field: 'comment', from: null, to: '展会上认识' }],
      'comment.create',
    ),
  ],
  ...overrides,
});

function renderWith(node: React.ReactNode): void {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  chatFake.reset();
  state.plans = [];
  state.api.mockReset();
  state.api.mockImplementation(async (path: string) =>
    path.startsWith('plans?')
      ? { data: state.plans, meta: { total: state.plans.length } }
      : { data: {} },
  );
});

describe('a plan card', () => {
  it('shows each change from its old value to its new one, without hover', () => {
    renderWith(<PlanCard plan={plan()} />);
    const card = screen.getByRole('region', { name: '更新周晓的线索' });
    const old = within(card).getByText('周小');
    expect(old.closest('.line-through')).toBeTruthy();
    expect(within(card).getByText('展会上认识')).toBeTruthy();
    expect(within(card).getByText('5 小时后过期')).toBeTruthy();
  });

  it('carries out the steps kept, and its button counts them', async () => {
    state.api.mockImplementation(async () => ({
      data: plan({ status: 'executed', deciderUserId: 'rep' }),
    }));
    renderWith(<PlanCard plan={plan()} />);
    await userEvent.click(
      screen.getByRole('checkbox', { name: '保留第 2 步' }),
    );
    const button = screen.getByRole('button', { name: '执行 1 项改动' });
    // In the AI's colour, as the assistant's confirmation cards were.
    expect(button.className).toContain('bg-ai');
    await userEvent.click(button);
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith('plans/p1/execute', 'POST', {
        revision: 3,
        skip: [2],
      }),
    );
  });

  it('says a plan that no longer exists is gone, and offers nothing', async () => {
    state.api.mockRejectedValue(
      new ApiClientError('gone', {
        status: 404,
        method: 'POST',
        url: '/api/plans/p1/void',
        payload: {
          error: { status: 'NOT_FOUND', reason: 'NOT_FOUND', domain: 'crm' },
        },
      }),
    );
    renderWith(<PlanCard plan={plan()} />);
    await userEvent.click(screen.getByRole('button', { name: '忽略' }));
    expect(await screen.findByText('这些建议的改动已不存在。')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '忽略' })).toBeNull();
    expect(document.activeElement?.textContent).toBe(
      '这些建议的改动已不存在。',
    );
  });

  it('shows a plan being carried out without its buttons', () => {
    renderWith(<PlanCard plan={plan({ status: 'executing' })} />);
    expect(screen.getByText('执行中…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /执行 \d/u })).toBeNull();
    expect(screen.queryByRole('button', { name: '忽略' })).toBeNull();
  });

  it('opens the conversation it came from in the assistant panel', async () => {
    renderWith(<PlanCard plan={plan()} />);
    await userEvent.click(screen.getByRole('button', { name: '来自对话' }));
    expect(chatFake.opened).toEqual([{ conversationId: 'c1', view: 'chat' }]);
  });

  it('explains a stale plan', () => {
    renderWith(
      <PlanCard plan={plan({ status: 'stale', failure: { position: 1 } })} />,
    );
    expect(screen.getByText(/涉及的记录在提出建议后被改动过/u)).toBeTruthy();
  });
});

describe("a record's waiting plans", () => {
  it('lead the particulars with their count, with no way to the inbox', async () => {
    state.plans = [plan()];
    renderWith(<WaitingPlans entity='leads' recordId='lead-1' />);
    const block = await screen.findByRole('region', { name: '等你决定' });
    expect(within(block).getByRole('heading', { level: 2 }).textContent).toBe(
      '等你决定: 1',
    );
    // Decided here or in their conversation, never in the inbox.
    expect(within(block).queryByRole('link', { name: /收件箱/u })).toBeNull();
    expect(state.api).toHaveBeenCalledWith(
      'plans?pageSize=100&target=leads%3Alead-1',
    );
  });

  it('is absent when none waits', async () => {
    renderWith(<WaitingPlans entity='leads' recordId='lead-1' />);
    await waitFor(() => expect(state.api).toHaveBeenCalled());
    expect(screen.queryByRole('region')).toBeNull();
  });
});
