import { useQuery } from '@tanstack/react-query';
import type { EvaluationEntry } from './lead-evaluation.js';
import { recordTitle } from './lookups.js';
import {
  localDate,
  sentence,
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
  type CrmRecord,
} from './api.js';

// What waits on the reader from the AI (server/providers/crm/lead-evaluation.ts,
// pendingDecisions): its follow-ups of leads and deals and its reviews of
// approvals, the reader's own or, for someone who may edit every lead, the
// team's. They are a category of the inbox's To do view (a collection, since
// they live in the CRM's API, not among the in-app items): listed with what
// waits, chosen on the left, decided on the right as on the record's page.
// The assistant's cards in a conversation are decided there, not here.

export const DECISIONS_CATEGORY = 'crm-decisions';
// The chosen suggestion, and whose: the reader's own or the team's.
export const DECISION_PARAM = 'decision';
export const SCOPE_PARAM = 'decisionScope';

// Handled: decided on its card, or an approval's review voided because the
// approval was withdrawn or decided on the approval itself. A card being
// redone still waits.
export const isDecided = (entry: EvaluationEntry): boolean =>
  entry.status === 'accepted' ||
  entry.status === 'dismissed' ||
  (entry.status === 'superseded' &&
    Boolean((entry.ai as { approvalOutcome?: string }).approvalOutcome));

// A lead's or a deal's follow-up waiting on its decision, an approval's
// review waiting on its approver, or a task's preparation waiting on its
// owner, with the record it concerns.
export interface DecisionItem extends EvaluationEntry {
  entity: 'leads' | 'opportunities' | 'approvals' | 'tasks';
  task?: {
    id: string;
    name: string;
    ownerId: string | null;
    status: string;
    dueAt: string | null;
    internalParticipants: string[];
    leadId: string | null;
    companyId: string | null;
    opportunityId: string | null;
  };
  approval?: {
    id: string;
    name: string;
    topic: string;
    status: string;
    // The applicant.
    ownerId: string | null;
    opportunityId: string;
    opportunity: string | null;
  };
  lead?: {
    id: string;
    name: string;
    company: string | null;
    ownerId: string | null;
    status: string;
  };
  opportunity?: {
    id: string;
    name: string;
    company: string | null;
    ownerId: string | null;
    stage: string;
  };
}

// The record an item concerns, whichever it is.
export const recordOf = (
  entry: DecisionItem,
): { id: string; name: string; ownerId: string | null } =>
  (entry.lead ?? entry.opportunity ?? entry.approval ?? entry.task)!;

export const scopeOf = (params: URLSearchParams): 'mine' | 'team' =>
  params.get(SCOPE_PARAM) === 'team' ? 'team' : 'mine';

// Those waiting and, after them, those already decided. The list and the
// detail read the same query.
export function useDecisions(scope: 'mine' | 'team') {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const path = `decisions?scope=${scope}&state=all&pageSize=100`;
  return useQuery({
    queryKey: [...scopeKey, path],
    queryFn: () =>
      api<{
        data: DecisionItem[];
        meta: { total: number; pending: number };
      }>(path),
    // An evaluation finishing adds one; read again as the menu's count is,
    // and every few seconds while a card is being redone.
    refetchInterval: (query) =>
      query.state.data?.data.some((entry) => entry.status === 'running')
        ? 4000
        : 30000,
  });
}

// How an item reads in the list and in the detail's heading.
export function useWording() {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  return {
    nameOf: (entry: DecisionItem): string =>
      entry.lead
        ? recordTitle('leads', entry.lead as unknown as CrmRecord)
        : toText((entry.opportunity ?? entry.approval ?? entry.task)?.name),
    kindOf: (entry: DecisionItem): string =>
      sentence(text(`entity.${entry.entity}`)),
    ownerOf: (entry: DecisionItem): string =>
      toText(meta?.users.find((u) => u.id === recordOf(entry).ownerId)?.name),
    when: (at: string): string =>
      localDate(at, language, meta?.settings.timeZone ?? 'Asia/Shanghai'),
  };
}
