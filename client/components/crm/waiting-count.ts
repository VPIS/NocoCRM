import { useCan } from '@nocobase/app-plugin-authorization/client';
import {
  useInboxRefresh,
  useInboxUnreadCount,
} from '@nocobase/app-plugin-notification-in-app/client/inbox';
import { inboxBadgeText, useDocumentTitleBadge } from '../inbox-badge.js';
import { useCrmQuery, useMetadata } from './api.js';

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
