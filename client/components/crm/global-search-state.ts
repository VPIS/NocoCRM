import { createContext, useContext } from 'react';
import type { Entity } from './api.js';

// The global search's shared state (global-search.tsx): kept above the
// dialog, so closing it mid-answer loses nothing.

export type SearchMode = 'search' | 'ask';

// The records an AI answer handed over with presentRecords.
export interface FoundRecords {
  readonly entity: Entity;
  readonly ids: readonly string[];
  readonly title: string;
  // More ids than the tool keeps were given.
  readonly capped: boolean;
}

// An AI answer as the dialog shows it.
export interface SearchAnswer {
  readonly question: string;
  readonly working: boolean;
  readonly step?: string;
  readonly text: string;
  readonly found?: FoundRecords;
  readonly decision: boolean;
  readonly failed?: string;
  // Its conversation is still there to open (a decision or a failure).
  readonly conversationId?: string;
}

export interface GlobalSearch {
  readonly open: boolean;
  setOpen: (open: boolean) => void;
  readonly value: string;
  setValue: (value: string) => void;
  readonly mode: SearchMode;
  setMode: (mode: SearchMode) => void;
  readonly answer?: SearchAnswer;
  ask: (question: string) => void;
  clearAnswer: () => void;
  followUp: () => void;
  openConversation: () => void;
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
// The ids presentRecords keeps.
export const MAX_FOUND = 200;

// How the employee answers a search question, in the search's page context
// (the work context every question carries) beside its system prompt: a
// model given them only in the system prompt answered a search like a chat,
// listing the records in a table and offering changes.
export const SEARCH_INSTRUCTIONS =
  'This is the CRM global search. The text after [CRM search] is what the user typed. When it describes or names records (a keyword, a name, a kind of record with conditions), find them with search_records and run presentRecords once with their ids: for the kind the question is about, or, when the matches span kinds, for the kind with the most of them. Then reply with one short sentence saying how you matched them. Never list or tabulate the records (the search shows them), never offer or propose changes, never ask follow-up questions, never search the web. When it asks for anything else, answer in at most three sentences.';

// The message sent to the CRM employee: the question after the marker that
// keeps its conversation out of the lists (search-chat.ts) and tells the
// employee it comes from the search, whose handling its system prompt
// states; a kept conversation shows just this as the user's message.
export function askPrompt(marker: string, question: string): string {
  return `${marker} ${question}`;
}

// The words a search is matched by, split as the server splits them
// (searchWords in server/providers/crm/service.ts), for setting them in bold.
export function searchWords(text: string): string[] {
  return text
    .split(/[\s,，、;；/|()（）[\]【】%_\\]+/u)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 8);
}
