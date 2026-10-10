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

// The record a notification is about opens in the detail page's drawer over
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
 * notifications are known to the CRM (`inbox-notices.ts`), and picking one opens the record it is about in a drawer over
 * the inbox, at the comment it concerns, the detail pane left to a hint.
 */
export default function InboxPage(): ReactElement {
  const { registry, key } = useCrmInboxRegistry();
  const drawer = useRecordDrawerState();
  const navigate = useNavigate();
  // Loaded on the first open and kept mounted after, so closing animates.
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  if (drawer.opened && !drawerLoaded) setDrawerLoaded(true);
  // Picking one of the CRM's notifications opens its record in the drawer,
  // its timeline at the comment's thread (?focus=); picking anything else
  // closes it.
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
    const target = `${data.entity ?? ''}/${data.recordId}`;
    const focus = data.comment?.thread || data.comment?.id;
    // A phone has no drawer: the record's page opens instead, once the
    // pick is in the address.
    if (window.matchMedia('(max-width: 767px)').matches) {
      const search = focus ? `?focus=${encodeURIComponent(focus)}` : '';
      setTimeout(() => void navigate(`/crm/${target}${search}`));
      return;
    }
    params.set('open', target);
    if (focus) params.set('focus', focus);
  };
  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      {/* No line under the heading, as the CRM's list pages have none. */}
      <InboxBlock
        key={key}
        registry={registry}
        source={crmInboxSource}
        selectParams={selectParams}
        description=''
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
