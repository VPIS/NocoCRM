import { Button } from '#components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '#components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components/ui/tooltip';
import {
  AgentAvatar,
  CHAT_PANEL_ATTRIBUTE,
  ChatProvider,
  useAgentText,
  useChatAgents,
  useChatPanel,
  useConversationList,
} from '@nocobase/app-plugin-agents/client/chat';
import type { ConversationDetail } from '@nocobase/app-plugin-agents/shared/conversations';
import { Expand, History, Plus, X } from 'lucide-react';
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useIsMobile } from '../../../hooks/use-mobile.js';
import { toText, useCrmText, useLiveSessionUserId } from '../api.js';
import { CLOSE_EMPLOYEE_PANEL, usePanelOpen } from '../assistant-state.js';
import {
  RecordDrawerContext,
  useRecordDrawerHosted,
  useRecordDrawerState,
} from '../record-drawer.js';
import { useAgentReadiness } from './ask.js';
import { Conversation } from './conversation.js';
import { ConversationList } from './conversation-list.js';

// The CRM assistant's panel on the Agents plugin (migration step 3): Noco's
// conversations beside every page, as the AI Employee's panel was (28rem,
// pushing the page from 1280px, floating narrower, full screen on a phone).
// Its state is the plugin's (`useChatPanel`: open, the conversation or a new
// one, the history view, pins, drafts, ⌘J); the conversation and its list
// are the ones the full page (/crm/agent-chat) shows. The AI Employee's
// panel stays for the reports page's AI analysis and the global search: the
// two never show together.

// The record drawer's code loads only when a plan step's record is first
// opened from the panel on a page that hosts no drawer of its own.
const RecordDrawer = lazy(() =>
  import('../../../pages/crm-detail.js').then((module) => ({
    default: module.RecordDrawer,
  })),
);

export function CrmAgentChatProvider({
  children,
}: {
  children?: ReactNode;
}): ReactElement {
  // The chat exists only for a signed-in person: signed out, its shortcut,
  // links and queries do nothing.
  const signedIn = Boolean(useLiveSessionUserId());
  return (
    <ChatProvider
      available={signedIn}
      conversationPath={(id) => `/crm/agent-chat/${encodeURIComponent(id)}`}
    >
      {children}
      {signedIn ? <AgentPanel /> : null}
    </ChatProvider>
  );
}

function AgentPanel(): ReactElement | null {
  const { text } = useCrmText();
  const panel = useChatPanel();
  const employeeOpen = usePanelOpen();
  const isMobile = useIsMobile();
  const { open, closeChat } = panel;
  // One panel at a time: the one opened last stays. After a reload both may
  // come back open: the AI Employee's closes.
  const previousRef = useRef({ open: false, employeeOpen: false });
  useEffect(() => {
    const before = previousRef.current;
    previousRef.current = { open, employeeOpen };
    if (!(open && employeeOpen)) return;
    if (before.open && !before.employeeOpen) closeChat();
    else window.dispatchEvent(new Event(CLOSE_EMPLOYEE_PANEL));
  }, [open, employeeOpen, closeChat]);
  // The page makes room for the docked panel (client/styles.css).
  useEffect(() => {
    document.body.classList.toggle('crm-agent-panel-open', open && !isMobile);
    return () => document.body.classList.remove('crm-agent-panel-open');
  }, [open, isMobile]);
  if (!open) return null;
  if (isMobile)
    return (
      <Dialog
        open
        onOpenChange={(next) => {
          if (!next) closeChat();
        }}
      >
        <DialogContent
          // The plugin's marker: focus inside is "in the panel" (⌘J closes
          // it, its focus return applies).
          {...{ [CHAT_PANEL_ATTRIBUTE]: '' }}
          showCloseButton={false}
          className='flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:max-w-none'
        >
          <PanelBody modal />
        </DialogContent>
      </Dialog>
    );
  return (
    <aside
      data-crm-agent-panel=''
      {...{ [CHAT_PANEL_ATTRIBUTE]: '' }}
      aria-label={toText(text('agentPanel.title'))}
      className='fixed inset-y-0 right-0 z-30 flex w-[28rem] max-w-full flex-col border-l border-border bg-background shadow-lg'
      onKeyDown={(event) => {
        // Escape closes the topmost layer: a menu or a drawer inside the
        // panel takes it first.
        if (event.key === 'Escape' && !event.defaultPrevented) closeChat();
      }}
    >
      <PanelBody />
    </aside>
  );
}

function PanelBody({ modal = false }: { modal?: boolean }): ReactElement {
  const { text } = useCrmText();
  const agentText = useAgentText();
  const panel = useChatPanel();
  const agents = useChatAgents();
  const readiness = useAgentReadiness();
  const list = useConversationList({});
  // The page's drawer when it draws one, else the panel's own (one
  // `?open=` never opens two).
  const pageHosts = useRecordDrawerHosted();
  const drawer = useRecordDrawerState({ host: false });
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  if (!pageHosts && drawer.opened && !drawerLoaded) setDrawerLoaded(true);
  const conversationId = panel.conversationId;
  // A new conversation stays the same view once its first message creates
  // it; each New conversation starts afresh.
  const isNew = conversationId === null;
  const [fresh, setFresh] = useState<{
    onNew: boolean;
    session: number;
    id: string | null;
  }>(() => ({ onNew: isNew, session: 0, id: null }));
  if (isNew !== fresh.onNew)
    setFresh({
      onNew: isNew,
      session: isNew ? fresh.session + 1 : fresh.session,
      id: isNew ? null : fresh.id,
    });
  const viewKey =
    isNew || conversationId === fresh.id
      ? `new-${String(fresh.session)}`
      : conversationId;
  const created = (conversation: ConversationDetail): void => {
    setFresh((current) => ({ ...current, id: conversation.id }));
    panel.selectConversation(conversation.id);
  };
  const agent = readiness.agent;
  const name = agent ? agentText.name(agent) : text('agentPanel.title');
  const role = agent ? agentText.description(agent) : null;
  const iconButton = (
    label: string,
    icon: ReactElement,
    onClick: () => void,
    pressed?: boolean,
  ): ReactElement => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
  const history = panel.view === 'history';
  const body = (
    <div className='flex min-h-0 flex-1 flex-col px-4'>
      {!history && !conversationId && readiness.state === 'unavailable' ? (
        // No agent to start a conversation with: why, not an empty picker.
        <p className='m-auto max-w-xs py-10 text-center text-sm text-muted-foreground'>
          {readiness.reason}
        </p>
      ) : history ? (
        <div className='flex min-h-0 flex-1 flex-col pt-3'>
          <ConversationList
            query={list}
            openId={conversationId}
            archived={false}
            onOpen={(id) => panel.selectConversation(id)}
          />
        </div>
      ) : (
        <Conversation
          key={viewKey}
          conversationId={conversationId}
          agents={agents.data ?? []}
          onCreated={created}
          onArchived={() => panel.selectConversation(null)}
          onRestored={() => undefined}
          onBack={() => panel.setView('history')}
        />
      )}
    </div>
  );
  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      <header className='flex items-center gap-1 border-b border-border/60 px-3 py-2'>
        {iconButton(
          toText(text('agentPanel.history')),
          <History />,
          () => panel.setView(history ? 'chat' : 'history'),
          history,
        )}
        <AgentAvatar name={name} size='sm' className='ml-1 shrink-0' />
        <div className='mx-1.5 min-w-0 flex-1'>
          {modal ? (
            <DialogTitle className='truncate text-sm font-medium'>
              {name}
            </DialogTitle>
          ) : (
            <p className='truncate text-sm font-medium'>{name}</p>
          )}
          {role ? (
            <p className='truncate text-xs text-muted-foreground'>{role}</p>
          ) : null}
        </div>
        {iconButton(toText(text('agentPanel.newConversation')), <Plus />, () =>
          panel.selectConversation(null),
        )}
        {conversationId && panel.openPage && !modal
          ? iconButton(
              toText(text('agentPanel.openFullPage')),
              <Expand />,
              () => panel.openPage?.(conversationId),
            )
          : null}
        {iconButton(toText(text('agentPanel.close')), <X />, () =>
          panel.closeChat(),
        )}
      </header>
      {body}
      {!pageHosts && drawerLoaded ? (
        <Suspense fallback={null}>
          <RecordDrawer
            target={drawer.opened}
            open={drawer.open}
            close={drawer.close}
          />
        </Suspense>
      ) : null}
    </RecordDrawerContext.Provider>
  );
}
