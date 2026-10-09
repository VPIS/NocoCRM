// @vitest-environment node
import { describe, expect, it } from 'vitest';

import type { AIChatMessage } from '../../client/extensions/nocobase-ai/providers/types.js';
import type { SearchChatState as ChatState } from '../../client/components/crm/search-turn.js';
import { readSearchTurn } from '../../client/components/crm/search-turn.js';

const PROMPT = 'Find: big deals closing this month';

const user = (text: string): AIChatMessage =>
  ({
    id: 'u',
    role: 'user',
    parts: [{ type: 'text', text }],
  }) as unknown as AIChatMessage;

const assistant = (...parts: unknown[]): AIChatMessage =>
  ({ id: 'a', role: 'assistant', parts }) as unknown as AIChatMessage;

const text = (value: string) => ({ type: 'text', text: value });
const tool = (name: string, state: string, requiresApproval = false) => ({
  type: 'dynamic-tool',
  toolName: name,
  toolCallId: name,
  state,
  input: {},
  callProviderMetadata: requiresApproval
    ? { nocobase: { requiresApproval: true } }
    : undefined,
});

const chat = (
  status: ChatState['status'],
  messages: AIChatMessage[],
  extra: Partial<ChatState> = {},
): ChatState => ({ status, messages, conversationId: 'c-1', ...extra });

/**
 * How the search reads one question's progress out of its chat: the answer
 * is frozen once complete and the conversation deleted, so "complete" must
 * not be mistaken for one of the quiet moments between steps.
 */
describe('reading a search question from its chat', () => {
  it('is working until the question reaches the chat', () => {
    const turn = readSearchTurn(chat('ready', []), PROMPT);
    expect(turn).toMatchObject({ asked: false, working: true });
  });

  it('names the step under way', () => {
    const turn = readSearchTurn(
      chat('streaming', [
        user(PROMPT),
        assistant(tool('search_records', 'input-available')),
      ]),
      PROMPT,
    );
    expect(turn).toMatchObject({ working: true, step: 'search_records' });
  });

  it('keeps working while a page tool waits to approve itself', () => {
    const turn = readSearchTurn(
      chat('ready', [
        user(PROMPT),
        assistant(tool('executeFrontendTool', 'input-available', true)),
      ]),
      PROMPT,
    );
    expect(turn).toMatchObject({ working: true, decision: false });
  });

  it('keeps working while a result waits to be answered', () => {
    const turn = readSearchTurn(
      chat('ready', [
        user(PROMPT),
        assistant(text('Looking…'), tool('search_records', 'output-available')),
      ]),
      PROMPT,
    );
    expect(turn.working).toBe(true);
  });

  it('is done with the words after the last tool call', () => {
    const turn = readSearchTurn(
      chat('ready', [
        user(PROMPT),
        assistant(
          text('Reading the business context.'),
          tool('search_records', 'output-available'),
          tool('executeFrontendTool', 'output-available', true),
          text('Matched by stage and close date: 2 deals.'),
        ),
      ]),
      PROMPT,
    );
    expect(turn).toMatchObject({
      asked: true,
      working: false,
      decision: false,
      text: 'Matched by stage and close date: 2 deals.',
      conversationId: 'c-1',
    });
  });

  it('stops on a change waiting for the reader to confirm it', () => {
    const turn = readSearchTurn(
      chat('ready', [
        user(PROMPT),
        assistant(tool('update_record', 'input-available', true)),
      ]),
      PROMPT,
    );
    expect(turn).toMatchObject({ working: false, decision: true });
  });

  it('reports a failure', () => {
    const turn = readSearchTurn(
      chat('error', [user(PROMPT)], { error: new Error('Model unavailable') }),
      PROMPT,
    );
    expect(turn).toMatchObject({ working: false, failed: 'Model unavailable' });
  });

  it('has no conversation while the chat is still a draft', () => {
    const turn = readSearchTurn(
      chat('streaming', [user(PROMPT)], { conversationId: '__draft__' }),
      PROMPT,
    );
    expect(turn.conversationId).toBeUndefined();
  });
});
