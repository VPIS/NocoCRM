import { useCan } from '@nocobase/app-plugin-authorization/client';
import { useQuery } from '@tanstack/react-query';
import { useCrmApi, useCrmScopeKey } from '../api.js';

// The company's WhatsApp number as the pages read it (server/routes/
// whatsapp.ts): conversations, their messages, the menu's unread count.

export type ConversationView = 'mine' | 'unlinked' | 'all';
export type CustomerState = 'unlinked' | 'linked' | 'dismissed' | 'spam';

export interface WhatsAppMedia {
  status: 'pending' | 'stored' | 'unavailable';
  fileId: string | null;
  // The stored file's address; add ?inline=1 to show it.
  url: string | null;
  mimeType: string | null;
  filename: string | null;
}
export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  direction: 'in' | 'out';
  origin: string;
  type: string;
  text: string | null;
  caption: string | null;
  media: WhatsAppMedia | null;
  replyTo: string | null;
  status: string | null;
  sentById: string | null;
  occurredAt: string;
  // On a record's tab: whose message it is.
  waContactId?: string | null;
}
export interface WhatsAppCustomer {
  id: string;
  name: string;
  phone: string | null;
  username: string | null;
  profileName: string | null;
  state: CustomerState;
  leadId: string | null;
  contactId: string | null;
  matchedBy: string | null;
}
export interface ConversationRow {
  id: string;
  waContactId: string;
  name: string;
  phone: string | null;
  state: CustomerState;
  leadId: string | null;
  contactId: string | null;
  handlerId: string | null;
  lastMessageAt: string | null;
  lastDirection: string | null;
  unreadCount: number;
  last: {
    type: string;
    text: string | null;
    caption: string | null;
    direction: string;
    occurredAt: string;
  } | null;
}
export interface Conversation {
  id: string;
  handlerId: string | null;
  lastInboundAt: string | null;
  unreadCount: number;
  contact: WhatsAppCustomer;
  record: { entity: 'leads' | 'contacts'; id: string; name: string } | null;
  messages: WhatsAppMessage[];
  more: boolean;
}
export interface RecordMessages {
  messages: WhatsAppMessage[];
  more: boolean;
  people: WhatsAppCustomer[];
}

// How often the pages ask again: the list, the open conversation, the
// menu's count, a record's tab (design: kept current by polling, R4).
export const LIST_POLL_MS = 15_000;
export const CONVERSATION_POLL_MS = 10_000;
export const COUNT_POLL_MS = 30_000;
export const TAB_POLL_MS = 30_000;

export const WHATSAPP_PAGE = 'crm-whatsapp';

export function useWhatsAppPage(): boolean {
  return useCan({
    resource: { type: 'page', id: WHATSAPP_PAGE },
    action: 'access',
  }).can;
}

// The unread messages in the conversations the viewer answers, for the
// menu's WhatsApp entry; nothing is asked without the page.
export function useWhatsAppUnreadCount(): number {
  const can = useWhatsAppPage();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const { data } = useQuery({
    queryKey: [...scopeKey, 'whatsapp/unreadCount'],
    queryFn: () =>
      api<{ data: { count: number } }>('whatsapp/unreadCount').then(
        (r) => r.data.count,
      ),
    enabled: can,
    refetchInterval: COUNT_POLL_MS,
    staleTime: 10_000,
  });
  return data ?? 0;
}

export const VIEWS: readonly ConversationView[] = ['mine', 'unlinked', 'all'];

// The list's tab, from the address (?view=), Mine when it names none.
export function viewOf(params: URLSearchParams): ConversationView {
  const view = params.get('view');
  return VIEWS.includes(view as ConversationView)
    ? (view as ConversationView)
    : 'mine';
}

export function useConversationsKey(view?: ConversationView): unknown[] {
  return [
    ...useCrmScopeKey(),
    'whatsapp/conversations',
    ...(view ? [view] : []),
  ];
}

export function useConversationKey(id: string): unknown[] {
  return [...useCrmScopeKey(), `whatsapp/conversations/${id}`];
}
