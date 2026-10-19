import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { recordOf } from './record-route.js';

// What each entry of this tab's history showed, by the router's place in it
// (`window.history.state.idx`): the page, a record's page whatever its tab,
// and whether a record's drawer was open over it. A record page's Back
// (crm-detail.tsx) walks back past the entries of the same record (its
// other tabs) and those with a drawer open, to the page before; an entry
// nothing noted (a page that hosts no drawer) is a page of its own. Kept in
// the session's storage, so a reload keeps it.

interface Entry {
  page: string;
  drawer: boolean;
}

const KEY = 'crm.pageHistory';

function read(): Record<string, Entry> {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Entry>) : {};
  } catch {
    return {};
  }
}

function placeNow(): number | null {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' ? idx : null;
}

// A record's page whatever its tab (/<entity>/<id>/<tab>); any other
// page by its path.
export function pageOf(pathname: string): string {
  const record = recordOf(pathname);
  return record ? `/${record.entity}/${record.id}` : pathname;
}

export function useNoteHistoryEntry(): void {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const place = placeNow();
    if (place === null) return;
    const entries = read();
    entries[String(place)] = {
      page: pageOf(pathname),
      drawer: new URLSearchParams(search).has('open'),
    };
    try {
      sessionStorage.setItem(KEY, JSON.stringify(entries));
    } catch {
      // Without storage, Back steps back one entry at a time.
    }
  }, [pathname, search]);
}

// How many entries back the page before this one is (a negative step), or
// null when there is none in this tab.
export function stepsToPageBefore(pathname: string): number | null {
  const place = placeNow();
  if (place === null || place <= 0) return null;
  const here = pageOf(pathname);
  const entries = read();
  for (let index = place - 1; index >= 0; index -= 1) {
    const entry = entries[String(index)];
    if (!entry || (entry.page !== here && !entry.drawer)) return index - place;
  }
  return null;
}
