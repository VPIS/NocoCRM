import {
  useAIPageElementHandle,
  type AIFrontendToolRegistration,
} from '#extensions/nocobase-ai';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import { toText, useCrmText } from './api.js';
import { useAskModel } from './assistant-ask.js';
import {
  requestConversation,
  useAssistantReadiness,
} from './assistant-state.js';
import {
  GlobalSearchContext,
  MAX_FOUND,
  SEARCH_INSTRUCTIONS,
  SEARCH_KINDS,
  askPrompt,
  type FoundRecords,
  type GlobalSearch,
  type SearchAnswer,
  type SearchMode,
} from './global-search-state.js';
import { SEARCH_MARKER, searchChat, useSearchChat } from './search-chat.js';
import { readSearchTurn, type SearchTurn } from './search-turn.js';

// The global search, ported from NocoITAM's: a dialog (search-dialog.tsx,
// in the application layout) that ⌘K or the menu's Search opens, finding
// records by keyword through GET /api/search, or asking the CRM employee
// in a conversation of its own (search-chat.ts) that hands the records it
// found over through the page tool presentRecords. This provider holds the
// state above the dialog and registers the tool; it wraps the application
// (CrmAssistantProvider), so an answer running survives a move to settings.

// One question asked from the search and where it stands.
interface Session {
  readonly question: string;
  readonly prompt: string;
  readonly conversationId?: string;
  // Frozen once the turn is complete: its conversation may be deleted.
  readonly result?: Omit<SearchTurn, 'asked' | 'conversationId'>;
  readonly found?: FoundRecords;
  // Its conversation was opened in the panel or is needed there.
  readonly kept?: boolean;
}

export function GlobalSearchProvider({
  children,
}: PropsWithChildren): ReactElement {
  const { text } = useCrmText();
  const readiness = useAssistantReadiness();
  const { model } = useAskModel();
  const chat = useSearchChat();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<SearchMode>('search');
  const [session, setSession] = useState<Session>();
  // ⌘K / Ctrl+K toggles the dialog, but never opens it over another one.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key.toLowerCase() !== 'k' ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey ||
        event.isComposing
      )
        return;
      // Only where the dialog is (the application layout), and never over
      // another dialog.
      if (!document.querySelector('[data-crm-search-host]')) return;
      if (
        document.querySelector(
          '[role="dialog"]:not([data-crm-search]), [role="alertdialog"]',
        )
      )
        return;
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // While a question runs its answer is read from the chat; once complete
  // it is kept here, so deleting the conversation loses nothing.
  const turn =
    session && !session.result
      ? readSearchTurn(chat, session.prompt)
      : undefined;
  if (session && turn) {
    const conversationId = session.conversationId ?? turn.conversationId;
    const { asked: _asked, conversationId: _id, ...result } = turn;
    if (turn.asked && !turn.working)
      setSession({ ...session, conversationId, result });
    else if (conversationId !== session.conversationId)
      setSession({ ...session, conversationId });
  }
  // The conversations already let go, so none is deleted twice.
  const releasedRef = useRef(new Set<string>());
  const release = (id: string): void => {
    if (releasedRef.current.has(id)) return;
    releasedRef.current.add(id);
    void searchChat
      .getState()
      .removeConversation?.(id)
      .catch(() => undefined);
  };
  const finished = session?.result;
  // A complete answer lets its conversation go; one that ended on a change
  // to confirm or failed keeps it, renamed to its question, so it shows in
  // the conversation lists like any other.
  const needed =
    finished && (finished.decision || finished.failed !== undefined);
  const releasable =
    finished && session.conversationId && !session.kept && !needed
      ? session.conversationId
      : undefined;
  const keepable =
    finished && session.conversationId && needed
      ? session.conversationId
      : undefined;
  const renamedRef = useRef(new Set<string>());
  useEffect(() => {
    if (releasable) release(releasable);
    if (keepable && session && !renamedRef.current.has(keepable)) {
      renamedRef.current.add(keepable);
      void searchChat
        .getState()
        .renameConversation?.(keepable, session.question.slice(0, 60))
        .catch(() => undefined);
    }
  });

  // Lets go of a question's conversation nothing kept, before the next.
  const discard = (): void => {
    if (
      session?.conversationId &&
      !session.kept &&
      !renamedRef.current.has(session.conversationId)
    )
      release(session.conversationId);
  };

  const tools = useMemo(
    (): AIFrontendToolRegistration[] => [
      {
        name: 'presentRecords',
        title: 'Present the records found',
        description: `Show the records you found under the CRM's search box, where the user opens them or their whole list. "entity" is the kind of record (one of the lists in the page context), "ids" the ids of the records you found (look them up with the CRM read tools; at most ${String(MAX_FOUND)}), "title" a few words saying what they are, in the user's language and without their count, which the search adds. Call it once, for the kind the question is about.`,
        permission: 'ALLOW',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', enum: [...SEARCH_KINDS] },
            ids: { type: 'array', items: { type: 'string' } },
            title: { type: 'string' },
          },
          required: ['entity', 'ids', 'title'],
        },
        // The model supplies the arguments; read them defensively.
        execute: (args: unknown) => {
          const input = (args ?? {}) as {
            entity?: unknown;
            ids?: unknown;
            title?: unknown;
          };
          const entity = SEARCH_KINDS.find((kind) => kind === input.entity);
          if (!entity)
            return { error: `Unknown kind: ${toText(input.entity)}` };
          const all = (Array.isArray(input.ids) ? input.ids : []).filter(
            (id): id is string => typeof id === 'string' && id !== '',
          );
          if (!all.length) return { error: 'No ids to show' };
          const found: FoundRecords = {
            entity,
            ids: all.slice(0, MAX_FOUND),
            // Without a count the model may still add ("（7 条）", "(7)"):
            // the search shows its own.
            title:
              typeof input.title === 'string'
                ? input.title
                    .trim()
                    .replace(/\s*[（(]\s*\d+\s*[^）)]{0,3}[）)]\s*$/u, '')
                    .slice(0, 60)
                : '',
            capped: all.length > MAX_FOUND,
          };
          setSession((current) => current && { ...current, found });
          return { shown: found.ids.length, entity };
        },
      },
    ],
    [],
  );
  const { ref: contextRef, context } = useAIPageElementHandle({
    id: 'crm-global-search',
    title: toText(text('globalSearch.context')),
    kind: 'search',
    getContext: () => ({
      instructions: SEARCH_INSTRUCTIONS,
      lists: SEARCH_KINDS.map((entity) => ({
        entity,
        title: toText(text(`entities.${entity}`)),
      })),
      // What a follow-up is about: the answer taken into the conversation.
      lastAnswer: session?.result
        ? {
            question: session.question,
            answer: session.result.text,
            found: session.found,
          }
        : undefined,
    }),
    tools,
  });

  const answer: SearchAnswer | undefined = session
    ? {
        question: session.question,
        found: session.found,
        ...(session.result ?? {
          working: true,
          step: turn?.step,
          text: turn?.text ?? '',
          decision: false,
        }),
        conversationId:
          session.result && needed ? session.conversationId : undefined,
      }
    : undefined;

  const search: GlobalSearch = {
    open,
    setOpen,
    value,
    setValue,
    mode,
    setMode,
    answer,
    ask: (question) => {
      const asked = question.trim();
      if (readiness.state !== 'ready' || !asked) return;
      discard();
      const prompt = askPrompt(SEARCH_MARKER, asked);
      setSession({ question: asked, prompt });
      setMode('ask');
      searchChat.ask(
        prompt,
        [context],
        model
          ? {
              ...(model.llmService ? { llmService: model.llmService } : {}),
              model: model.value,
            }
          : undefined,
      );
    },
    clearAnswer: () => {
      discard();
      setSession(undefined);
    },
    followUp: () => {
      if (!session?.result) return;
      setOpen(false);
      window.dispatchEvent(
        new CustomEvent('crm-assistant', {
          detail: {
            prompt: toText(
              text('globalSearch.followUpDraft', {
                question: session.question,
              }),
            ),
            newConversation: true,
            context: {
              type: 'crm-search-answer',
              id: 'crm-global-search',
              title: session.question,
              content: {
                note: 'An answer the user got from the CRM search, which they now follow up on.',
                question: session.question,
                answer: session.result.text,
                found: session.found,
              },
            },
          },
        }),
      );
    },
    openConversation: () => {
      if (!session?.conversationId) return;
      setSession({ ...session, kept: true });
      setOpen(false);
      requestConversation(session.conversationId);
    },
  };

  return (
    <GlobalSearchContext value={search}>
      {/* The page element the search registers as the AI's context: always
          in the document, so its tool outlives the dialog. */}
      <span ref={contextRef} hidden />
      {children}
    </GlobalSearchContext>
  );
}
