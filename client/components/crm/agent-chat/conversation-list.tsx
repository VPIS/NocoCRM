import { Button } from '#components/ui/button';
import { Skeleton } from '#components/ui/skeleton';
import {
  useAgentText,
  type ConversationListPages,
} from '@nocobase/app-plugin-agents/client/chat';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import {
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { NavLink } from 'react-router';
import { relativeTime, useCrmText } from '../api.js';
import { AutoLoadMore } from '../auto-load.js';
import { ErrorNotice } from '../common.js';

// The reader's conversations with the agents, last message first: the side
// list of the page (frontend standard §3.5), each row its conversation's
// address, the open one marked. Archived ones are a list of their own.
export function ConversationList({
  ref,
  query,
  openId,
  archived,
  onArchived,
  onOpen,
}: {
  ref?: Ref<HTMLElement>;
  query: UseInfiniteQueryResult<ConversationListPages>;
  openId: string | null;
  archived: boolean;
  // Showing the archived ones instead of the open; left out, the list has
  // no such switch (the assistant panel's history).
  onArchived?: (shown: boolean) => void;
  // Opening a conversation in place (the panel); left out, a row is a link
  // to the conversation's page.
  onOpen?: (id: string) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const agentText = useAgentText();
  // The list stays on the page: its times move on with the clock.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const suffix = archived ? '?archived=1' : '';
  const toggle = (
    <Button
      variant='ghost'
      size='sm'
      className='text-muted-foreground'
      onClick={() => onArchived?.(!archived)}
    >
      {text(archived ? 'agentChat.hideArchived' : 'agentChat.showArchived')}
    </Button>
  );
  return (
    <nav
      ref={ref}
      tabIndex={-1}
      aria-label={text(archived ? 'agentChat.archivedList' : 'agentChat.list')}
      className='flex min-h-0 flex-col outline-none'
    >
      <div className='min-h-0 flex-1 overflow-y-auto scroll-quiet'>
        {query.isLoading ? (
          <div className='flex flex-col gap-2 p-1' role='status'>
            <span className='sr-only'>{text('loading')}</span>
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className='h-14 w-full rounded-lg' />
            ))}
          </div>
        ) : query.error ? (
          <div className='flex flex-col items-start gap-2 p-1'>
            <ErrorNotice error={query.error} />
            <Button
              variant='outline'
              size='sm'
              onClick={() => void query.refetch()}
            >
              {text('agentChat.retry')}
            </Button>
          </div>
        ) : !items.length ? (
          <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
            <p className='text-sm text-muted-foreground'>
              {text(archived ? 'agentChat.noArchived' : 'agentChat.empty')}
            </p>
          </div>
        ) : (
          <ul className='flex flex-col gap-0.5'>
            {items.map((conversation) => {
              const title = conversation.title || text('agentChat.untitled');
              const unread = !conversation.read;
              return (
                <li key={conversation.id}>
                  <RowTarget
                    to={`/crm/agent-chat/${encodeURIComponent(conversation.id)}${suffix}`}
                    onOpen={onOpen ? () => onOpen(conversation.id) : undefined}
                    current={conversation.id === openId}
                    className={`relative flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-[background-color,border-color] ${
                      conversation.id === openId
                        ? 'border-border bg-card shadow-xs'
                        : 'border-transparent hover:bg-accent/60'
                    }`}
                  >
                    <span className='flex items-center gap-2'>
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${unread ? 'font-semibold' : ''}`}
                        title={title}
                      >
                        {title}
                      </span>
                      {unread ? (
                        <span className='size-2 shrink-0 rounded-full bg-primary'>
                          <span className='sr-only'>
                            {text('agentChat.unread')}
                          </span>
                        </span>
                      ) : null}
                    </span>
                    <span className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <span className='min-w-0 flex-1 truncate'>
                        {agentText.name(conversation.agent) ??
                          text('agentChat.agent')}
                      </span>
                      <span className='shrink-0'>
                        {relativeTime(
                          conversation.lastMessageAt,
                          language,
                          now,
                          text('justNow'),
                        )}
                      </span>
                    </span>
                  </RowTarget>
                </li>
              );
            })}
          </ul>
        )}
        <AutoLoadMore
          hasMore={Boolean(query.hasNextPage)}
          loading={query.isFetchingNextPage}
          onLoad={() => void query.fetchNextPage()}
        />
      </div>
      {onArchived ? (
        <div className='border-t border-border/60 pt-2'>{toggle}</div>
      ) : null}
    </nav>
  );
}

// A row: a link to the conversation's page, or a button opening it in place.
function RowTarget({
  to,
  onOpen,
  current,
  className,
  children,
}: {
  to: string;
  onOpen: (() => void) | undefined;
  current: boolean;
  className: string;
  children: ReactNode;
}): ReactElement {
  return onOpen ? (
    <button
      type='button'
      className={className}
      aria-current={current ? 'true' : undefined}
      onClick={onOpen}
    >
      {children}
    </button>
  ) : (
    <NavLink
      to={to}
      aria-current={current ? 'page' : undefined}
      className={className}
    >
      {children}
    </NavLink>
  );
}
