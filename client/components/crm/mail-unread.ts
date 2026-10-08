import { realtimeClientToken, useService } from '@nocobase/app-client';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import {
  MAIL_REALTIME_TOPIC,
  useMailClient,
} from '@nocobase/app-plugin-mail/client';
import { useEffect, useState } from 'react';

// The workspace announces a change of the unread count with this window event
// when it marks mail read; the plugin's own navigation icon listens for it but
// does not export the name, so it is spelled out here.
const UNREAD_CHANGED_EVENT = 'nocobase:mail-unread-count-changed';
const REFRESH_INTERVAL_MS = 60_000;

/**
 * The signed-in user's unread mail across their connected mailboxes, for the
 * Mailbox entry's badge in the menu. It follows the plugin's own unread icon:
 * read on mount, again when the mail realtime topic reports a change or the
 * realtime connection reopens, when the workspace marks mail read, and every
 * minute as a fallback. Nothing is read for a user without the mail
 * workspace, whose requests the server would refuse.
 */
export function useMailUnreadCount(): number {
  const { can } = useCan({
    resource: { type: 'page', id: 'mail.workspace' },
    action: 'access',
  });
  const mail = useMailClient();
  const realtime = useService(realtimeClientToken);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!can) return;
    let active = true;
    let debounce: number | undefined;
    const refresh = () => {
      void mail
        .getUnreadCount()
        .then((count) => {
          if (active) setUnread(count);
        })
        .catch(() => undefined);
    };
    const schedule = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(refresh, 100);
    };
    refresh();
    const unsubscribeOpen = realtime.onOpen(schedule);
    const unsubscribeTopic = realtime.subscribe(
      MAIL_REALTIME_TOPIC,
      (event) => {
        const payload = event.payload as { kind?: unknown } | null;
        if (payload?.kind === 'mail.changed') schedule();
      },
    );
    const timer = window.setInterval(schedule, REFRESH_INTERVAL_MS);
    window.addEventListener(UNREAD_CHANGED_EVENT, schedule);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.clearTimeout(debounce);
      unsubscribeOpen();
      unsubscribeTopic();
      window.removeEventListener(UNREAD_CHANGED_EVENT, schedule);
    };
  }, [can, mail, realtime]);
  return can ? unread : 0;
}
