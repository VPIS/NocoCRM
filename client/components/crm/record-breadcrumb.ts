import { usePageBreadcrumb } from '@nocobase/app-client';
import { useMemo } from 'react';
import { useCrmText, type Entity } from './api.js';

// A record's page names its kind in the header's breadcrumb ("Leads"), as
// its object's list does; the record's own title is the page's heading. The
// record route has no menu entry of its own, and its path names the object
// by a parameter, so the route trail would show nothing. Not from the record
// drawer, whose page beneath keeps its trail.
export function useRecordBreadcrumb(entity: Entity, active: boolean): void {
  const { text } = useCrmText();
  const label = text(`entities.${entity}`);
  const levels = useMemo(
    () => (active ? [{ label }] : undefined),
    [active, label],
  );
  usePageBreadcrumb(levels);
}
