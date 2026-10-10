import { createContext, useContext } from 'react';
import type { Entity } from './api.js';

// The global search's shared state (global-search.tsx): kept above the
// dialog, so what was typed outlives closing it.

export interface GlobalSearch {
  readonly open: boolean;
  setOpen: (open: boolean) => void;
  readonly value: string;
  setValue: (value: string) => void;
}

export const GlobalSearchContext = createContext<GlobalSearch | undefined>(
  undefined,
);

export function useGlobalSearch(): GlobalSearch | undefined {
  return useContext(GlobalSearchContext);
}

// The shortcut as the platform writes it.
export const SEARCH_SHORTCUT =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/u.test(navigator.platform || navigator.userAgent)
    ? '⌘K'
    : 'Ctrl K';

// The kinds of record the search shows, in its order (the server's
// SEARCH_KINDS), and the page each opens.
export const SEARCH_KINDS: readonly Entity[] = [
  'leads',
  'opportunities',
  'companies',
  'contacts',
  'tasks',
  'approvals',
];
// The words a search is matched by, split as the server splits them
// (searchWords in server/providers/crm/service.ts), for setting them in bold.
export function searchWords(text: string): string[] {
  return text
    .split(/[\s,，、;；/|()（）[\]【】%_\\]+/u)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 8);
}
