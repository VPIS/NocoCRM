import { useEffect, useSyncExternalStore } from 'react';

// The record the page shows, for the assistant's dock (assistant-dock.tsx),
// which sits in the layout and so cannot see the page: a question asked from
// a record's page starts its conversation from that record, as the record's
// "Ask AI" once did. Record pages announce their record; the newest
// announcement still standing is the current one, and a page that goes away
// withdraws only its own, so moving from one record to the next never clears
// the new page's.

export interface CurrentRecord {
  readonly entity: string;
  readonly recordId: string;
  // The record's title as its page shows it, once the page has loaded it.
  readonly name?: string;
}

const announcements: { token: symbol; record: CurrentRecord }[] = [];
const listeners = new Set<() => void>();
let current: CurrentRecord | undefined;

function publish(): void {
  current = announcements.at(-1)?.record;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Called by a record's page with the record it shows; pass undefined to
// announce nothing (a record page inside the record drawer, whose backdrop
// covers the dock).
export function useAnnounceRecord(record: CurrentRecord | undefined): void {
  const entity = record?.entity;
  const recordId = record?.recordId;
  const name = record?.name;
  useEffect(() => {
    if (!entity || !recordId) return;
    const token = Symbol('record');
    announcements.push({ token, record: { entity, recordId, name } });
    publish();
    return () => {
      const index = announcements.findIndex((item) => item.token === token);
      if (index >= 0) announcements.splice(index, 1);
      publish();
    };
  }, [entity, recordId, name]);
}

export function useCurrentRecord(): CurrentRecord | undefined {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => undefined,
  );
}
