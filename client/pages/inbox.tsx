import { lazy, Suspense, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { InboxPage as InboxBlock } from '#extensions/nocobase-inbox/inbox-page';
import type { InboxEntry } from '#extensions/nocobase-inbox/model';
import { useCrmInboxRegistry } from '../components/crm/inbox-decisions.js';
import { crmInboxSource } from '../components/crm/inbox-notices.js';
import {
  RecordDrawerContext,
  useRecordDrawerState,
} from '../components/crm/record-drawer.js';

// The records the detail pane links to open in the detail page's drawer over
// the inbox; its code loads only when a record is first opened.
const RecordDrawer = lazy(() =>
  import('./crm-detail.js').then((module) => ({
    default: module.RecordDrawer,
  })),
);

const ENTITIES = new Set<string>([
  'leads',
  'opportunities',
  'companies',
  'contacts',
  'tasks',
  'approvals',
]);

/**
 * Route `/inbox`: the UI Library's inbox block over the in-app notification plugin, first in the menu's Action
 * section. Application change: its registry adds the AI's suggestions waiting on the reader to the To do view, as a
 * collection category read from the CRM's API (`client/components/crm/inbox-decisions.tsx`); the CRM's own
 * notifications are known to the CRM (`inbox-notices.ts`), and picking one shows the record it is about in the detail
 * pane, at the comment it concerns, as an AI suggestion's pane does.
 */
export default function InboxPage(): ReactElement {
  const { registry, key } = useCrmInboxRegistry();
  const drawer = useRecordDrawerState();
  const navigate = useNavigate();
  // Loaded on the first open and kept mounted after, so closing animates.
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  if (drawer.opened && !drawerLoaded) setDrawerLoaded(true);
  // Picking one of the CRM's notifications shows its record in the detail
  // pane (inbox-notice-detail.tsx); a phone, whose list and pane take turns,
  // opens the record's page instead, at the comment or reply (?focus=).
  // Records the pane links to open in the drawer over the inbox.
  const selectParams = (entry: InboxEntry, params: URLSearchParams): void => {
    params.delete('open');
    params.delete('focus');
    const data = (entry.notice?.data ?? {}) as {
      entity?: string;
      recordId?: string;
      comment?: { id?: string; thread?: string } | null;
    };
    if (entry.notice?.source !== 'crm' || !data.recordId) return;
    if (!ENTITIES.has(data.entity ?? '')) return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    const focus = data.comment?.id || data.comment?.thread;
    const search = focus ? `?focus=${encodeURIComponent(focus)}` : '';
    setTimeout(
      () =>
        void navigate(`/crm/${data.entity ?? ''}/${data.recordId}${search}`),
    );
  };
  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      <InboxBlock
        key={key}
        registry={registry}
        source={crmInboxSource}
        selectParams={selectParams}
      />
      {drawerLoaded && (
        <Suspense fallback={null}>
          <RecordDrawer
            target={drawer.opened}
            open={drawer.open}
            close={drawer.close}
          />
        </Suspense>
      )}
    </RecordDrawerContext.Provider>
  );
}
