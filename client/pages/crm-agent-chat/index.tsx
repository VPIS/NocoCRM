import { Button } from '#components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#components/ui/empty';
import { Skeleton } from '#components/ui/skeleton';
import {
  ChatProvider,
  useChatAgents,
  useConversationList,
} from '@nocobase/app-plugin-agents/client/chat';
import type { ConversationDetail } from '@nocobase/app-plugin-agents/shared/conversations';
import { Bot, MessagesSquare, Plus } from 'lucide-react';
import { lazy, Suspense, useRef, useState, type ReactElement } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { BackButton } from '../../components/back-button.js';
import { useCrmText } from '../../components/crm/api.js';
import { CrmFrame, ErrorNotice } from '../../components/crm/common.js';
import {
  RecordDrawerContext,
  useRecordDrawerState,
} from '../../components/crm/record-drawer.js';
import { Conversation } from './conversation.js';
import { ConversationList } from './conversation-list.js';

// The conversations with the Agents plugin's agents (migration step 2): the
// reader's conversations beside the one open (frontend standard §3.5), a new
// one at /new. Root only while the AI Employee assistant stays everyone's
// (routes.ts); the plans an agent proposes are decided here, in the inbox and
// on the records they change. A record a plan names opens in the drawer over
// the conversation.

// The records a plan step names open in the detail page's drawer; its code
// loads only when one is first opened.
const RecordDrawer = lazy(() =>
  import('../crm-detail.js').then((module) => ({
    default: module.RecordDrawer,
  })),
);

export default function AgentChatPage(): ReactElement {
  return (
    <ChatProvider
      available
      conversationPath={(id) => `/crm/agent-chat/${encodeURIComponent(id)}`}
    >
      <AgentChat />
    </ChatProvider>
  );
}

function AgentChat(): ReactElement {
  const { text } = useCrmText();
  const navigate = useNavigate();
  const params = useParams<{ conversationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = params.conversationId === 'new';
  const openId = isNew ? null : (params.conversationId ?? null);
  const archived = searchParams.get('archived') === '1';
  const drawer = useRecordDrawerState();
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  if (drawer.opened && !drawerLoaded) setDrawerLoaded(true);

  const agents = useChatAgents();
  const open = useConversationList({});
  const archivedList = useConversationList({ archived: true });
  const list = archived ? archivedList : open;
  const listRef = useRef<HTMLElement>(null);
  // Archived ones stay in reach from the empty state, once the last open
  // conversation is archived.
  const hasArchived =
    archivedList.data?.pages.some((page) => page.items.length) ?? false;
  const showArchived = (shown: boolean): void =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (shown) next.set('archived', '1');
      else next.delete('archived');
      return next;
    });
  const none =
    !open.isLoading &&
    !open.error &&
    !(open.data?.pages.some((page) => page.items.length) ?? false);

  // A new conversation stays the same view once its first message creates
  // it and the address becomes its own; each arrival at /new starts afresh,
  // while a change of the query (showing the archived ones) keeps the
  // agent picked and the text typed.
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
    openId === null || openId === fresh.id ? `new-${fresh.session}` : openId;
  const created = (conversation: ConversationDetail): void => {
    setFresh((current) => ({ ...current, id: conversation.id }));
    void navigate(
      `/crm/agent-chat/${encodeURIComponent(conversation.id)}${archived ? '?archived=1' : ''}`,
      { replace: true },
    );
  };
  const archivedOne = (): void => {
    void navigate('/crm/agent-chat');
    // The open conversation left the view: on to the list.
    requestAnimationFrame(() => listRef.current?.focus());
  };

  const newButton = (
    <Button render={<Link to='/crm/agent-chat/new' />} nativeButton={false}>
      <Plus />
      {text('agentChat.new')}
    </Button>
  );
  const detailOpen = isNew || openId !== null;
  // The reader's first conversation: no list beside it yet.
  const first = none && !archived;
  // While nothing is known yet the header offers nothing; with no
  // conversation at all the empty state holds the only way to start one,
  // and a first conversation being started needs none.
  const headerAction = open.isLoading || first ? undefined : newButton;

  let body: ReactElement;
  if (open.isLoading && !detailOpen)
    body = (
      <div className='grid gap-2 @3xl:w-80' role='status'>
        <span className='sr-only'>{text('loading')}</span>
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className='h-14 w-full rounded-lg' />
        ))}
      </div>
    );
  else if (none && !archived && !isNew)
    body = (
      <EmptyBlock
        icon={<MessagesSquare />}
        title={text('agentChat.empty')}
        description={text('agentChat.emptyDescription')}
        action={
          <div className='flex flex-wrap justify-center gap-2'>
            {newButton}
            {hasArchived ? (
              <Button variant='ghost' onClick={() => showArchived(true)}>
                {text('agentChat.showArchived')}
              </Button>
            ) : null}
          </div>
        }
      />
    );
  else
    body = (
      <div
        className={`grid min-h-0 flex-1 gap-6 ${first ? '' : '@3xl:grid-cols-[20rem_minmax(0,1fr)]'}`}
      >
        {first ? null : (
          <div
            className={`min-h-0 flex-col ${detailOpen ? 'hidden @3xl:flex' : 'flex'}`}
          >
            <ConversationList
              ref={listRef}
              query={list}
              openId={openId}
              archived={archived}
              onArchived={showArchived}
            />
          </div>
        )}
        <div
          className={`min-h-0 min-w-0 flex-col ${detailOpen ? 'flex' : 'hidden @3xl:flex'}`}
        >
          {detailOpen ? (
            <>
              {/* Narrow, the list and the conversation take turns. */}
              <div className='mb-2 @3xl:hidden'>
                <BackButton
                  to={`/crm/agent-chat${archived ? '?archived=1' : ''}`}
                />
              </div>
              {isNew && agents.isLoading ? (
                <div className='flex flex-col gap-3' role='status'>
                  <span className='sr-only'>{text('loading')}</span>
                  <Skeleton className='h-8 w-48' />
                  <Skeleton className='h-24 w-full' />
                </div>
              ) : isNew && agents.error ? (
                <div className='flex flex-col items-start gap-2'>
                  <ErrorNotice error={agents.error} />
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => void agents.refetch()}
                  >
                    {text('agentChat.retry')}
                  </Button>
                </div>
              ) : isNew && !agents.data?.length ? (
                <EmptyBlock
                  icon={<Bot />}
                  title={text('agentChat.noAgent')}
                  description={text('agentChat.noAgentDescription')}
                  action={
                    <Button
                      variant='outline'
                      render={<Link to='/settings/agents' />}
                      nativeButton={false}
                    >
                      {text('agentChat.manageAgents')}
                    </Button>
                  }
                />
              ) : (
                <Conversation
                  key={viewKey}
                  conversationId={openId}
                  agents={agents.data ?? []}
                  onCreated={created}
                  onArchived={archivedOne}
                  // Restored, it is listed with the open ones again.
                  onRestored={() => showArchived(false)}
                />
              )}
            </>
          ) : (
            <p className='m-auto text-sm text-muted-foreground'>
              {text('agentChat.nothingOpen')}
            </p>
          )}
        </div>
      </div>
    );

  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      <CrmFrame
        fill
        title={text('navigation.agentChat')}
        description={text('agentChat.description')}
        actions={headerAction}
      >
        <div className='@container flex min-h-0 flex-1 flex-col'>{body}</div>
      </CrmFrame>
      {drawerLoaded && (
        <Suspense fallback={null}>
          <RecordDrawer
            target={drawer.opened}
            open={drawer.open}
            close={drawer.close}
          />
        </Suspense>
      )}
    </RecordDrawerContext.Provider>
  );
}

function EmptyBlock({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactElement;
  title: string;
  description: string;
  action: ReactElement;
}): ReactElement {
  return (
    <Empty className='border border-dashed'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{action}</EmptyContent>
    </Empty>
  );
}
