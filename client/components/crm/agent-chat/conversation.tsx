import { Button } from '#components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select';
import { Skeleton } from '#components/ui/skeleton';
import { Spinner } from '#components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components/ui/tooltip';
import { useTranslation } from '@nocobase/i18n/client';
import {
  AgentAvatar,
  liveStepsView,
  newConversationAgent,
  noticeText,
  stepLineText,
  timelineOrder,
  useAgentText,
  useConversation,
  useConversationActions,
  useConversationMessages,
  useLiveRunEvents,
  useSendMessage,
  type NewsNotice,
} from '@nocobase/app-plugin-agents/client/chat';
import type {
  ChatAgent,
  ChatAvailability,
  ConversationDetail,
  ConversationMessage,
} from '@nocobase/app-plugin-agents/shared/conversations';
import { Archive, ArchiveRestore, ArrowDown, Info } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import { errorCode, toText, useCrmText } from '../api.js';
import { AutoLoadMore } from '../auto-load.js';
import { ErrorNotice } from '../common.js';
import { Markdown } from '../markdown.js';
import { PlanCard } from '../plan-card.js';
import { usePlans } from '../plans.js';
import { CRM_SOURCE, useAgentModels } from './ask.js';
import { Composer } from './composer.js';

// One conversation with an agent, or a new one (`conversationId` null): its
// messages, the notices of what happened meanwhile, the plans the agent
// proposed in it, placed by time, the line of what its run is doing, and the
// composer. The data are the Agents plugin's headless chat.

const AGENTS_NS = '@nocobase/app-plugin-agents';

export function Conversation({
  conversationId,
  agents,
  onCreated,
  onArchived,
  onRestored,
  onBack,
}: {
  conversationId: string | null;
  agents: readonly ChatAgent[];
  onCreated: (conversation: ConversationDetail) => void;
  onArchived: () => void;
  onRestored: () => void;
  // Back to the conversations from one that is gone: in the panel its own
  // list; left out, the full page's.
  onBack?: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const { t: agentsT } = useTranslation(AGENTS_NS);
  const agentText = useAgentText();
  const detail = useConversation(conversationId);
  const conversation = detail.data;
  const messages = useConversationMessages(
    conversationId,
    Boolean(conversation?.run),
  );
  const actions = useConversationActions();
  const [picked, setPicked] = useState<string | null>(null);
  // The agent a new conversation goes to; when none can answer, the one
  // picked or the first, so the reason it cannot is shown.
  const agent = conversationId
    ? null
    : (newConversationAgent(agents, picked) ??
      agents.find((item) => item.id === picked) ??
      agents[0] ??
      null);
  // A new conversation answers with the model picked for it.
  const models = useAgentModels(agent);
  const send = useSendMessage({
    conversationId,
    agentId: agent?.id ?? null,
    source: CRM_SOURCE,
    model: models.model
      ? { modelService: models.model.modelService, model: models.model.model }
      : null,
    dispatch: messages.dispatch,
    onCreated,
  });
  const plans = usePlans(
    conversationId ? { conversationId } : {},
    Boolean(conversationId),
  );
  // A new conversation has none: the disabled query would still answer
  // with whatever the cache holds under the unfiltered key.
  const shownPlans = conversationId ? (plans.data ?? []) : [];
  // The agent's messages may follow a plan it proposed: look again as they
  // arrive.
  const refetchPlans = plans.refetch;
  useEffect(() => {
    if (conversationId && messages.lastSeq) void refetchPlans();
  }, [conversationId, messages.lastSeq, refetchPlans]);
  // Opening a conversation reads it.
  const markRead = actions.markRead;
  useEffect(() => {
    if (conversationId && conversation && !conversation.read)
      markRead(conversationId);
  }, [conversationId, conversation, markRead]);

  // The view stays at the latest message as new ones arrive, unless the
  // reader scrolled up, who is offered the way back.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const items = messages.items.length + messages.pending.length;
  const planCount = shownPlans.length;
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (box && atBottom) box.scrollTop = box.scrollHeight;
  }, [items, planCount, atBottom, conversation?.run]);
  const toLatest = (): void => {
    const box = scrollRef.current;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  };

  if (conversationId && detail.error) {
    const missing = errorCode(detail.error).code === 'notFound';
    return (
      <div className='flex flex-col items-start gap-3 p-6'>
        {missing ? (
          <p className='text-sm text-muted-foreground'>
            {text('agentChat.notFound')}
          </p>
        ) : (
          <>
            <ErrorNotice error={detail.error} />
            <Button
              variant='outline'
              size='sm'
              onClick={() => void detail.refetch()}
            >
              {text('agentChat.retry')}
            </Button>
          </>
        )}
        <Button
          variant='ghost'
          size='sm'
          {...(onBack
            ? { onClick: onBack }
            : {
                render: <Link to='/crm/agent-chat' />,
                nativeButton: false,
              })}
        >
          {text('agentChat.backToList')}
        </Button>
      </div>
    );
  }

  const agentName = (id: string): string =>
    agents.find((item) => item.id === id)?.name ?? text('agentChat.agent');
  const newsText = (notice: NewsNotice): string | null =>
    notice.type === 'planDecided'
      ? text(`plans.news.${toText(notice.params?.decision)}`, {
          title: notice.title,
        })
      : null;
  const shownAgent = conversation?.agent ?? agent;
  const name = shownAgent
    ? (agentText.name(shownAgent) ?? text('agentChat.agent'))
    : text('agentChat.agent');
  const availability: ChatAvailability | null =
    conversation?.availability ??
    (agent && !agent.fallbackAgentId ? agent.availability : null);
  const offline =
    availability && !availability.online && availability.reason
      ? text(`agentChat.offline.${availability.reason}`)
      : null;
  const archived = Boolean(conversation?.archivedAt);
  const loading = conversationId ? detail.isLoading : false;

  const timeline = timelineOrder([
    ...messages.items.map((message) => ({
      key: message.id,
      at: message.createdAt,
      rank: 0,
      node: (
        <MessageRow
          message={message}
          agentName={name}
          notice={(item) =>
            noticeText(
              agentsT,
              item.metadata.notice,
              item.content.content,
              agentName,
              newsText,
            )
          }
        />
      ),
    })),
    ...shownPlans.map((plan) => ({
      key: `plan-${plan.id}`,
      at: plan.createdAt,
      rank: 1,
      node: <PlanCard plan={plan} origin={false} />,
    })),
    ...messages.pending.map((message) => ({
      key: message.clientId,
      at: message.createdAt,
      rank: 2,
      node: (
        <UserBubble
          content={message.content}
          footer={
            message.status === 'failed' ? (
              <span className='flex items-center gap-2 text-xs text-destructive'>
                {text('agentChat.notSent')}
                <Button
                  variant='link'
                  size='xs'
                  className='h-auto p-0'
                  onClick={() =>
                    void send({
                      content: message.content,
                      context: message.context,
                      clientId: message.clientId,
                    })
                  }
                >
                  {text('agentChat.sendAgain')}
                </Button>
              </span>
            ) : (
              <span className='text-xs text-muted-foreground'>
                {text('agentChat.sending')}
              </span>
            )
          }
        />
      ),
    })),
  ]);

  return (
    <section
      aria-label={conversation?.title ?? text('agentChat.new')}
      className='flex min-h-0 flex-1 flex-col'
    >
      {/* Who answers, and what can be done with the conversation. */}
      <div className='flex min-h-11 items-center gap-2 border-b border-border/60 pb-2'>
        {conversationId ? (
          loading ? (
            <Skeleton className='h-6 w-40' />
          ) : (
            <>
              <AgentAvatar name={name} size='sm' />
              <span className='min-w-0 truncate text-sm font-medium'>
                {conversation?.title || name}
              </span>
              {conversation?.title ? (
                <span className='hidden truncate text-xs text-muted-foreground sm:inline'>
                  {name}
                </span>
              ) : null}
              {!archived ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        className='ml-auto'
                        aria-label={text('agentChat.archive')}
                        disabled={actions.archive.isPending}
                        onClick={() =>
                          actions.archive.mutate(
                            { id: conversationId, archived: true },
                            { onSuccess: onArchived },
                          )
                        }
                      />
                    }
                  >
                    <Archive />
                  </TooltipTrigger>
                  <TooltipContent>{text('agentChat.archive')}</TooltipContent>
                </Tooltip>
              ) : null}
            </>
          )
        ) : (
          <AgentPicker
            agents={agents}
            value={agent?.id ?? null}
            onChange={setPicked}
          />
        )}
      </div>

      <div className='relative min-h-0 flex-1'>
        <div
          ref={scrollRef}
          onScroll={(event) => {
            const box = event.currentTarget;
            setAtBottom(
              box.scrollHeight - box.scrollTop - box.clientHeight < 48,
            );
          }}
          className='h-full overflow-y-auto py-4 scroll-quiet'
        >
          {loading || (conversationId && !messages.loaded) ? (
            <div className='flex flex-col gap-4' role='status'>
              <span className='sr-only'>{text('loading')}</span>
              <Skeleton className='ml-auto h-10 w-2/3 rounded-xl' />
              <Skeleton className='h-20 w-3/4 rounded-xl' />
              <Skeleton className='ml-auto h-10 w-1/2 rounded-xl' />
            </div>
          ) : (
            <div className='flex flex-col gap-4'>
              <AutoLoadMore
                hasMore={messages.hasMore}
                loading={messages.loadingOlder}
                onLoad={messages.loadOlder}
              />
              {messages.error ? (
                <div className='flex flex-col items-start gap-2'>
                  <ErrorNotice error={messages.error} />
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={messages.fetchNewer}
                  >
                    {text('agentChat.retry')}
                  </Button>
                </div>
              ) : null}
              {timeline.map((entry) => (
                <div key={entry.key}>{entry.node}</div>
              ))}
              {conversation?.run ? (
                <LiveLine runId={conversation.run.id} agentName={name} />
              ) : null}
            </div>
          )}
        </div>
        {!atBottom ? (
          <Button
            variant='outline'
            size='sm'
            className='absolute bottom-3 left-1/2 -translate-x-1/2 shadow-sm'
            onClick={toLatest}
          >
            <ArrowDown />
            {text('agentChat.jumpToLatest')}
          </Button>
        ) : null}
      </div>

      {archived && conversationId ? (
        <div className='flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 pb-4'>
          <Info className='size-4 text-muted-foreground' aria-hidden />
          <span className='text-sm text-muted-foreground'>
            {text('agentChat.archivedNote')}
          </span>
          <Button
            variant='outline'
            size='sm'
            className='ml-auto'
            disabled={actions.archive.isPending}
            onClick={() =>
              actions.archive.mutate(
                { id: conversationId, archived: false },
                { onSuccess: onRestored },
              )
            }
          >
            <ArchiveRestore />
            {text('agentChat.restore')}
          </Button>
        </div>
      ) : (
        <Composer
          disabled={loading || (!conversationId && !agent)}
          reason={offline}
          {...(conversationId
            ? {}
            : {
                models: models.models,
                model: models.model,
                onModel: models.select,
              })}
          onSend={({ content, context, attachments }) =>
            void send({ content, context, attachments })
          }
        />
      )}
    </section>
  );
}

function AgentPicker({
  agents,
  value,
  onChange,
}: {
  agents: readonly ChatAgent[];
  value: string | null;
  onChange: (id: string) => void;
}): ReactElement {
  const { text } = useCrmText();
  const agentText = useAgentText();
  const nameOf = (agent: ChatAgent): string =>
    agentText.name(agent) || text('agentChat.agent');
  const usable = (agent: ChatAgent): boolean =>
    agent.availability.online || Boolean(agent.fallbackAgentId);
  const current = agents.find((agent) => agent.id === value);
  if (agents.length === 1 && current)
    return (
      <span className='flex items-center gap-2 text-sm font-medium'>
        <AgentAvatar name={nameOf(current)} size='sm' />
        {nameOf(current)}
      </span>
    );
  return (
    <Select
      value={value ?? ''}
      onValueChange={(next) => {
        if (typeof next === 'string' && next) onChange(next);
      }}
    >
      <SelectTrigger
        size='sm'
        className='min-w-48'
        aria-label={text('agentChat.agent')}
      >
        <SelectValue>
          {current ? nameOf(current) : text('agentChat.agent')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className='w-auto max-w-[min(var(--container-sm),var(--available-width))] min-w-(--anchor-width) [&_[data-slot=select-item]>:first-child]:whitespace-normal'>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id} disabled={!usable(agent)}>
            <span className='flex flex-col'>
              <span>{nameOf(agent)}</span>
              {!usable(agent) && agent.availability.reason ? (
                <span className='text-xs text-muted-foreground'>
                  {text(`agentChat.offline.${agent.availability.reason}`)}
                </span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MessageRow({
  message,
  agentName,
  notice,
}: {
  message: ConversationMessage;
  agentName: string;
  notice: (message: ConversationMessage) => string;
}): ReactElement | null {
  if (message.role === 'user')
    return <UserBubble content={message.content.content} />;
  if (message.role === 'system')
    return (
      <p className='flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground'>
        <Info className='size-3.5 shrink-0' aria-hidden />
        {notice(message)}
      </p>
    );
  if (!message.content.content.trim()) return null;
  return (
    <div className='flex max-w-[85%] gap-2'>
      <AgentAvatar name={agentName} size='sm' className='mt-0.5 shrink-0' />
      <div className='min-w-0 text-sm'>
        <Markdown>{message.content.content}</Markdown>
      </div>
    </div>
  );
}

function UserBubble({
  content,
  footer,
}: {
  content: string;
  footer?: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <div className='ml-auto flex max-w-[85%] flex-col items-end gap-1'>
      <span className='sr-only'>{text('agentChat.you')}</span>
      <div className='rounded-xl bg-muted px-3 py-2 text-sm break-words whitespace-pre-wrap'>
        {content}
      </div>
      {footer}
    </div>
  );
}

// What the agent's run is doing now, summed up in one line.
function LiveLine({
  runId,
  agentName,
}: {
  runId: string;
  agentName: string;
}): ReactElement {
  const { text } = useCrmText();
  const { t: agentsT } = useTranslation(AGENTS_NS);
  const events = useLiveRunEvents(runId);
  const view = liveStepsView(events);
  return (
    <p
      role='status'
      className='flex items-center gap-2 text-sm text-muted-foreground'
    >
      <Spinner />
      {text('agentChat.working', {
        agent: agentName,
        step: stepLineText(agentsT, view.line),
      })}
    </p>
  );
}
