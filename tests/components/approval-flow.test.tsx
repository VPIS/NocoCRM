import { render, screen } from '@testing-library/react';
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
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({ text: english, language: 'en-US' }),
  useCrmQuery: () => ({
    isLoading: false,
    data: describeLifecycle(approvalLifecycle),
  }),
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
  await import('../../client/pages/settings/approval-flow.js');

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
