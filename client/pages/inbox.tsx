import type { ReactElement } from 'react';

import { InboxPage as InboxBlock } from '#extensions/nocobase-inbox/inbox-page';
import { useCrmInboxRegistry } from '../components/crm/inbox-decisions.js';

/**
 * Route `/inbox`: the UI Library's inbox block over the in-app notification plugin, first in the menu's Action
 * section. Application change: its registry adds the AI's suggestions waiting on the reader to the To do view, as a
 * collection category read from the CRM's API (`client/components/crm/inbox-decisions.tsx`).
 */
export default function InboxPage(): ReactElement {
  const { registry, key } = useCrmInboxRegistry();
  // No line under the heading, as the CRM's list pages have none.
  return <InboxBlock key={key} registry={registry} description='' />;
}
