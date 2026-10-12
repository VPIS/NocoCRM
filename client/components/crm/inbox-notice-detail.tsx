import type { ReactElement } from 'react';
import type { InboxEntry } from '#extensions/nocobase-inbox/model';
import type { Entity } from './api.js';
import { RecordPaneFrame } from './inbox-decisions-view.js';

const ENTITIES = new Set<string>([
  'leads',
  'opportunities',
  'companies',
  'contacts',
  'tasks',
  'approvals',
]);

// The inbox's detail pane while one of the CRM's notifications is picked:
// the record it is about, as an AI suggestion's pane draws its record
// (RecordPaneFrame), its timeline at the comment or the reply a mention or a
// reply notification is about.
export function CrmNoticeDetail({
  entry,
  onBack,
}: {
  readonly entry: InboxEntry;
  readonly onBack?: () => void;
}): ReactElement | null {
  const data = (entry.notice?.data ?? {}) as {
    entity?: string;
    recordId?: string;
    comment?: { id?: string; thread?: string } | null;
  };
  if (!data.recordId || !ENTITIES.has(data.entity ?? '')) return null;
  // The comment or the reply itself, its thread unfolded around it.
  const focus = data.comment?.id || data.comment?.thread || undefined;
  return (
    <RecordPaneFrame
      entity={data.entity as Entity}
      recordId={data.recordId}
      focus={focus}
      paneKey={entry.item.id}
      onBack={onBack}
    />
  );
}
