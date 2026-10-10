import { useToaster } from '@nocobase/app-client';
import {
  buildPageContext,
  newConversationAgent,
  useChatAgents,
  useChatApi,
  useChatAttachments,
  useChatPanel,
  type ChatContextItem,
} from '@nocobase/app-plugin-agents/client/chat';
import type {
  ChatAgent,
  ChatModelChoice,
  MessageAttachment,
} from '@nocobase/app-plugin-agents/shared/conversations';
import {
  CHAT_ATTACHMENT_SIZE_MAX,
  CHAT_ATTACHMENTS_PER_MESSAGE_MAX,
} from '@nocobase/app-plugin-agents/shared/conversations';
import { useCallback, useMemo, useState } from 'react';
import { toText, useCrmText, type Entity } from '../api.js';

// The CRM's ways into Noco's chat from outside its panel (migration step 3):
// whether it can answer, the models a new conversation may answer with, the
// files a question carries, asking a question at once (the dock, the
// overview's box) and opening a conversation to discuss a record or an AI
// card on it (the cards' Discuss). Built on the Agents plugin's headless
// chat; the panel itself is panel.tsx.

// An id for what the browser sends or uploads, matched in the answer.
const newClientId = (): string => crypto.randomUUID();

// Where the CRM's conversations come from (registered by the server's
// CrmAgentsProvider).
export const CRM_SOURCE = 'crm';

export type AgentReadiness =
  | { state: 'loading'; agent: null; reason?: undefined }
  | { state: 'ready'; agent: ChatAgent; reason?: undefined }
  | { state: 'unavailable'; agent: ChatAgent | null; reason: string };

// The agent a new conversation goes to, as the plugin picks it (the person's
// default, else the system default, else the first), and whether it can
// answer now.
export function useAgentReadiness(): AgentReadiness {
  const { text } = useCrmText();
  const agents = useChatAgents();
  if (agents.isLoading) return { state: 'loading', agent: null };
  // With no default set, the first the person may talk to: the CRM always
  // names the agent it creates a conversation with.
  const agent =
    newConversationAgent(agents.data, null) ?? agents.data?.[0] ?? null;
  if (!agent)
    return {
      state: 'unavailable',
      agent: null,
      reason: toText(text('agentPanel.notSetUp')),
    };
  if (!agent.availability.online && !agent.fallbackAgentId)
    return {
      state: 'unavailable',
      agent,
      reason: toText(
        text(
          `agentChat.offline.${agent.availability.reason ?? 'agentMissing'}`,
        ),
      ),
    };
  return { state: 'ready', agent };
}

// A model choice by a key a select can hold.
export const modelKey = (
  model: Pick<ChatModelChoice, 'modelService' | 'model'>,
): string => `${model.modelService}/${model.model}`;

const MODEL_KEY = 'nococrm:agent-model';

// The models the agent lists (its first the default) and the one picked for
// the next conversation, which this browser remembers.
export function useAgentModels(agent: ChatAgent | null): {
  models: readonly ChatModelChoice[];
  model: ChatModelChoice | undefined;
  select: (key: string) => void;
} {
  const models = useMemo(() => agent?.models ?? [], [agent]);
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
  return {
    models,
    model: models.find((item) => modelKey(item) === key) ?? models[0],
    select,
  };
}

// A file a question carries: uploading, sent once done, or refused.
export interface AskFile {
  uid: string;
  filename: string;
  size: number;
  mimeType: string;
  status: 'uploading' | 'done' | 'error';
  attachment?: MessageAttachment;
  error?: string;
}

// The files of a question, uploaded through the plugin as soon as they are
// picked, within its limits (size, count); the plugin's own error toasts
// tell why one is refused.
export function useAskFiles(): {
  files: readonly AskFile[];
  uploading: boolean;
  ready: readonly MessageAttachment[];
  upload: (files: readonly File[]) => void;
  remove: (uid: string) => void;
  clear: () => void;
} {
  const { text } = useCrmText();
  const toaster = useToaster();
  const uploads = useChatAttachments();
  const [files, setFiles] = useState<readonly AskFile[]>([]);
  const upload = useCallback(
    (picked: readonly File[]): void => {
      const room = CHAT_ATTACHMENTS_PER_MESSAGE_MAX - files.length;
      if (picked.length > room)
        toaster.show({
          type: 'error',
          title: toText(
            text('agentPanel.tooManyFiles', {
              count: CHAT_ATTACHMENTS_PER_MESSAGE_MAX,
            }),
          ),
        });
      const accepted = picked.slice(0, Math.max(0, room)).filter((file) => {
        if (file.size <= CHAT_ATTACHMENT_SIZE_MAX) return true;
        toaster.show({
          type: 'error',
          title: toText(text('agentPanel.fileTooLarge', { name: file.name })),
        });
        return false;
      });
      const pending = accepted.map((file) => ({
        file,
        entry: {
          uid: newClientId(),
          filename: file.name || `pasted-${String(Date.now())}`,
          size: file.size,
          mimeType: file.type,
          status: 'uploading' as const,
        } satisfies AskFile,
      }));
      setFiles((current) => [...current, ...pending.map(({ entry }) => entry)]);
      const settle = (uid: string, change: Partial<AskFile>): void =>
        setFiles((list) =>
          list.map((item) =>
            item.uid === uid ? { ...item, ...change } : item,
          ),
        );
      for (const { file, entry } of pending)
        uploads.upload(file).then(
          (attachment) => settle(entry.uid, { status: 'done', attachment }),
          (error: unknown) => {
            settle(entry.uid, {
              status: 'error',
              ...(error instanceof Error ? { error: error.message } : {}),
            });
            toaster.show({
              type: 'error',
              title: toText(
                text('agentPanel.uploadFailed', { name: entry.filename }),
              ),
            });
          },
        );
    },
    [files.length, text, toaster, uploads],
  );
  const remove = useCallback(
    (uid: string) => {
      const gone = files.find((item) => item.uid === uid);
      if (gone?.attachment) uploads.discard(gone.attachment);
      setFiles((current) => current.filter((item) => item.uid !== uid));
    },
    [files, uploads],
  );
  const clear = useCallback(() => setFiles([]), []);
  return {
    files,
    uploading: files.some((item) => item.status === 'uploading'),
    ready: files.flatMap((item) =>
      item.status === 'done' && item.attachment ? [item.attachment] : [],
    ),
    upload,
    remove,
    clear,
  };
}

// A record as a pinned context item: the chip's label is the client's own.
export function recordPin(
  entity: Entity,
  id: string,
  label: string,
): ChatContextItem {
  return { kind: entity, id, label };
}

// An AI card on a record (a follow-up, a review, a preparation) as a pinned
// item: the history entry's id, which the server resolves for the agent.
export function cardPin(entryId: string, label: string): ChatContextItem {
  return { kind: 'crm-evaluation', id: entryId, label };
}

// The page context a question is sent with: the given items only, as the
// plugin builds it (no page sources, no selection).
export function contextOf(route: string, items: readonly ChatContextItem[]) {
  return buildPageContext({
    route,
    pinned: items,
    sources: [],
    filter: null,
    selection: null,
    removed: new Set(),
  });
}

// Asking Noco at once from outside the panel (the dock, the overview's
// box): the conversation is created and the question sent, then the panel
// opens on it. A conversation created whose message did not go opens with
// the text in its composer; one not created leaves the text with the caller
// (the promise rejects).
export function useAskAgent(): (question: {
  text: string;
  items?: readonly ChatContextItem[];
  attachments?: readonly MessageAttachment[];
  model?: ChatModelChoice;
  agent: ChatAgent;
}) => Promise<void> {
  const api = useChatApi();
  const panel = useChatPanel();
  const toaster = useToaster();
  const { text } = useCrmText();
  return useCallback(
    async ({ text: content, items = [], attachments = [], model, agent }) => {
      const conversation = await api.createConversation({
        agentId: agent.id,
        source: CRM_SOURCE,
        ...(model
          ? { model: { modelService: model.modelService, model: model.model } }
          : {}),
      });
      // What a pin brought is sent with this question; nothing stays for
      // the next one.
      panel.clearPinned();
      try {
        // The page it was asked on, as the address bar shows it.
        const context = contextOf(window.location.pathname, items);
        await api.sendMessage(conversation.id, {
          content,
          clientId: newClientId(),
          ...(context ? { context } : {}),
          ...(attachments.length
            ? { attachmentIds: attachments.map((file) => file.id) }
            : {}),
        });
        panel.openChat({ conversationId: conversation.id, view: 'chat' });
      } catch {
        toaster.show({
          type: 'error',
          title: toText(text('agentPanel.sendFailed')),
        });
        panel.openChat({
          conversationId: conversation.id,
          view: 'chat',
          draft: content,
        });
      }
    },
    [api, panel, toaster, text],
  );
}

// Opening a new conversation about a record, or an AI card on it (the
// cards' Discuss), sending nothing: the earlier pins are dropped first, so a
// second Discuss replaces them.
export function useDiscuss(): (pins: readonly ChatContextItem[]) => void {
  const panel = useChatPanel();
  return useCallback(
    (pins) => {
      panel.clearPinned();
      // A new conversation, then each pin into it (one per call).
      panel.openChat({ conversationId: null, view: 'chat' });
      for (const pin of pins) panel.openChat({ pin });
      panel.focusComposer();
    },
    [panel],
  );
}
