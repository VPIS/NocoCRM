import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crmZh } from '../../client/locales/crm/index.js';

// An AI agent's suggestion in a conversation is its own card, the one the
// record's timeline and the inbox show; a card replaced since says so.

const state = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
}));

vi.mock('../../client/components/crm/lead-evaluation.js', () => ({
  VerdictPanel: ({
    entry,
    heading,
  }: {
    entry: { id: string };
    heading: React.ReactNode;
  }) => (
    <div>
      {heading}
      <p>verdict {entry.id}</p>
    </div>
  ),
}));
vi.mock('../../client/components/crm/approval-review.js', () => ({
  ReviewPanel: ({ entry }: { entry: { id: string } }) => (
    <p>review {entry.id}</p>
  ),
}));
vi.mock('../../client/components/crm/task-preparation.js', () => ({
  PrepPanel: ({ entry }: { entry: { id: string } }) => <p>prep {entry.id}</p>,
}));
vi.mock('../../client/components/crm/common.js', () => ({
  RecordLink: ({ record }: { record: { name: string } }) => (
    <a href='#record'>{record.name}</a>
  ),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const lookup = (key: string): unknown =>
    key
      .split('.')
      .reduce<unknown>(
        (node, part) => (node as Record<string, unknown>)?.[part],
        crmZh,
      );
  const text = (key: string, options: Record<string, unknown> = {}): string => {
    const value = lookup(key);
    return typeof value === 'string'
      ? value.replace(/\{\{(\w+)\}\}/gu, (_, name: string) =>
          String(options[name] ?? ''),
        )
      : key;
  };
  return {
    ...actual,
    useCrmText: () => ({ text, language: 'zh-CN' }),
    useCrmQuery: (path: string) => ({
      isLoading: false,
      data: state.data[path],
    }),
  };
});

const { SuggestionCard } =
  await import('../../client/components/crm/agent-chat/suggestion-card.js');

function renderCard(node: React.ReactNode): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const entry = (id: string, revises?: string) => ({
  id,
  status: 'pending',
  createdAt: '2026-10-16T06:00:00.000Z',
  ai: revises ? { revises } : {},
});

beforeEach(() => {
  state.data = {
    'leads/lead-1': {
      record: { id: 'lead-1', name: '杜楠', company: '振华重工' },
      permissions: { edit: true, delete: false, approve: false },
    },
    'approvals/ap-1': {
      record: { id: 'ap-1', name: '九折' },
      permissions: { edit: false, delete: false, approve: true },
    },
  };
});

describe('a suggestion in a conversation', () => {
  it("is the record's own card, named as its record is everywhere", () => {
    state.data['leads/lead-1/evaluations/latest'] = entry('e1');
    renderCard(
      <SuggestionCard entity='leads' recordId='lead-1' entryId='e1' />,
    );
    expect(screen.getByText('verdict e1')).toBeTruthy();
    // Named as a lead is everywhere: the person and the company.
    expect(screen.getByRole('link', { name: '杜楠 / 振华重工' })).toBeTruthy();
  });

  it('stays shown once redone, and says when it was replaced otherwise', () => {
    state.data['leads/lead-1/evaluations/latest'] = entry('e2', 'e1');
    renderCard(
      <SuggestionCard entity='leads' recordId='lead-1' entryId='e1' />,
    );
    expect(screen.getByText('verdict e2')).toBeTruthy();
  });

  it('says a card replaced since by another is no longer the one', () => {
    state.data['leads/lead-1/evaluations/latest'] = entry('e3');
    renderCard(
      <SuggestionCard entity='leads' recordId='lead-1' entryId='e1' />,
    );
    expect(screen.getByText(/这条建议已被新的建议替换/u)).toBeTruthy();
  });

  it("shows an approval's review as its approver's card", () => {
    state.data['approvals/ap-1/reviews/latest'] = entry('r1');
    renderCard(
      <SuggestionCard entity='approvals' recordId='ap-1' entryId='r1' />,
    );
    expect(screen.getByText('review r1')).toBeTruthy();
  });
});
