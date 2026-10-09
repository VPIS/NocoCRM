import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  findAIModel,
  useAI,
  type AIChatAttachment,
  type AIModel,
} from '@/extensions/nocobase-ai';
import { getEmployeeModels } from '@/extensions/nocobase-ai/providers/model.js';
import { CRM_ASSISTANT, usePanelOpen } from './assistant-state.js';
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

// What a question may bring besides its text (the overview's box): files
// already uploaded, and the model the new conversation runs on.
export interface AskExtras {
  attachments?: readonly AIChatAttachment[];
  model?: AIModel;
}

// Ask the panel: a new conversation, from the page's record when there is
// one, sending the question when there is one (the dock's phone button sends
// none).
export function ask(
  prompt: string,
  record?: CurrentRecord,
  extras: AskExtras = {},
): void {
  const attachments = extras.attachments ?? [];
  window.dispatchEvent(
    new CustomEvent('crm-assistant', {
      detail: {
        prompt,
        ...(prompt || attachments.length ? { send: true } : {}),
        newConversation: true,
        ...(attachments.length ? { attachments } : {}),
        ...(extras.model
          ? {
              model: {
                ...(extras.model.llmService
                  ? { llmService: extras.model.llmService }
                  : {}),
                model: extras.model.value,
              },
            }
          : {}),
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

// The files a question carries, uploaded to the AI Employee plugin's storage
// as soon as they are picked, as the chat's own composer does, so the
// conversation receives them ready. No local preview is made: an image
// shows the preview the upload returns.
export function useAskAttachments(): {
  attachments: readonly AIChatAttachment[];
  uploading: boolean;
  upload: (files: readonly File[]) => void;
  remove: (uid: string) => void;
  clear: () => void;
} {
  const { uploadFile } = useAI();
  const [attachments, setAttachments] = useState<readonly AIChatAttachment[]>(
    [],
  );
  const upload = useCallback(
    (files: readonly File[]): void => {
      for (const file of files) {
        const uid = `upload-${crypto.randomUUID()}`;
        const pending: AIChatAttachment = {
          uid,
          filename: file.name || `pasted-${String(Date.now())}`,
          status: 'uploading',
          size: file.size,
          mimetype: file.type,
        };
        setAttachments((current) => [...current, pending]);
        const replace = (next: AIChatAttachment): void =>
          setAttachments((current) =>
            current.map((item) => (item.uid === uid ? next : item)),
          );
        uploadFile(file).then(
          (response) => {
            const text = (value: unknown, fallback: string): string =>
              typeof value === 'string' ? value : fallback;
            replace({
              ...response,
              uid: text(response.id, uid),
              filename: text(
                response.filename ?? response.title,
                pending.filename,
              ),
              status: 'done',
              size:
                typeof response.size === 'number' ? response.size : file.size,
              mimetype: text(response.mimetype, file.type),
              url: typeof response.url === 'string' ? response.url : undefined,
              preview:
                typeof response.preview === 'string'
                  ? response.preview
                  : file.type.startsWith('image/') &&
                      typeof response.url === 'string'
                    ? response.url
                    : undefined,
            });
          },
          (error: unknown) =>
            replace({
              ...pending,
              status: 'error',
              ...(error instanceof Error ? { error: error.message } : {}),
            }),
        );
      }
    },
    [uploadFile],
  );
  const remove = useCallback(
    (uid: string) =>
      setAttachments((current) => current.filter((item) => item.uid !== uid)),
    [],
  );
  const clear = useCallback(() => setAttachments([]), []);
  return {
    attachments,
    uploading: attachments.some((item) => item.status === 'uploading'),
    upload,
    remove,
    clear,
  };
}

// The models the CRM employee may run on (its dedicated models, else every
// enabled one) and the one picked for the next conversation: the first until
// the user picks another, which this browser remembers.
const MODEL_KEY = 'nococrm:ask-model';

export function useAskModel(): {
  models: readonly AIModel[];
  model: AIModel | undefined;
  select: (key: string) => void;
} {
  const { employees, models: all } = useAI();
  const employee = employees.find((item) => item.username === CRM_ASSISTANT);
  const models = useMemo(
    () => getEmployeeModels(all, employee),
    [all, employee],
  );
  const [key, setKey] = useState(() => {
    try {
      return localStorage.getItem(MODEL_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const select = useCallback((next: string): void => {
    setKey(next);
    try {
      localStorage.setItem(MODEL_KEY, next);
    } catch {
      // Storage may be unavailable; the choice then lasts for the page.
    }
  }, []);
  return { models, model: findAIModel(models, key) ?? models[0], select };
}

// A question being written in one of the ask boxes: its text, its files and
// the model picked, and sending it, which asks the panel for a new
// conversation (from the page's record, when given) and empties the box.
export interface AskDraft {
  value: string;
  setValue: (value: string) => void;
  files: ReturnType<typeof useAskAttachments>;
  models: readonly AIModel[];
  model: AIModel | undefined;
  selectModel: (key: string) => void;
  canSend: boolean;
  // Sends the text given (a suggested question) or else the box's own;
  // false when there is nothing to send or the box cannot send yet.
  send: (prompt?: string) => boolean;
}

export function useAskDraft(
  record: CurrentRecord | undefined,
  disabled: boolean,
): AskDraft {
  const files = useAskAttachments();
  const { models, model, select } = useAskModel();
  const [value, setValue] = useState('');
  const ready = files.attachments.filter((item) => item.status === 'done');
  const send = (prompt?: string): boolean => {
    const question = (prompt ?? value).trim();
    if (disabled || files.uploading || (!question && !ready.length))
      return false;
    ask(question, record, { attachments: ready, model });
    setValue('');
    files.clear();
    focusComposer();
    return true;
  };
  return {
    value,
    setValue,
    files,
    models,
    model,
    selectModel: select,
    canSend:
      !disabled && !files.uploading && Boolean(value.trim() || ready.length),
    send,
  };
}
