import { useEffect, useRef } from 'react';
import { usePanelOpen } from './assistant-state.js';
import type { CurrentRecord } from './current-record.js';

// What the assistant's ask boxes share: the dock at the bottom of the pages
// (assistant-dock.tsx) and the box at the top of the overview
// (assistant-ask-box.tsx).

// The overview's suggested questions, as keys under `dock.q`; `prompt`
// names another key of the crm locale to send instead of the label.
export const HOME_QUESTIONS: readonly { key: string; prompt?: string }[] = [
  { key: 'home.focus' },
  { key: 'home.deals' },
  { key: 'home.followUp' },
  { key: 'home.analyze', prompt: 'prompts.analyzeSales' },
];

// Ask the panel: a new conversation, from the page's record when there is
// one, sending the question when there is one (the dock's phone button sends
// none).
export function ask(prompt: string, record?: CurrentRecord): void {
  window.dispatchEvent(
    new CustomEvent('crm-assistant', {
      detail: {
        prompt,
        ...(prompt ? { send: true } : {}),
        newConversation: true,
        ...(record
          ? {
              entity: record.entity,
              recordId: record.recordId,
              ...(record.name ? { name: record.name } : {}),
            }
          : {}),
      },
    }),
  );
}

// Once the panel has opened, focus goes to its composer, so it never falls
// to the page when the dock hides; tried for a moment while the panel's chat
// mounts.
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

// When the panel closes, focus left inside it (or fallen to the page) comes
// back to the box that `target` gives; focus the user has put elsewhere
// stays.
export function useFocusReturn(
  target: () => HTMLElement | null | undefined,
): void {
  const panelOpen = usePanelOpen();
  const wasOpenRef = useRef(panelOpen);
  // Run again with each render's `target`; it acts only on the render where
  // the panel has just closed.
  useEffect(() => {
    if (wasOpenRef.current && !panelOpen) {
      const active = document.activeElement;
      // The panel stays mounted while closed, so focus can be left on its
      // hidden composer as well as on the page itself.
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
