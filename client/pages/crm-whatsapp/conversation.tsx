import { ApiClientError, useToaster } from '@nocobase/app-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontalIcon } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  Link,
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { BackButton } from '#components/back-button';
import { Badge } from '#components/ui/badge';
import { Button } from '#components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#components/ui/dropdown-menu';
import { Spinner } from '#components/ui/spinner';
import {
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
} from '../../components/crm/api.js';
import { RecordLink } from '../../components/crm/common.js';
import {
  CONVERSATION_POLL_MS,
  useConversationKey,
  viewOf,
  type Conversation,
  type CustomerState,
  type WhatsAppMessage,
} from '../../components/crm/whatsapp/api.js';
import {
  MessagesSkeleton,
  WhatsAppMessages,
} from '../../components/crm/whatsapp/messages.js';
import { ConfirmAction } from '../settings/shared.js';
import { WhatsAppFailure } from '../../components/crm/whatsapp/failure.js';

// One conversation beside the list (/crm/whatsapp/:conversationId): the
// customer, what they are linked to, and their messages, newest at the
// bottom, asked again every few seconds. A customer linked to no record is
// linked to a lead or a contact (…/link), made a lead (…/new-lead), set
// aside as not a customer, or marked as spam; after each, focus goes to the
// customer's name, the control that had it being gone (A6). Read only in
// this phase: replies are made on WhatsApp.

export interface ConversationContext {
  conversation: Conversation;
  // The conversation as the server now holds it, after a change.
  settle: (next?: Conversation) => void;
  focusName: () => void;
}

const statusOf = (error: unknown): number | undefined =>
  error instanceof ApiClientError ? error.status : undefined;

export default function ConversationPane(): ReactElement {
  const { conversationId = '' } = useParams();
  const { text } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const scopeKey = useCrmScopeKey();
  const [params] = useSearchParams();
  const view = viewOf(params);
  const listSearch = `?view=${view}`;
  const key = useConversationKey(conversationId);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const query = useQuery({
    queryKey: key,
    queryFn: () =>
      api<{ data: Conversation }>(
        `whatsapp/conversations/${encodeURIComponent(conversationId)}`,
      ).then((r) => r.data),
    refetchInterval: (state) =>
      statusOf(state.state.error) === 404 ? false : CONVERSATION_POLL_MS,
    retry: (count, error) => statusOf(error) !== 404 && count < 2,
  });
  // Earlier pages loaded above the latest one the query keeps current.
  const [earlier, setEarlier] = useState<{
    id: string;
    messages: WhatsAppMessage[];
    more: boolean;
  }>({ id: conversationId, messages: [], more: true });
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const shownEarlier =
    earlier.id === conversationId ? earlier : { messages: [], more: true };
  const refreshLists = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...scopeKey, 'whatsapp/conversations'],
    });
    void queryClient.invalidateQueries({
      queryKey: [...scopeKey, 'whatsapp/unreadCount'],
    });
  }, [queryClient, scopeKey]);
  const focusName = useCallback(() => {
    setTimeout(() => nameRef.current?.focus(), 0);
  }, []);
  const settle = useCallback(
    (next?: Conversation) => {
      if (next) queryClient.setQueryData(key, next);
      else void queryClient.invalidateQueries({ queryKey: key });
      refreshLists();
    },
    [queryClient, key, refreshLists],
  );
  // Read: once the newest message is in view (marked again only when more
  // arrive unread).
  const readingRef = useRef('');
  const unread = query.data?.unreadCount ?? 0;
  const lastId = query.data?.messages.at(-1)?.id ?? '';
  const markRead = useCallback(() => {
    if (!unread || readingRef.current === `${conversationId}:${lastId}`) return;
    readingRef.current = `${conversationId}:${lastId}`;
    void api(
      `whatsapp/conversations/${encodeURIComponent(conversationId)}/read`,
      'POST',
    )
      .then(() => {
        queryClient.setQueryData<Conversation>(key, (current) =>
          current ? { ...current, unreadCount: 0 } : current,
        );
        refreshLists();
      })
      .catch(() => {
        // Tried again at the next open.
        readingRef.current = '';
      });
  }, [api, conversationId, key, lastId, queryClient, refreshLists, unread]);
  // Gone or no longer readable: the list loses it, and focus goes to the
  // list's tabs, the pane's controls being gone (A6).
  const missing = statusOf(query.error) === 404;
  useEffect(() => {
    if (!missing) return;
    refreshLists();
    document
      .querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.focus();
  }, [missing, refreshLists]);
  const gone = () => {
    toaster.show({ type: 'error', title: toText(text('whatsapp.gone')) });
    refreshLists();
    void navigate(`/crm/whatsapp${listSearch}`);
  };
  const [busy, setBusy] = useState<string>();
  const [confirmSpam, setConfirmSpam] = useState(false);
  const setState = async (state: CustomerState): Promise<Conversation> =>
    api<{ data: Conversation }>(
      `whatsapp/conversations/${encodeURIComponent(conversationId)}/link`,
      'POST',
      { state },
    ).then((r) => r.data);
  const quick = (state: 'dismissed' | 'unlinked') => {
    const name = query.data?.contact.name ?? '';
    setBusy(state);
    setState(state)
      .then((next) => {
        settle(next);
        toaster.show({
          type: 'success',
          title: toText(
            text(
              state === 'dismissed'
                ? 'whatsapp.dismissed'
                : 'whatsapp.restored',
              { name },
            ),
          ),
        });
        focusName();
      })
      .catch((error: unknown) => {
        if (statusOf(error) === 404) gone();
        else
          toaster.show({
            type: 'error',
            title: toText(text('whatsapp.updateFailed')),
          });
      })
      .finally(() => setBusy(undefined));
  };
  const loadEarlier = () => {
    const all = [...shownEarlier.messages, ...(query.data?.messages ?? [])];
    const before = all[0]?.occurredAt;
    if (!before) return;
    setLoadingEarlier(true);
    api<{ data: Conversation }>(
      `whatsapp/conversations/${encodeURIComponent(conversationId)}?before=${encodeURIComponent(before)}`,
    )
      .then(({ data }) =>
        setEarlier({
          id: conversationId,
          messages: [...data.messages, ...shownEarlier.messages],
          more: data.more,
        }),
      )
      .catch(() =>
        toaster.show({
          type: 'error',
          title: toText(text('whatsapp.loadEarlierFailed')),
        }),
      )
      .finally(() => setLoadingEarlier(false));
  };
  const back = (
    <div className='px-4 pt-3 md:hidden'>
      <BackButton to={`/crm/whatsapp${listSearch}`} />
    </div>
  );
  if (query.error && !query.data)
    return (
      <div className='flex flex-col gap-3'>
        {back}
        <div className='p-4'>
          <WhatsAppFailure
            error={query.error}
            what='conversation'
            onRetry={() => void query.refetch()}
            back={`/crm/whatsapp${listSearch}`}
          />
        </div>
      </div>
    );
  if (!query.data)
    return (
      <div className='flex flex-col'>
        {back}
        <MessagesSkeleton />
      </div>
    );
  const conversation = query.data;
  const latestIds = new Set(conversation.messages.map((m) => m.id));
  const messages = [
    ...shownEarlier.messages.filter((m) => !latestIds.has(m.id)),
    ...conversation.messages,
  ];
  const more = shownEarlier.messages.length
    ? shownEarlier.more
    : conversation.more;
  const context: ConversationContext = { conversation, settle, focusName };
  return (
    <>
      {back}
      <ConversationHeader
        conversation={conversation}
        nameRef={nameRef}
        busy={busy}
        onDismiss={() => quick('dismissed')}
        onRestore={() => quick('unlinked')}
        onSpam={() => setConfirmSpam(true)}
        search={params.toString() ? `?${params.toString()}` : ''}
      />
      {query.error ? (
        <div className='px-4 pt-3'>
          <WhatsAppFailure
            error={query.error}
            what='conversation'
            onRetry={() => void query.refetch()}
            back={`/crm/whatsapp${listSearch}`}
          />
        </div>
      ) : null}
      <WhatsAppMessages
        key={conversationId}
        className='flex-1'
        messages={messages}
        more={more}
        loadingEarlier={loadingEarlier}
        onLoadEarlier={loadEarlier}
        senderOf={() => conversation.contact.name}
        onSeeLatest={markRead}
      />
      <p className='border-t border-border px-4 py-2 text-xs text-muted-foreground'>
        {text('whatsapp.readOnlyNote')}
      </p>
      <ConfirmAction
        open={confirmSpam}
        onOpenChange={setConfirmSpam}
        destructive
        title={toText(
          text('whatsapp.spamTitle', { name: conversation.contact.name }),
        )}
        description={toText(text('whatsapp.spamBody'))}
        confirmLabel={toText(text('whatsapp.spam'))}
        onConfirm={async () => {
          const next = await setState('spam');
          settle(next);
          toaster.show({
            type: 'success',
            title: toText(
              text('whatsapp.spammed', { name: conversation.contact.name }),
            ),
          });
        }}
        onGone={gone}
        finalFocus={() => nameRef.current}
      />
      <Outlet context={context} />
    </>
  );
}

function ConversationHeader({
  conversation,
  nameRef,
  busy,
  onDismiss,
  onRestore,
  onSpam,
  search,
}: {
  conversation: Conversation;
  nameRef: React.RefObject<HTMLHeadingElement | null>;
  busy?: string;
  onDismiss: () => void;
  onRestore: () => void;
  onSpam: () => void;
  search: string;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const { contact, record } = conversation;
  const state = contact.state;
  const mayCreateLead = Boolean(meta?.permissions.leads?.create);
  const overlay = (path: string) => ({
    pathname: `/crm/whatsapp/${encodeURIComponent(conversation.id)}/${path}`,
    search,
  });
  return (
    <header className='flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3'>
      <div className='flex min-w-0 flex-col gap-1'>
        <h2
          ref={nameRef}
          tabIndex={-1}
          className='truncate text-base font-medium outline-none'
          title={contact.name}
        >
          {contact.name}
        </h2>
        <div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
          {contact.phone ? <span>{contact.phone}</span> : null}
          {state === 'unlinked' ? (
            <Badge variant='outline'>{text('whatsapp.state.unlinked')}</Badge>
          ) : state === 'linked' && record ? (
            <span className='flex min-w-0 items-center gap-1'>
              {text('whatsapp.linkedTo')}
              <RecordLink
                entity={record.entity}
                record={{ id: record.id, name: record.name }}
              />
            </span>
          ) : state === 'dismissed' || state === 'spam' ? (
            <span>{text(`whatsapp.setAside.${state}`)}</span>
          ) : null}
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        {state === 'unlinked' ? (
          <>
            <Button nativeButton={false} render={<Link to={overlay('link')} />}>
              {text('whatsapp.link')}
            </Button>
            {mayCreateLead ? (
              <Button
                variant='outline'
                nativeButton={false}
                render={<Link to={overlay('new-lead')} />}
              >
                {text('whatsapp.newLead')}
              </Button>
            ) : null}
          </>
        ) : state === 'linked' ? (
          <Button
            variant='outline'
            nativeButton={false}
            render={<Link to={overlay('link')} />}
          >
            {text('whatsapp.changeLink')}
          </Button>
        ) : (
          <Button
            variant='outline'
            disabled={busy === 'unlinked'}
            onClick={onRestore}
          >
            {busy === 'unlinked' ? <Spinner data-icon='inline-start' /> : null}
            {text('whatsapp.restore')}
          </Button>
        )}
        {state === 'unlinked' || state === 'linked' ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  disabled={busy === 'dismissed'}
                  aria-label={toText(
                    text('whatsapp.actionsFor', { name: contact.name }),
                  )}
                />
              }
            >
              {busy === 'dismissed' ? <Spinner /> : <MoreHorizontalIcon />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-auto min-w-40'>
              <DropdownMenuItem onClick={onDismiss}>
                {text('whatsapp.dismiss')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant='destructive' onClick={onSpam}>
                {text('whatsapp.spam')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
