import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describeLifecycle } from '@nocobase/lifecycle';
import { expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';
import { approvalLifecycle } from '../../server/lifecycles/approvals.js';

// Settings → Approval process: the approvals' lifecycle, read only, drawn
// as a diagram with who takes each step beside it.
function english(key: string, options?: Record<string, unknown>): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  if (typeof value !== 'string') return key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(options?.[name] ?? ''),
  );
}
const diagram = vi.hoisted(() => ({ props: {} as Record<string, unknown> }));
const state = vi.hoisted(() => ({
  api: vi.fn(),
  rule: {
    roles: ['sales-manager'],
    users: [] as string[],
    revision: 0,
    updatedById: null as string | null,
    updatedAt: null as string | null,
    approvers: ['wang'],
  },
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({ text: english, language: 'en-US' }),
  useCrmQuery: (path: string) => ({
    isLoading: false,
    data:
      path === 'approverRule'
        ? state.rule
        : describeLifecycle(approvalLifecycle),
  }),
  useMetadata: () => ({
    data: {
      settings: { timeZone: 'Asia/Shanghai' },
      users: [
        { id: 'wang', name: 'Wang Fang', disabled: false },
        { id: 'li', name: 'Li Ming', disabled: false },
        { id: 'gone', name: 'Gone', disabled: true },
      ],
    },
  }),
  useCrmApi: () => state.api,
  useRefresh: () => async () => {},
}));
// The multi-selects are the form's, a popup jsdom does not open; ticks
// stand in for them.
vi.mock('../../client/components/crm/form.js', () => ({
  MultiChoice: ({
    label,
    value,
    onChange,
    choices,
  }: {
    label: string;
    value: string[];
    onChange: (next: string[]) => void;
    choices: { value: string; label: string }[];
  }) => (
    <fieldset aria-label={label}>
      {choices.map((choice) => (
        <label key={choice.value}>
          <input
            type='checkbox'
            checked={value.includes(choice.value)}
            onChange={() =>
              onChange(
                value.includes(choice.value)
                  ? value.filter((item) => item !== choice.value)
                  : [...value, choice.value],
              )
            }
          />
          {choice.label}
        </label>
      ))}
    </fieldset>
  ),
}));
// The diagram's layout and canvas need a browser; its props are what this
// page decides.
vi.mock('#components/lifecycle-diagram', () => ({
  LifecycleDiagram: (props: Record<string, unknown>) => {
    diagram.props = props;
    return <div data-testid='diagram' />;
  },
}));
const { default: ApprovalFlowPage } =
  await import('../../client/pages/settings/approval-flow/index.js');

it('draws the approval process with its states and actions named as the CRM names them, and who takes each step', () => {
  render(<ApprovalFlowPage />);
  expect(screen.getByTestId('diagram')).toBeTruthy();
  const stateLabel = diagram.props.stateLabel as (state: {
    name: string;
  }) => string;
  const transitionLabel = diagram.props.transitionLabel as (transition: {
    name: string;
  }) => string;
  expect(stateLabel({ name: 'pending' })).toBe('Pending approval');
  expect(transitionLabel({ name: 'submit' })).toBe('Submit for approval');
  // One card a step, saying who takes it.
  expect(screen.getByText('Withdraw request')).toBeTruthy();
  expect(
    screen.getAllByText('The chosen approver, who is never the applicant.'),
  ).toHaveLength(2);
  // The final states, named.
  expect(
    screen.getByText(
      'Approved and Rejected end a request: to ask again, raise a new approval.',
    ),
  ).toBeTruthy();
});

it('sets who may approve: the roles and people chosen, saved from the version shown', async () => {
  state.api.mockResolvedValue({ data: state.rule });
  render(<ApprovalFlowPage />);
  expect(screen.getByText('Who may approve')).toBeTruthy();
  expect(
    screen.getByText(
      'Approvers now: Wang Fang. Each must be active and hold the Decide approvals permission.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('The default: sales managers.')).toBeTruthy();
  const save = screen.getByRole('button', { name: 'Save' });
  // Nothing changed yet.
  expect((save as HTMLButtonElement).disabled).toBe(true);
  // A disabled user is not offered.
  expect(screen.queryByLabelText('Gone')).toBeNull();
  fireEvent.click(screen.getByLabelText('Administrator'));
  fireEvent.click(screen.getByLabelText('Li Ming'));
  expect((save as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(save);
  await waitFor(() => expect(state.api).toHaveBeenCalled());
  const [path, method, body] = state.api.mock.calls[0] as [
    string,
    string,
    Record<string, unknown>,
  ];
  expect([path, method]).toEqual(['approverRule', 'PUT']);
  expect(body).toMatchObject({
    roles: ['sales-manager', 'system-administrator'],
    users: ['li'],
    revision: 0,
  });
  expect(typeof body.requestId).toBe('string');
});

it('says who set the rule and when, once an administrator has', () => {
  state.rule = {
    ...state.rule,
    revision: 2,
    updatedById: 'li',
    updatedAt: '2026-10-14T02:30:00.000Z',
  };
  render(<ApprovalFlowPage />);
  expect(
    screen.getByText('Version 2, set by Li Ming at 2026-10-14 10:30.'),
  ).toBeTruthy();
});
