import { useChatPanel } from '@nocobase/app-plugin-agents/client/chat';
import type { ChatModelChoice } from '@nocobase/app-plugin-agents/shared/conversations';
import { useEffect, useRef, useState } from 'react';
import {
  recordPin,
  useAgentModels,
  useAgentReadiness,
  useAskAgent,
  useAskFiles,
} from './agent-chat/ask.js';
import { usePanelOpen } from './assistant-state.js';
import type { Entity } from './api.js';
import type { CurrentRecord } from './current-record.js';

// What the assistant's ask boxes share: the dock at the bottom of the pages
// (assistant-dock.tsx) and the box at the top of the overview
// (assistant-ask-box.tsx). Since migration step 3 they ask Noco, the CRM's
// agent on the Agents plugin, in its panel (agent-chat/); the AI Employee's
// panel is asked only by the reports page's AI analysis (`ask`).

// The overview's suggested questions, as keys under `dock.q`; `prompt`
// names another key of the crm locale to send instead of the label.
export const HOME_QUESTIONS: readonly { key: string; prompt?: string }[] = [
  { key: 'home.focus' },
  { key: 'home.deals' },
  { key: 'home.followUp' },
];

// Asks the AI Employee's panel in a new conversation, sending the question:
// the reports page's AI analysis, whose report the Agents plugin has no
// counterpart for yet.
export function ask(prompt: string): void {
  window.dispatchEvent(
    new CustomEvent('crm-assistant', {
      detail: { prompt, send: Boolean(prompt), newConversation: true },
    }),
  );
}

// Once the AI Employee's panel has opened, focus goes to its composer;
// tried for a moment while the panel's chat mounts.
export function focusComposer(): void {
  let tries = 0;
  const attempt = (): void => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      '[data-crm-assistant-panel] textarea',
    );
    if (textarea) textarea.focus();
    else if (tries++ < 60) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

// When a panel closes (Noco's or the AI Employee's), focus left inside it
// (or fallen to the page) comes back to the box that `target` gives; focus
// the user has put elsewhere stays.
export function useFocusReturn(
  target: () => HTMLElement | null | undefined,
): void {
  const employeeOpen = usePanelOpen();
  const agentOpen = useChatPanel().open;
  const panelOpen = employeeOpen || agentOpen;
  const wasOpenRef = useRef(panelOpen);
  // Run again with each render's `target`; it acts only on the render where
  // the panel has just closed.
  useEffect(() => {
    if (wasOpenRef.current && !panelOpen) {
      const active = document.activeElement;
      // The AI Employee's panel stays mounted while closed, so focus can be
      // left on its hidden composer as well as on the page itself.
      const stranded =
        !active ||
        active === document.body ||
        !active.isConnected ||
        active.closest('[data-crm-assistant-panel]') !== null ||
        (typeof active.checkVisibility === 'function' &&
          !active.checkVisibility());
      if (stranded) target()?.focus();
    }
    wasOpenRef.current = panelOpen;
  }, [panelOpen, target]);
}

// Whether a panel shows (Noco's or the AI Employee's): the dock hides then.
export function useAnyPanelOpen(): boolean {
  const employeeOpen = usePanelOpen();
  return useChatPanel().open || employeeOpen;
}

// A question being written in one of the ask boxes: its text, its files and
// the model picked, and sending it, which starts a conversation with Noco
// (from the page's record, when given) and opens the panel on it.
export interface AskDraft {
  value: string;
  setValue: (value: string) => void;
  files: ReturnType<typeof useAskFiles>;
  models: readonly ChatModelChoice[];
  model: ChatModelChoice | undefined;
  selectModel: (key: string) => void;
  canSend: boolean;
  sending: boolean;
  // Sends the text given (a suggested question) or else the box's own;
  // false when there is nothing to send or the box cannot send yet.
  send: (prompt?: string) => boolean;
}

export function useAskDraft(
  record: CurrentRecord | undefined,
  disabled: boolean,
): AskDraft {
  const readiness = useAgentReadiness();
  const files = useAskFiles();
  const { models, model, select } = useAgentModels(readiness.agent);
  const askAgent = useAskAgent();
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const blocked = disabled || sending || files.uploading;
  const send = (prompt?: string): boolean => {
    const question = (prompt ?? value).trim();
    const agent = readiness.agent;
    if (blocked || !agent || (!question && !files.ready.length)) return false;
    const typed = value;
    const attachments = files.ready;
    setValue('');
    files.clear();
    setSending(true);
    askAgent({
      text: question,
      agent,
      attachments,
      ...(model ? { model } : {}),
      items: record
        ? [
            recordPin(
              record.entity as Entity,
              record.recordId,
              record.name ?? '',
            ),
          ]
        : [],
    })
      // Not even created: the question comes back to the box.
      .catch(() => setValue(typed))
      .finally(() => setSending(false));
    return true;
  };
  return {
    value,
    setValue,
    files,
    models,
    model,
    selectModel: select,
    canSend: !blocked && Boolean(value.trim() || files.ready.length),
    sending,
    send,
  };
}
