import {
  Bell,
  Building2,
  Handshake,
  ListChecks,
  Radar,
  SquareCheckBig,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { InboxNotice } from '#extensions/nocobase-inbox/model';
import { defineInboxRenderer } from '#extensions/nocobase-inbox/registry';
import type { InboxSource } from '#extensions/nocobase-inbox/source';
import { CrmNoticeDetail } from './inbox-notice-detail.js';
import { sentence, toText, useCrmText } from './api.js';

// The inbox's knowledge of the notifications the CRM sends (the server's
// notices.ts): the template's InboxSource asks the CRM about each in-app
// item by its notification id, and this renderer draws those it knows — the
// record's kind on the card; picked, the record in the detail pane, at the
// comment it concerns (inbox-notice-detail.tsx), or on a phone its page
// (client/pages/inbox.tsx).
// An item the CRM did not send keeps the inbox's plain rendering.

export const crmInboxSource: InboxSource = {
  id: 'crm',
  notices: async (notificationIds, { api, signal }) => {
    if (!notificationIds.length) return [];
    const response = await api.request<{ data?: unknown }>({
      path: `notices?ids=${encodeURIComponent(notificationIds.join(','))}`,
      signal,
    });
    // What it does not know stays a plain notification.
    return Array.isArray(response?.data)
      ? (response.data as InboxNotice[])
      : [];
  },
};

// The record's menu icon.
const ICONS: Record<string, LucideIcon> = {
  leads: Radar,
  opportunities: Handshake,
  companies: Building2,
  contacts: UserRound,
  tasks: SquareCheckBig,
  approvals: ListChecks,
};

export const crmNoticeRenderer = defineInboxRenderer<unknown>({
  source: 'crm',
  icon: (entry) => ICONS[entry.notice?.subject?.type ?? ''] ?? Bell,
  useWording() {
    const { text } = useCrmText();
    return {
      // The record's kind, as the card and the detail name it.
      label: (entry) =>
        sentence(toText(text(`entity.${entry.notice?.subject?.type ?? ''}`))),
      text: ({ item }) => ({
        title: item.title ?? '',
        sentence: item.body && item.body !== item.title ? item.body : null,
      }),
    };
  },
  Placeholder: CrmNoticeDetail,
});
