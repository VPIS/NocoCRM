import { useSyncExternalStore } from 'react';
import {
  createAIChatController,
  type AIEmployeeTask,
  type AIWorkContextItem,
} from '@/extensions/nocobase-ai';
import { CRM_ASSISTANT } from './assistant-state.js';
import { IDLE_SEARCH_CHAT, type SearchChatState } from './search-turn.js';

// The global search's own conversation with the CRM employee, which no
// window shows (`SearchChat` in ai-chat.tsx mounts its chat provider beside
// the panel's): asking from the search neither opens the panel nor replaces
// the conversation in it. One for the whole page, so a question keeps
// running while the search dialog is closed.

// What every question from the search starts with, so its conversation's
// title (the plugin titles a conversation with its first message's first 30
// characters) marks it: the CRM's AI service wrapper leaves such
// conversations out of every list (ai-chat.tsx), and deletes those left
// behind when the assistant loads. A kept one is renamed to its question.
export const SEARCH_MARKER = '[CRM search]';
export const isSearchConversation = (title: string): boolean =>
  title.startsWith(SEARCH_MARKER);

const controller = createAIChatController();
let state: SearchChatState = IDLE_SEARCH_CHAT;
const listeners = new Set<() => void>();

export const searchChat = {
  controller,
  getState: (): SearchChatState => state,
  // The bridge in ai-chat.tsx publishes the chat's progress here.
  setState: (next: SearchChatState): void => {
    state = next;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  // Sends a question in a new conversation of its own.
  ask: (
    prompt: string,
    workContext: readonly AIWorkContextItem[],
    model?: AIEmployeeTask['model'],
  ): void =>
    controller.triggerTask({
      aiEmployee: CRM_ASSISTANT,
      task: {
        message: { user: prompt, workContext: [...workContext] },
        ...(model ? { model } : {}),
        // A search reads the CRM; it never searches the web.
        webSearch: false,
        autoSend: true,
      },
      open: false,
    }),
};

export function useSearchChat(): SearchChatState {
  return useSyncExternalStore(
    searchChat.subscribe,
    searchChat.getState,
    searchChat.getState,
  );
}
