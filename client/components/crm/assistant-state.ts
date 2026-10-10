import { useSyncExternalStore } from 'react';
import { useAI } from '#extensions/nocobase-ai';
import { toText, useCrmText } from './api.js';

// The assistant panel's state for what lives outside it (the dock,
// assistant-dock.tsx): whether it is open, and whether its chat can start.
// Kept apart from ai-chat.tsx so that file exports components only.

// The CRM's AI employee (server/ai/employees/crm-assistant.ts).
export const CRM_ASSISTANT = 'crm-assistant';

// Whether the panel is open, for the dock, which is not the panel's: the
// chat controller belongs to the panel alone (the plugin's
// useAIChatController makes one per component), so the panel publishes its
// state here and others ask it to open through an event.
const panelListeners = new Set<() => void>();
let panelOpen = false;
export function publishPanelOpen(open: boolean): void {
  if (panelOpen === open) return;
  panelOpen = open;
  for (const listener of panelListeners) listener();
}
function subscribePanel(listener: () => void): () => void {
  panelListeners.add(listener);
  return () => panelListeners.delete(listener);
}

// Asks the AI Employee's panel to close: Noco's panel (agent-chat/panel.tsx)
// opening, one panel showing at a time.
export const CLOSE_EMPLOYEE_PANEL = 'crm-assistant-close';

// Whether the AI Employee's panel is open, for the dock, which hides while
// it is, and for Noco's panel, which closes when it opens.
export function usePanelOpen(): boolean {
  return useSyncExternalStore(
    subscribePanel,
    () => panelOpen,
    () => false,
  );
}

// Whether the chat can start: the plugin's configuration loaded, the CRM
// employee among its employees and a model enabled, as the panel decides
// before mounting the chat; when it cannot, the reason, in the CRM's own words
// (never a provider's raw error message, which is no help on every page).
export type AssistantReadiness =
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'unavailable'; reason: string };
export function useAssistantReadiness(): AssistantReadiness {
  const { text } = useCrmText();
  const {
    configurationStatus,
    modelConfigurationError,
    employees,
    hasEnabledModels,
  } = useAI();
  if (configurationStatus === 'loading') return { state: 'loading' };
  if (configurationStatus === 'error')
    return {
      state: 'unavailable',
      reason: toText(text('assistantConfigError')),
    };
  if (!employees.some((employee) => employee.username === CRM_ASSISTANT))
    return {
      state: 'unavailable',
      reason: toText(text('assistantNoEmployee')),
    };
  if (modelConfigurationError || !hasEnabledModels)
    return {
      state: 'unavailable',
      reason: toText(text('assistantNoModel')),
    };
  return { state: 'ready' };
}

// ---- The sidebar's conversation list and the panel (sidebar-chats.tsx) ----

// A conversation the sidebar asked the panel to show, or a new one. The
// panel opens on the `crm-assistant-conversation` event; its chat, once
// mounted, carries the request out (OpenRequestedConversation in
// ai-chat.tsx) and clears it.
// A conversation's id, or `'new'` for a new one.
export type ConversationRequest = string;
let conversationRequest: ConversationRequest | undefined;
const requestListeners = new Set<() => void>();
function setRequest(next: ConversationRequest | undefined): void {
  conversationRequest = next;
  for (const listener of requestListeners) listener();
}
export function requestConversation(target: ConversationRequest): void {
  setRequest(target);
  window.dispatchEvent(new CustomEvent('crm-assistant-conversation'));
}
export function clearConversationRequest(): void {
  setRequest(undefined);
}
export function useConversationRequest(): ConversationRequest | undefined {
  return useSyncExternalStore(
    (listener) => {
      requestListeners.add(listener);
      return () => requestListeners.delete(listener);
    },
    () => conversationRequest,
    () => undefined,
  );
}
