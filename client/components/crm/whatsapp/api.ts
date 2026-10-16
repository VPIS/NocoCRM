import { useCan } from '@nocobase/app-plugin-authorization/client';
import { useQuery } from '@tanstack/react-query';
import { useCrmApi, useCrmScopeKey } from '../api.js';

// The company's WhatsApp numbers as the pages read them (server/routes/
// whatsapp.ts): conversations and their messages.

export type ConversationView = 'all' | 'unlinked';
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
  // Edited or deleted by the team on the WhatsApp Business app.
  editedAt?: string | null;
  revokedAt?: string | null;
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
// A number conversations are on, as the pages name it; mode 'demo' for the
// demo dataset's.
export interface WhatsAppNumberLabel {
  id: string;
  phone: string;
  name: string | null;
  mode: 'api' | 'coexistence' | 'demo';
}
export function numberLabel(number: WhatsAppNumberLabel): string {
  return number.name ? `${number.name} · ${number.phone}` : number.phone;
}
export interface ConversationRow {
  id: string;
  numberId: string;
  number: WhatsAppNumberLabel | null;
  waContactId: string;
  name: string;
  phone: string | null;
  state: CustomerState;
  leadId: string | null;
  contactId: string | null;
  lastMessageAt: string | null;
  lastDirection: string | null;
  // The customer's messages since the team's last reply: awaiting a reply
  // while above 0.
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
  lastInboundAt: string | null;
  unreadCount: number;
  number: WhatsAppNumberLabel | null;
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

// How often the pages ask again: the list, the open conversation, a
// record's tab (design: kept current by polling, R4).
export const LIST_POLL_MS = 15_000;
export const CONVERSATION_POLL_MS = 10_000;
export const TAB_POLL_MS = 30_000;

export const WHATSAPP_PAGE = 'crm-whatsapp';

export function useWhatsAppPage(): boolean {
  return useCan({
    resource: { type: 'page', id: WHATSAPP_PAGE },
    action: 'access',
  }).can;
}

// The numbers conversations can be on, for the list's filter and the
// conversations' number, shown once there are two or more.
export function useWhatsAppNumbers(): WhatsAppNumberLabel[] {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const { data } = useQuery({
    queryKey: [...scopeKey, 'whatsapp/numbers'],
    queryFn: () =>
      api<{ data: WhatsAppNumberLabel[] }>('whatsapp/numbers').then(
        (r) => r.data,
      ),
    staleTime: 60_000,
  });
  return data ?? [];
}

export const VIEWS: readonly ConversationView[] = ['all', 'unlinked'];

// The list's tab, from the address (?view=), All when it names none (or
// the Mine there was until 2026-10-16).
export function viewOf(params: URLSearchParams): ConversationView {
  const view = params.get('view');
  return VIEWS.includes(view as ConversationView)
    ? (view as ConversationView)
    : 'all';
}

export function useConversationsKey(
  view?: ConversationView,
  numberId?: string,
): unknown[] {
  return [
    ...useCrmScopeKey(),
    'whatsapp/conversations',
    ...(view ? [view, numberId ?? ''] : []),
  ];
}

export function useConversationKey(id: string): unknown[] {
  return [...useCrmScopeKey(), `whatsapp/conversations/${id}`];
}
