import { useCan } from '@nocobase/app-plugin-authorization/client';
import {
  useInboxRefresh,
  useInboxUnreadCount,
} from '@nocobase/app-plugin-notification-in-app/client/inbox';
import { useQuery } from '@tanstack/react-query';
import { inboxBadgeText, useDocumentTitleBadge } from '../inbox-badge.js';
import {
  useCrmApi,
  useCrmQuery,
  useCrmScopeKey,
  useMetadata,
  type ListData,
} from './api.js';

// The count beside the inbox in the menu and leading the browser tab's title,
// "(3) NocoCRM": the AI's suggestions waiting on the reader (the inbox's To do,
// client/components/crm/inbox-decisions.tsx) and the unread notifications.
// They add up: a suggestion is not an in-app item, so neither is counted
// twice. The suggestions are read again every half minute, every few seconds
// while a follow-up is still being worked on (so its card is counted as soon
// as it is ready, wherever the reader is), and at once whenever the CRM's
// data refreshes; the unread count follows the in-app plugin's realtime
// events.
export function useInboxCount(): number {
  const { data: meta } = useMetadata();
  const { can } = useCan({
    resource: { type: 'page', id: 'crm-decisions' },
    action: 'access',
  });
  const shown = meta?.assistant === true && can;
  const { data } = useCrmQuery<{ count: number; running?: number }>(
    'decisions/count',
    shown,
    { refetchInterval: (latest) => (latest?.running ? 4000 : 30000) },
  );
  useInboxRefresh();
  const unread = useInboxUnreadCount().data ?? 0;
  const count = (shown ? (data?.count ?? 0) : 0) + unread;
  useDocumentTitleBadge(inboxBadgeText(count));
  return count;
}

// How many approvals wait on the reader's decision, for the count beside
// Approvals in the menu: submitted to them and not yet decided. Only for
// whoever may decide approvals; read again every half minute and at once
// whenever the CRM's data refreshes (a decision taken, one submitted here).
export function useApprovalsToDecide(): number {
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const me = meta?.users.find((u) => u.id === meta.userId);
  const decides = Boolean(me?.canApprove);
  const path = `approvals?approverId=${meta?.userId ?? ''}&status=pending&pageSize=1`;
  const { data } = useQuery({
    queryKey: [...scopeKey, path],
    queryFn: () => api<ListData>(path),
    enabled: decides,
    refetchInterval: 30000,
  });
  return decides ? (data?.meta.total ?? 0) : 0;
}

// How many runs each agent has under way, for the Agents entries in the
// menu: read every few seconds while any runs, every half minute otherwise,
// and only for whoever sees the Agents pages while the assistant is on.
export function useRunningAgents(): Record<string, number> {
  const { data: meta } = useMetadata();
  const { can } = useCan({
    resource: { type: 'page', id: 'crm-agents' },
    action: 'access',
  });
  const shown = meta?.assistant === true && can;
  const { data } = useCrmQuery<Record<string, number>>(
    'agents/running',
    shown,
    {
      refetchInterval: (latest) =>
        latest && Object.values(latest).some((n) => n > 0) ? 4000 : 30000,
    },
  );
  return shown ? (data ?? {}) : {};
}
