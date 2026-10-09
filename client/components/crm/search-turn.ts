import type { AIChatMessage } from '#extensions/nocobase-ai';
import { AI_DRAFT_CONVERSATION_ID } from '#extensions/nocobase-ai/providers/types';

// Where a question asked from the global search stands in the hidden chat
// that answers it (global-search.tsx), read from the chat's messages as its
// bridge publishes them. Ported from NocoITAM's search.

type Part = AIChatMessage['parts'][number];

// What the hidden chat's bridge publishes.
export interface SearchChatState {
  readonly status: 'submitted' | 'streaming' | 'ready' | 'error';
  readonly messages: readonly AIChatMessage[];
  readonly error?: Error;
  // The conversation it runs in; a draft until first sent.
  readonly conversationId?: string;
  // Deletes a conversation, as the conversation list does.
  readonly removeConversation?: (conversationId: string) => Promise<void>;
  // Renames one: a kept search conversation takes its question as title.
  readonly renameConversation?: (
    conversationId: string,
    title: string,
  ) => Promise<void>;
}

export const IDLE_SEARCH_CHAT: SearchChatState = {
  status: 'ready',
  messages: [],
};

export interface SearchTurn {
  // The chat has taken the question up (its message is in the chat).
  readonly asked: boolean;
  readonly working: boolean;
  // The tool call under way or last made, while working.
  readonly step?: string;
  // What Noco said after its last tool call.
  readonly text: string;
  // Noco proposed a change only its conversation can confirm.
  readonly decision: boolean;
  // Why the turn failed, when it did.
  readonly failed?: string;
  // The conversation it runs in, once the plugin has named it.
  readonly conversationId?: string;
}

export function messageText(message: AIChatMessage): string {
  return message.parts
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join('');
}

const toolNameOf = (part: Part): string | undefined =>
  part.type === 'dynamic-tool'
    ? part.toolName
    : part.type.startsWith('tool-')
      ? part.type.slice(5)
      : undefined;

// Page tools, which the plugin marks as needing approval and then approves
// itself: one waiting is a step under way, not a question for the reader.
const PAGE_TOOLS = new Set(['loadFrontendTool', 'executeFrontendTool']);

// A tool call the plugin holds for approval.
const awaitsApproval = (part: Part): boolean => {
  if (!toolNameOf(part) || !('state' in part)) return false;
  if (part.state === 'output-available' || part.state === 'output-error')
    return false;
  const metadata =
    'callProviderMetadata' in part
      ? (part.callProviderMetadata?.nocobase as
          { requiresApproval?: unknown } | undefined)
      : undefined;
  return metadata?.requiresApproval === true;
};

// Reads the turn that `prompt` started out of the chat's state.
export function readSearchTurn(
  chat: SearchChatState,
  prompt: string,
): SearchTurn {
  const askedAt = chat.messages.findLastIndex(
    (message) =>
      message.role === 'user' && messageText(message).includes(prompt),
  );
  if (askedAt === -1)
    return { asked: false, working: true, text: '', decision: false };
  const parts = chat.messages
    .slice(askedAt + 1)
    .flatMap((message) => message.parts);
  const lastToolAt = parts.findLastIndex((part) => toolNameOf(part));
  // The words between tool calls narrate the steps; the answer is what
  // comes after the last one.
  const text = parts
    .slice(lastToolAt + 1)
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join('')
    .trim();
  const waiting = parts.filter(awaitsApproval);
  const decision = waiting.some(
    (part) => !PAGE_TOOLS.has(toolNameOf(part) ?? ''),
  );
  // The chat goes quiet between steps (a page tool approving itself, a
  // tool's result about to be answered), so a turn is done only once it has
  // said something after its last call, stopped on a change to confirm, or
  // failed.
  const working =
    chat.status === 'submitted' ||
    chat.status === 'streaming' ||
    (chat.status !== 'error' && !decision && (waiting.length > 0 || !text));
  const conversationId =
    chat.conversationId && chat.conversationId !== AI_DRAFT_CONVERSATION_ID
      ? chat.conversationId
      : undefined;
  return {
    asked: true,
    working,
    step:
      working && lastToolAt !== -1 ? toolNameOf(parts[lastToolAt]) : undefined,
    text,
    decision: !working && decision,
    failed:
      !working && chat.status === 'error'
        ? (chat.error?.message ?? '')
        : undefined,
    conversationId,
  };
}
