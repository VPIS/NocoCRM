import { useInfiniteQuery } from '@tanstack/react-query';
import { MessageCircle, Plug } from 'lucide-react';
import { lazy, Suspense, useState, type ReactElement } from 'react';
import { Link, Outlet, useParams, useSearchParams } from 'react-router';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Badge } from '#components/ui/badge';
import { Button } from '#components/ui/button';
import { Card } from '#components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#components/ui/empty';
import { Skeleton } from '#components/ui/skeleton';
import { Spinner } from '#components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '#components/ui/tabs';
import { useToaster } from '@nocobase/app-client';
import {
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
} from '../../components/crm/api.js';
import {
  RecordDrawerContext,
  useRecordDrawerState,
} from '../../components/crm/record-drawer.js';
import {
  LIST_POLL_MS,
  VIEWS,
  useConversationsKey,
  viewOf,
  type ConversationRow,
  type ConversationView,
} from '../../components/crm/whatsapp/api.js';
import { MessageSummary } from '../../components/crm/whatsapp/messages.js';
import { WhatsAppFailure } from '../../components/crm/whatsapp/failure.js';

// The WhatsApp page (/crm/whatsapp): the company number's conversations with
// customers, an inbox of two panes as the Mail workspace is — the list on
// the left, the conversation open beside it (/crm/whatsapp/:conversationId,
// its own route, pages/crm-whatsapp/conversation.tsx). Which conversations
// the list shows is its tab, kept in the address (?view=). Records named in
// a conversation open in the record drawer over the page (?open=). Kept
// current by asking again every few seconds (LIST_POLL_MS), so it has no
// Refresh. On a phone one pane shows at a time.

const RecordDrawer = lazy(() =>
  import('../crm-detail.js').then((module) => ({
    default: module.RecordDrawer,
  })),
);

const PAGE = 50;

export default function WhatsAppPage(): ReactElement {
  const { text } = useCrmText();
  const { conversationId } = useParams();
  const [params, setParams] = useSearchParams();
  const view = viewOf(params);
  const { data: meta } = useMetadata();
  const drawer = useRecordDrawerState();
  // Loaded on the first open and kept mounted after, so closing animates.
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  if (drawer.opened && !drawerLoaded) setDrawerLoaded(true);
  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      <PageContainer>
        <PageHeader
          title={toText(text('whatsapp.title'))}
          description={toText(text('whatsapp.description'))}
          // The number's connection, for whoever manages the CRM's settings,
          // as the mailbox leads to its accounts.
          actions={
            meta?.settingsAccess ? (
              <Button
                variant='outline'
                nativeButton={false}
                render={<Link to='/crm/whatsapp/connection' />}
              >
                <Plug data-icon='inline-start' />
                {text('whatsapp.manageConnection')}
              </Button>
            ) : undefined
          }
        />
        {/* Both panes scroll on their own: the card takes the height left
            under the header on a wide screen (design: F7). */}
        <Card className='h-[calc(100dvh-12rem)] min-h-96 gap-0 overflow-hidden p-0 md:flex-row'>
          <aside
            className={`${conversationId ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-border md:w-80 md:shrink-0 md:border-r`}
          >
            <div className='border-b border-border p-3'>
              <Tabs
                value={view}
                onValueChange={(next) =>
                  setParams(
                    (previous) => {
                      const nextParams = new URLSearchParams(previous);
                      nextParams.set('view', String(next));
                      return nextParams;
                    },
                    { replace: true },
                  )
                }
              >
                <TabsList
                  aria-label={toText(text('whatsapp.views.label'))}
                  className='w-full'
                >
                  {VIEWS.map((name) => (
                    <TabsTrigger key={name} value={name}>
                      {text(`whatsapp.views.${name}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <ConversationList view={view} openId={conversationId} />
          </aside>
          <section
            className={`${conversationId ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-1 flex-col`}
          >
            {conversationId ? (
              <Outlet />
            ) : (
              <div className='p-6'>
                <Empty className='min-h-48 border border-dashed'>
                  <EmptyHeader>
                    <EmptyMedia variant='icon'>
                      <MessageCircle />
                    </EmptyMedia>
                    <EmptyTitle>{text('whatsapp.choose')}</EmptyTitle>
                    <EmptyDescription>
                      {text('whatsapp.chooseBody')}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </section>
        </Card>
      </PageContainer>
      {drawerLoaded ? (
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

function ConversationList({
  view,
  openId,
}: {
  view: ConversationView;
  openId?: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const [params] = useSearchParams();
  const key = useConversationsKey(view);
  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) =>
      api<{ data: ConversationRow[]; meta: { total: number } }>(
        `whatsapp/conversations?view=${view}&page=${String(pageParam)}&pageSize=${String(PAGE)}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.length * PAGE < last.meta.total ? pages.length + 1 : undefined,
    refetchInterval: LIST_POLL_MS,
    staleTime: 5000,
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  if (query.error && !query.data)
    return (
      <div className='p-3'>
        <WhatsAppFailure
          error={query.error}
          what='list'
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  if (!query.data)
    return (
      <div
        role='status'
        aria-label={toText(text('loading'))}
        className='flex flex-col gap-1 p-2'
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className='flex flex-col gap-2 rounded-md p-2'>
            <Skeleton className='h-4 w-2/3' />
            <Skeleton className='h-3 w-full' />
          </div>
        ))}
      </div>
    );
  if (!rows.length) return <EmptyView view={view} />;
  const timeOf = (at: string | null): string => {
    if (!at) return '';
    const date = new Date(at);
    const today = new Date();
    return date.toDateString() === today.toDateString()
      ? new Intl.DateTimeFormat(language, {
          hour: '2-digit',
          minute: '2-digit',
        }).format(date)
      : new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(date);
  };
  const search = `?view=${view}${params.get('open') ? `&open=${params.get('open') ?? ''}` : ''}`;
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
      {query.isFetching && !query.isFetchingNextPage ? (
        <span className='sr-only' role='status'>
          {text('loading')}
        </span>
      ) : null}
      <ul className='flex flex-col p-2'>
        {rows.map((row) => {
          const open = row.id === openId;
          return (
            <li key={row.id}>
              <Link
                to={`/crm/whatsapp/${encodeURIComponent(row.id)}${search}`}
                aria-current={open ? 'page' : undefined}
                className={`flex flex-col gap-1 rounded-md p-2 text-sm transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  open ? 'bg-muted' : ''
                }`}
              >
                <span className='flex min-w-0 items-center gap-2'>
                  {row.unreadCount > 0 ? (
                    <span className='size-2 shrink-0 rounded-full bg-primary'>
                      <span className='sr-only'>{text('whatsapp.unread')}</span>
                    </span>
                  ) : null}
                  <span
                    className={`min-w-0 flex-1 truncate ${
                      row.unreadCount > 0 ? 'font-medium' : ''
                    }`}
                    title={row.name}
                  >
                    {row.name}
                  </span>
                  <span className='shrink-0 text-xs text-muted-foreground'>
                    {timeOf(row.lastMessageAt)}
                  </span>
                </span>
                <span className='flex min-w-0 items-center gap-2 text-muted-foreground'>
                  <span className='min-w-0 flex-1'>
                    {row.last ? (
                      <MessageSummary
                        type={row.last.type}
                        text={row.last.text}
                        caption={row.last.caption}
                      />
                    ) : null}
                  </span>
                  {row.unreadCount > 0 ? (
                    <Badge
                      aria-label={toText(
                        text('whatsapp.unreadCount', {
                          count: row.unreadCount,
                        }),
                      )}
                    >
                      {row.unreadCount.toLocaleString(language)}
                    </Badge>
                  ) : null}
                </span>
                {row.state !== 'linked' ? (
                  <span>
                    <Badge variant='outline'>
                      {text(`whatsapp.state.${row.state}`)}
                    </Badge>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {query.hasNextPage ? (
        <div className='flex justify-center p-3'>
          <Button
            variant='outline'
            size='sm'
            disabled={query.isFetchingNextPage}
            onClick={() =>
              void query.fetchNextPage().then((result) => {
                if (result.error)
                  toaster.show({
                    type: 'error',
                    title: toText(text('whatsapp.loadMoreFailed')),
                  });
              })
            }
          >
            {query.isFetchingNextPage ? (
              <Spinner data-icon='inline-start' />
            ) : null}
            {text('whatsapp.loadMore')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// No conversation in the view: what would appear there, and for the All
// view while no number is connected, how to connect one.
function EmptyView({ view }: { view: ConversationView }): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const configured = meta?.whatsapp?.configured === true;
  const title =
    view === 'mine'
      ? 'whatsapp.empty.mineTitle'
      : view === 'unlinked'
        ? 'whatsapp.empty.unlinkedTitle'
        : 'whatsapp.empty.title';
  const body =
    view === 'mine'
      ? 'whatsapp.empty.mineBody'
      : view === 'unlinked'
        ? 'whatsapp.empty.unlinkedBody'
        : configured
          ? 'whatsapp.empty.body'
          : meta?.settingsAccess
            ? 'whatsapp.empty.connect'
            : 'whatsapp.empty.askAdmin';
  return (
    <div className='p-3'>
      <Empty className='min-h-40 border border-dashed p-6 md:p-6'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <MessageCircle />
          </EmptyMedia>
          <EmptyTitle>{text(title)}</EmptyTitle>
          <EmptyDescription>{text(body)}</EmptyDescription>
        </EmptyHeader>
        {view === 'all' && !configured && meta?.settingsAccess ? (
          <EmptyContent>
            <Button
              variant='outline'
              nativeButton={false}
              render={<Link to='/crm/whatsapp/connection' />}
            >
              {text('whatsapp.manageConnection')}
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    </div>
  );
}
