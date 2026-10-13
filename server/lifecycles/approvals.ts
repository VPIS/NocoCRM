import {
  defineLifecycle,
  type Lifecycle,
  type LifecycleRecord,
  type TransitionContext,
} from '@nocobase/lifecycle';

// An approval's states as a record lifecycle of `@nocobase/lifecycle`: the
// state stays in its own `status`, and only the runtime changes it
// (CrmService.approvalAction fires these transitions; CrmService.save
// creates a draft through it). A draft or a withdrawn request is submitted
// to its approver; a pending one is withdrawn by its applicant, or approved
// or rejected by its approver, which ends it.
//
// The guards are the business rules the transitions keep whoever fires
// them. Permissions stay with the CRM: CrmService checks, before firing,
// that the applicant may still edit the deal, that the approver may
// decide (the `approve` capability) and is an active sales manager, and
// answers in its own error codes; these guards refuse what slips past.
// Side effects (the messages, the AI's review, the deal's follow-up) still
// run on CrmService's after-commit path, with the transitions.

export type ApprovalState =
  'draft' | 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface ApprovalRecord extends LifecycleRecord {
  readonly status: ApprovalState;
  readonly ownerId: string;
  readonly approverId: string | null;
}

export interface ApprovalTypes {
  record: ApprovalRecord;
  state: ApprovalState;
}

// The name the runtime keys every entry by: never rename it.
export const APPROVAL_LIFECYCLE = 'approvals';

// The longest decision comment kept, as the CRM's long texts.
const COMMENT_LIMIT = 10_000;

const applicantOnly = ({ record, actor }: TransitionContext<ApprovalTypes>) =>
  actor.id === record.ownerId || {
    code: 'approvalLocked',
    message: 'Only the applicant can do this.',
  };

const approverOnly = ({ record, actor }: TransitionContext<ApprovalTypes>) =>
  (actor.id === record.approverId && actor.id !== record.ownerId) || {
    code: 'forbidden',
    message: 'Only the approver, who is not the applicant, can decide.',
  };

const decided = ({ input, now }: TransitionContext<ApprovalTypes>) => ({
  decisionComment:
    typeof input.comment === 'string'
      ? input.comment.slice(0, COMMENT_LIMIT)
      : '',
  decidedAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

export const approvalLifecycle: Lifecycle<ApprovalTypes> =
  defineLifecycle<ApprovalTypes>({
    name: APPROVAL_LIFECYCLE,
    collection: 'crmApprovals',
    initial: 'draft',
    states: [
      'draft',
      'pending',
      { name: 'approved', final: true },
      { name: 'rejected', final: true },
      'withdrawn',
    ],
    transitions: {
      submit: {
        title: 'Submit',
        from: ['draft', 'withdrawn'],
        to: 'pending',
        guard: (context) => {
          const applicant = applicantOnly(context);
          if (applicant !== true) return applicant;
          return (
            Boolean(context.record.approverId) || {
              code: 'required',
              message: 'Choose an approver first.',
              kind: 'precondition',
            }
          );
        },
        // A new submission is decided afresh.
        set: ({ now }) => ({
          submittedAt: now.toISOString(),
          decisionComment: null,
          decidedAt: null,
          updatedAt: now.toISOString(),
        }),
      },
      withdraw: {
        title: 'Withdraw',
        from: 'pending',
        to: 'withdrawn',
        guard: applicantOnly,
        set: ({ now }) => ({ updatedAt: now.toISOString() }),
      },
      approve: {
        title: 'Approve',
        from: 'pending',
        to: 'approved',
        guard: approverOnly,
        set: decided,
      },
      reject: {
        title: 'Reject',
        from: 'pending',
        to: 'rejected',
        guard: approverOnly,
        set: decided,
      },
    },
  });
