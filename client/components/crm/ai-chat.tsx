import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useApiClient, useToaster } from '@nocobase/app-client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Flag,
  Maximize2,
  Menu,
  PanelLeftClose,
  PanelRight,
  PlusCircle,
  X,
} from 'lucide-react';
import {
  AIChatProvider,
  AIChatWindow,
  AIPageContextScope,
  ChatSurface,
  NocoBaseAIRootProvider,
  NocoBaseAIService,
  getAIEmployeeAvatar,
  useAI,
  useAIChat,
  useAIChatBase,
  useAIChatMessages,
  useAIChatStatus,
  useAIChatController,
  useAIChatControllerState,
  type AIChatAttachment,
  type AIChatController,
  type AIEmployee,
  type AIService,
  type AIWorkContextItem,
} from '#extensions/nocobase-ai';
import { AI_DRAFT_CONVERSATION_ID } from '#extensions/nocobase-ai/providers/types';
import { UserPromptEditor } from '#extensions/nocobase-ai/components/chat/user-prompt-editor';
import { Button } from '../ui/button.js';
import {
  sentence,
  toText,
  useCrmText,
  useMetadata,
  useLiveSessionUserId,
  type Data,
} from './api.js';
import { crmToolRenderers } from './ai-tool-renderers.js';
import { GlobalSearchProvider } from './global-search.js';
import { isSearchConversation, searchChat } from './search-chat.js';
import { IDLE_SEARCH_CHAT } from './search-turn.js';
import {
  CRM_ASSISTANT,
  clearConversationRequest,
  publishPanelChat,
  setChatMounted,
  takeDeleteRequest,
  useDeleteRequest,
  publishPanelOpen,
  useAssistantReadiness,
  useConversationRequest,
} from './assistant-state.js';

// The CRM assistant: the AI Employee plugin's chat, mounted in a side panel,
// talking to the CRM employee defined in server/ai, which reads the CRM and
// proposes writes the user confirms on cards in the conversation. The dock at
// the bottom of the page (assistant-dock.tsx) and the cards' own "Ask AI"
// dispatch `crm-assistant` events: a new conversation, whose starting point
// is the record of the page the question was asked on (work context the
// employee reads with get_record), with the question to send. Being on a
// record's page attaches nothing by itself; asking from it does.

const openKey = 'crm-assistant-open';
// The panel opened to start afresh: by a shortcut used while it was closed,
// whose task is queued for the chat that mounts and starts a conversation of
// its own (restoring the remembered one would change the active
// conversation under the queued task and drop it), or by a request for a new
// blank conversation (the dock on a phone). Either way the remembered
// conversation is not restored on that mount; it is still in the
// conversation list. Only a reload brings it back.
let shortcutOpensPanel = false;

interface RecordContext {
  entity: string;
  recordId: string;
  // The record's title as its page shows it, once the page has loaded it.
  name?: string;
}

function recordItem(context: RecordContext): AIWorkContextItem {
  return {
    type: 'crm-record',
    id: `${context.entity}/${context.recordId}`,
    title: context.name ?? `${context.entity} ${context.recordId}`,
    content: {
      note: 'The CRM record the user started this conversation from. Read it with get_record before answering about it.',
      entity: context.entity,
      recordId: context.recordId,
    },
  };
}

// A work context item a shortcut brings along, as given: the plugin passes
// its content to the model as page context.
function extraContextOf(value: unknown): AIWorkContextItem | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Data;
  const type = toText(item.type ?? '');
  const id = toText(item.id ?? '');
  return type && id && item.content
    ? {
        type,
        id,
        title: toText(item.title ?? type),
        content: item.content,
      }
    : undefined;
}

function recordContextOf(data: Data): RecordContext | undefined {
  const entity = toText(data.entity ?? '');
  const recordId = toText(data.recordId ?? '');
  const name = toText(data.name ?? '');
  return entity && recordId
    ? { entity, recordId, ...(name ? { name } : {}) }
    : undefined;
}

// The employee's name, role, bio and greeting in the interface language.
// The plugin keeps a code-registered employee's texts in one language (its
// settings page shows the English definition); the CRM's own panel shows
// them translated by wrapping the service that lists employees.
function localizedService(
  base: AIService,
  texts: Pick<AIEmployee, 'nickname' | 'position' | 'bio' | 'greeting'>,
): AIService {
  const listEmployees = async (): Promise<AIEmployee[]> =>
    (await base.listEmployees()).map((employee) =>
      employee.username === CRM_ASSISTANT
        ? { ...employee, ...texts }
        : employee,
    );
  // The global search's own conversations stay out of every list: the
  // sidebar's, the panel's history (search-chat.ts).
  const listConversations: AIService['listConversations'] = async (keyword) =>
    (await base.listConversations(keyword)).filter(
      (conversation) => !isSearchConversation(conversation.title),
    );
  return new Proxy(base, {
    get(target, property, receiver) {
      if (property === 'listEmployees') return listEmployees;
      if (property === 'listConversations') return listConversations;
      const value = Reflect.get(target, property, receiver) as unknown;
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}

export function CrmAssistantProvider({
  children,
}: PropsWithChildren): ReactElement {
  const { text } = useCrmText();
  const nickname = toText(text('assistantEmployeeName'));
  const position = toText(text('assistantEmployeeRole'));
  const bio = toText(text('assistantEmployeeBio'));
  const greeting = toText(text('assistantEmployeeGreeting'));
  // The plugin's service over the application's API client, as the root
  // provider builds it when given none. A new service identity makes the
  // root provider list employees and models again, so this changes with the
  // language, the client and the signed-in user: the provider is mounted
  // above the sign-in page, where those requests answer 401, and signing in
  // does not reload the page, so without the user the panel kept reporting
  // no model until a refresh.
  const api = useApiClient();
  const userId = useLiveSessionUserId();
  const base = useMemo(
    () => new NocoBaseAIService(api),
    // eslint-disable-next-line react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps -- userId only re-keys the service
    [api, userId],
  );
  const service = useMemo(
    () => localizedService(base, { nickname, position, bio, greeting }),
    [base, nickname, position, bio, greeting],
  );
  // The global search's conversations a reload or a closed tab left behind
  // mid-answer: deleted once there is a signed-in user, those untouched for
  // ten minutes (a search may be running in another tab) and never the one
  // this page's search is running.
  useEffect(() => {
    if (!userId) return;
    const stale = Date.now() - 10 * 60_000;
    void base
      .listConversations()
      .then((conversations) =>
        Promise.all(
          conversations
            .filter(
              (conversation) =>
                isSearchConversation(conversation.title) &&
                conversation.id !== searchChat.getState().conversationId &&
                new Date(conversation.updatedAt).getTime() < stale,
            )
            .map((conversation) => base.destroyConversation(conversation.id)),
        ),
      )
      .catch(() => undefined);
  }, [base, userId]);
  return (
    // The registry's root provider discovers employees and models once for
    // the whole application; the panel below mounts the chat when both are
    // usable. A page context that fails to resolve is left out rather than
    // blocking the send: the employee can still read the record itself. The
    // CRM's write tools render as confirmation cards (ai-tool-cards).
    <NocoBaseAIRootProvider
      service={service}
      contextFailurePolicy='omit'
      toolRenderers={crmToolRenderers}
    >
      {/* The global search's state and its AI tool, for the whole
          application (its dialog is in the application layout). */}
      <GlobalSearchProvider>{children}</GlobalSearchProvider>
      <CrmAssistantPanel />
    </NocoBaseAIRootProvider>
  );
}

function CrmAssistantPanel(): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const controller = useAIChatController();
  const { open } = useAIChatControllerState(controller);
  // The panel expands into a centred dialog for a longer conversation; the
  // same chat window stays mounted, so nothing is lost either way.
  const [expanded, setExpanded] = useState(false);
  const setPanelOpen = (next: boolean): void => {
    if (!next) setExpanded(false);
    controller.setOpen(next);
  };
  // However it was closed, it opens again as the side panel: adjusted as it
  // renders closed.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setExpanded(false);
  }
  // The panel starts closed on every screen; the dock and the cards'
  // shortcuts open it. Once the user opens or closes it, that choice
  // survives a reload in the same tab.
  useEffect(() => {
    let initial = false;
    try {
      const stored = sessionStorage.getItem(openKey);
      if (stored !== null) initial = stored === '1';
    } catch {
      /* Storage may be unavailable; fall through to the default. */
    }
    controller.setOpen(initial);
  }, [controller]);
  useEffect(() => {
    // The page makes room only for the side panel; the expanded dialog lies
    // over it.
    document.body.classList.toggle('crm-assistant-open', open && !expanded);
    publishPanelOpen(open);
    // A request the chat had no time to carry out does not wait for the
    // next opening.
    if (!open) clearConversationRequest();
    try {
      sessionStorage.setItem(openKey, open ? '1' : '0');
    } catch {
      // Storage may be unavailable; the panel then simply starts closed.
    }
    return () => document.body.classList.remove('crm-assistant-open');
  }, [open, expanded]);
  useEffect(() => {
    const show = (event: Event): void => {
      const data = (event as CustomEvent<Data>).detail ?? {};
      const prompt = toText(data.prompt ?? '');
      const target = recordContextOf(data);
      // What the shortcut adds beyond the record: the lead's AI evaluation
      // for "Ask about it", passed to the model whole.
      const extra = extraContextOf(data.context);
      const workContext = [
        ...(target ? [recordItem(target)] : []),
        ...(extra ? [extra] : []),
      ];
      // Files the overview's ask box uploaded, sent with its question, and
      // the model it chose for the new conversation.
      const attachments = Array.isArray(data.attachments)
        ? (data.attachments as AIChatAttachment[])
        : [];
      const model =
        data.model && typeof data.model === 'object'
          ? (data.model as { llmService?: string; model: string })
          : undefined;
      // No prompt and nothing to attach: just open the panel. A record's
      // "Ask AI", or a shortcut bringing context of its own ("Ask about it"
      // on a card), starts its conversation with that context and an empty
      // composer.
      if (!prompt && !workContext.length && !attachments.length) {
        // Asked for a new conversation (the dock's button on a phone): a
        // blank one, not the conversation the panel last showed.
        if (data.newConversation === true) shortcutOpensPanel = true;
        controller.open();
        return;
      }
      // A shortcut with send:true is a complete instruction the chat sends
      // on its own; the others land in the composer for the user to finish.
      // The chat provider that runs tasks mounts only while the panel is
      // open, so open it first: the controller queues the task until the
      // provider binds, and a closed panel would otherwise swallow it.
      if (!controller.getSnapshot().open) shortcutOpensPanel = true;
      controller.open();
      controller.triggerTask({
        aiEmployee: CRM_ASSISTANT,
        task: {
          message: {
            user: prompt,
            ...(workContext.length ? { workContext } : {}),
            ...(attachments.length ? { attachments } : {}),
          },
          ...(model ? { model } : {}),
          autoSend: data.send === true,
          ...(data.webSearch === true ? { webSearch: true } : {}),
        },
        auto: true,
        open: true,
        // Continue the conversation already open rather than starting one
        // per shortcut; a new conversation is one click away. A shortcut
        // about one thing of its own (an evaluation) asks for a fresh one,
        // so it does not land in an unrelated thread.
        reuseConversation: data.newConversation !== true,
      });
    };
    // The sidebar's conversation list asks for a conversation, or a new one
    // (assistant-state.ts): the panel opens, and its chat carries the
    // request out once mounted (OpenRequestedConversation). Opened by the
    // request, it does not restore the remembered conversation over it.
    const showConversation = (): void => {
      if (controller.getSnapshot().open) return;
      shortcutOpensPanel = true;
      controller.open();
    };
    window.addEventListener('crm-assistant', show);
    window.addEventListener('crm-assistant-conversation', showConversation);
    return () => {
      window.removeEventListener('crm-assistant', show);
      window.removeEventListener(
        'crm-assistant-conversation',
        showConversation,
      );
    };
  }, [controller]);
  // Expand and close, as the plugin's ChatSurfaceActions offers them but
  // without its tooltips, in the chat window's toolbar row as the plugin's
  // floating demo places them. In the top-right corner they sat exactly
  // where the account avatar lands once the page widens again, so closing
  // left the pointer on it and its hover menu opened.
  const actions = (
    <>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={text(expanded ? 'assistantCollapse' : 'assistantExpand')}
        title={text(expanded ? 'assistantCollapse' : 'assistantExpand')}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <PanelRight /> : <Maximize2 />}
      </Button>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={text('assistantClose')}
        title={text('assistantClose')}
        onClick={() => setPanelOpen(false)}
      >
        <X />
      </Button>
    </>
  );
  if (!meta?.assistant) return null;
  return (
    <>
      {/* The plugin's surface: a side panel that stays open across pages and
          lets the page be used beside it (non-modal, no outside dismissal),
          or, expanded, a dialog. The panel is the width styles.css pushes the
          page aside by. Escape closes only the dialog: in the panel it would
          also fire while cancelling an edit on the page. */}
      <ChatSurface
        open={open}
        variant={expanded ? 'dialog' : 'side-panel'}
        onOpenChange={setPanelOpen}
        width='28rem'
        closeOnEscape={expanded}
      >
        {/* No title of the panel's own: the chat's header says who the
            user talks to (NocoHeader). */}
        {/* data-crm-assistant-panel: the dock moves focus to the composer in
            here once it has sent a question. */}
        <div className='flex h-full min-h-0 flex-col' data-crm-assistant-panel>
          <div className='flex min-h-0 flex-1 flex-col'>
            <ConfiguredChat controller={controller} actions={actions} />
          </div>
        </div>
      </ChatSurface>
      <SearchChat />
    </>
  );
}

// The global search's conversation, which no window shows (search-chat.ts):
// mounted on the same conditions as the panel's chat, and always, so a
// question asked from the search runs whether or not the panel is open. Its
// progress reaches the search through the bridge.
function SearchChat(): ReactElement | null {
  const readiness = useAssistantReadiness();
  if (readiness.state !== 'ready') return null;
  return (
    <AIChatProvider
      id='crm-search'
      controller={searchChat.controller}
      defaultEmployee={CRM_ASSISTANT}
    >
      <SearchChatBridge />
    </AIChatProvider>
  );
}

function SearchChatBridge(): null {
  const { messages } = useAIChatMessages();
  const { status, error } = useAIChatStatus();
  const { activeConversationId, removeConversation, renameConversation } =
    useAIChatBase();
  useEffect(() => {
    searchChat.setState({
      status,
      messages,
      error,
      conversationId: activeConversationId,
      removeConversation,
      renameConversation,
    });
  }, [
    status,
    messages,
    error,
    activeConversationId,
    removeConversation,
    renameConversation,
  ]);
  useEffect(() => () => searchChat.setState(IDLE_SEARCH_CHAT), []);
  return null;
}

// The chat mounts only once the plugin has found an employee and a usable
// model; a composer mounted earlier would send with an empty configuration.
function ConfiguredChat({
  controller,
  actions,
}: {
  controller: AIChatController;
  // The panel's expand and close buttons, in the chat's toolbar; above a
  // notice while the chat cannot start.
  actions: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  const readiness = useAssistantReadiness();
  const notice = (message: string, alert = true): ReactElement => (
    <>
      <div className='flex justify-end gap-1 border-b px-3 py-2'>{actions}</div>
      <p
        role={alert ? 'alert' : 'status'}
        className='m-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground'
      >
        {message}
      </p>
    </>
  );
  if (readiness.state === 'loading')
    return notice(toText(text('assistantLoading')), false);
  if (readiness.state === 'unavailable') return notice(readiness.reason);
  return (
    <AIPageContextScope context={[]}>
      <AIChatProvider
        id='crm-assistant'
        controller={controller}
        defaultEmployee={CRM_ASSISTANT}
      >
        <RememberConversation />
        <OpenRequestedConversation />
        <DeleteRequestedConversation />
        <AIChatWindow
          className='h-full'
          showEmployeeSelector={false}
          disclaimer={false}
          placeholder={toText(text('askHint'))}
          header={<NocoHeader actions={actions} />}
          // Files picked, dropped or pasted go to the plugin's storage and
          // reach the model with the message: documents (PDF, Word, Excel,
          // PowerPoint, text, CSV, JSON) as extracted text; images only for
          // a model that reads them (DeepSeek does not).
          enableAttachments
          // The starting point shows in the header (NocoHeader), not as
          // chips over the composer.
          showWorkContext={false}
        />
      </AIChatProvider>
    </AIPageContextScope>
  );
}

// The chat's header, drawn by the CRM in place of the plugin's: whom the
// user talks to (the employee's avatar, name and role, in the interface
// language), with the conversation list's toggle before it and a new
// conversation, the user's own instructions, expand and close after it.
// Below, what the conversation started from (a record's "Ask AI", the lead
// and its evaluation for a card's "Ask about it"): from the moment it is
// opened, as the draft carries it, and once under way as its first message
// carried it, fixed whatever the page shows later.
function NocoHeader({ actions }: { actions: ReactNode }): ReactElement {
  const { text, language } = useCrmText();
  const {
    currentEmployee,
    conversations,
    conversationListOpen,
    setConversationListOpen,
    startNewConversation,
  } = useAIChatBase();
  const { messages } = useAIChatMessages();
  const unread = conversations.filter(
    (conversation) => conversation.unread,
  ).length;
  const first = messages.find((message) => message.role === 'user');
  const { workContext } = useAIChat();
  // Each item as its title, a record's led by its type ("Lead Zhang Wei").
  const startItems = (
    first ? (first.metadata?.workContext ?? []) : workContext
  ).map((item) => {
    const entity =
      item.type === 'crm-record'
        ? toText((item.content as Data | undefined)?.entity ?? '')
        : '';
    return {
      key: item.id,
      kind: entity ? sentence(text(`entity.${entity}`)) : '',
      title: toText(item.title),
    };
  });
  const start = startItems
    .map((item) => [item.kind, item.title].filter(Boolean).join(' '))
    .join(' · ');
  const avatar = getAIEmployeeAvatar(currentEmployee?.avatar);
  const listLabel = toText(
    text(
      conversationListOpen
        ? 'assistantHideConversations'
        : 'assistantConversations',
    ),
  );
  const newLabel = toText(text('assistantNewConversation'));
  return (
    <div className='shrink-0 border-b bg-card'>
      <header className='flex h-14 items-center gap-2 px-2.5'>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={listLabel}
          title={listLabel}
          onClick={() => setConversationListOpen(!conversationListOpen)}
        >
          <span className='relative'>
            {conversationListOpen ? <PanelLeftClose /> : <Menu />}
            {!conversationListOpen && unread > 0 ? (
              <span className='absolute -top-1 -right-1 size-2 rounded-full bg-destructive ring-2 ring-card' />
            ) : null}
          </span>
        </Button>
        {avatar ? (
          <img
            src={avatar}
            alt=''
            className='size-8 shrink-0 rounded-full border bg-background'
          />
        ) : null}
        <div className='min-w-0 flex-1 leading-tight'>
          <p className='truncate text-sm font-medium'>
            {currentEmployee?.nickname}
          </p>
          <p className='truncate text-xs text-muted-foreground'>
            {currentEmployee?.position}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-0.5'>
          <UserPromptEditor />
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={newLabel}
            title={newLabel}
            onClick={startNewConversation}
          >
            <PlusCircle />
          </Button>
          {actions}
        </div>
      </header>
      {/* What the conversation starts from, from the moment it opens. */}
      {startItems.length ? (
        <p
          className='flex items-center gap-1.5 border-t bg-muted px-4 py-1.5 text-xs text-muted-foreground'
          title={start}
        >
          <Flag aria-hidden className='size-3.5 shrink-0' />
          <span className='min-w-0 truncate'>
            {text('assistantStart')}
            {language.startsWith('zh') ? '：' : ': '}
            {startItems.map((item, index) => (
              <span key={item.key}>
                {index > 0 ? ' · ' : ''}
                {item.kind ? `${item.kind} ` : ''}
                <span className='text-foreground'>{item.title}</span>
              </span>
            ))}
          </span>
        </p>
      ) : null}
    </div>
  );
}

// Reopens the conversation the user had open before the page was reloaded
// or left: the plugin starts every mount on a fresh draft, so the last
// real conversation's id is kept in this browser and selected once the
// catalog has loaded it. Starting a new conversation forgets it, so a
// reload after that starts fresh as the user asked.
const conversationKey = 'crm-assistant-conversation';

function RememberConversation(): null {
  const {
    activeConversationId,
    conversations,
    conversationsLoading,
    selectConversation,
  } = useAIChat();
  // Once per mount: a ref, since nothing renders from it.
  const restoredRef = useRef(false);
  // What the chat shows and holds, for the sidebar's conversation list:
  // the conversation it marks, and when to refresh its copy of the list
  // (read state included, so a conversation opened here loses its dot there).
  const signature = conversations
    .map(
      (item) =>
        `${item.id}:${item.title}:${item.updatedAt}:${item.unread ? 1 : 0}`,
    )
    .join('|');
  useEffect(() => {
    publishPanelChat({
      active:
        activeConversationId === AI_DRAFT_CONVERSATION_ID
          ? undefined
          : activeConversationId,
      signature,
    });
  }, [activeConversationId, signature]);
  // The chat unmounts when the panel closes: nothing is shown then.
  useEffect(() => () => publishPanelChat({}), []);
  useEffect(() => {
    try {
      if (activeConversationId !== AI_DRAFT_CONVERSATION_ID)
        localStorage.setItem(conversationKey, activeConversationId);
      // The mount starts on the draft before the restore below has run;
      // only a draft chosen after that (a new conversation) forgets.
      else if (restoredRef.current) localStorage.removeItem(conversationKey);
    } catch {
      // Storage may be unavailable; the conversation is then not remembered.
    }
  }, [activeConversationId]);
  // The catalog loads once the configuration is ready, so wait for a load
  // to have run (or for a catalog that is already there) before choosing.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    if (conversationsLoading) {
      loadedRef.current = true;
      return;
    }
    if (!loadedRef.current && !conversations.length) return;
    restoredRef.current = true;
    if (shortcutOpensPanel) {
      shortcutOpensPanel = false;
      return;
    }
    if (activeConversationId !== AI_DRAFT_CONVERSATION_ID) return;
    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem(conversationKey);
    } catch {
      return;
    }
    // Only a conversation of this user's, as the catalog lists them; a
    // stale id from another company or a deleted conversation is dropped.
    if (remembered && conversations.some((item) => item.id === remembered))
      selectConversation(remembered);
  }, [
    activeConversationId,
    conversations,
    conversationsLoading,
    selectConversation,
  ]);
  return null;
}

// Carries out what the sidebar asked the panel for (assistant-state.ts): a
// new conversation, at once, or an existing one once the conversation list
// has loaded. One the list does not hold (deleted elsewhere, or the list
// failed to load) leaves a new conversation, with an error toast, and the
// sidebar's list refreshed so its row goes.
function OpenRequestedConversation(): null {
  const request = useConversationRequest();
  const {
    conversations,
    conversationsLoading,
    selectConversation,
    startNewConversation,
  } = useAIChat();
  const { listConversations } = useAI();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const { text } = useCrmText();
  // The list has loaded once this mount (a load ran, or it was there).
  const loadedRef = useRef(false);
  useEffect(() => {
    if (conversationsLoading) loadedRef.current = true;
    if (!request) return;
    if (request === 'new') {
      clearConversationRequest();
      // A reload before its first message starts fresh too.
      try {
        localStorage.removeItem(conversationKey);
      } catch {
        // Storage may be unavailable; nothing was remembered then.
      }
      startNewConversation();
      return;
    }
    if (conversationsLoading) return;
    if (!loadedRef.current && !conversations.length) return;
    clearConversationRequest();
    if (conversations.some((item) => item.id === request)) {
      selectConversation(request);
      return;
    }
    // Not in this chat's list, which loads once per opening and narrows to
    // its search: the server says whether the conversation still exists.
    void listConversations()
      .then((all) => all.some((item) => item.id === request))
      .catch(() => false)
      .then((exists) => {
        if (exists) {
          selectConversation(request);
          return;
        }
        startNewConversation();
        toaster.show({ type: 'error', title: toText(text('chats.missing')) });
        void queryClient.invalidateQueries({
          queryKey: ['ai', 'conversations'],
        });
      });
  }, [
    request,
    conversations,
    conversationsLoading,
    listConversations,
    selectConversation,
    startNewConversation,
    toaster,
    queryClient,
    text,
  ]);
  return null;
}

// Deletes what the sidebar asks to delete while this chat is mounted
// (assistant-state.ts), through the plugin's own removal, which also starts
// a new conversation when the deleted one is on screen.
function DeleteRequestedConversation(): null {
  const request = useDeleteRequest();
  const { removeConversation } = useAIChat();
  useEffect(() => {
    setChatMounted(true);
    return () => setChatMounted(false);
  }, []);
  useEffect(() => {
    if (!request) return;
    const taken = takeDeleteRequest();
    if (!taken) return;
    removeConversation(taken.id).then(
      () => taken.settle(),
      (error: unknown) => taken.settle(error ?? new Error('delete failed')),
    );
  }, [request, removeConversation]);
  return null;
}
