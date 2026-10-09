import { useAI } from '@/extensions/nocobase-ai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToaster } from '@nocobase/app-client';
import { Ellipsis, MessagesSquare, SquarePen, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AutoLoadMore } from '../../components/crm/auto-load.js';
import { ConfirmDialog } from '../../components/crm/confirm-dialog.js';
import {
  toText,
  useCrmText,
  useMetadata,
  useSessionUserId,
} from '../../components/crm/api.js';
import {
  CRM_ASSISTANT,
  deleteThroughPanel,
  requestConversation,
  useActiveConversation,
  useAssistantReadiness,
  useCatalogSignature,
  type ConversationRequest,
} from '../../components/crm/assistant-state.js';

// Application change to the template's sidebar: the user's conversations
// with the assistant, at the bottom of the menu, newest first. A row opens
// its conversation in the assistant panel, "New conversation" a blank one
// (assistant-state.ts carries the request to the panel). The plugin's list
// is read whole, so it pages here, ten rows at a time as the list's end
// scrolls into view. In the collapsed sidebar it is one icon whose popover
// holds the ten newest, as a menu group opens there.

const PAGE = 10;
// The plugin's title for a conversation that has none yet.
const UNTITLED = 'New conversation';

interface Conversation {
  readonly id: string;
  readonly title: string;
  readonly unread: boolean;
}

function useConversations(enabled: boolean) {
  const { listConversations } = useAI();
  const userId = useSessionUserId();
  const queryClient = useQueryClient();
  const signature = useCatalogSignature();
  const query = useQuery({
    queryKey: ['ai', 'conversations', userId],
    queryFn: async (): Promise<Conversation[]> =>
      (await listConversations())
        .filter((item) => item.employeeUsername === CRM_ASSISTANT)
        .map((item) => ({
          id: item.id,
          title: item.title,
          unread: item.unread === true,
        })),
    enabled: enabled && Boolean(userId),
    staleTime: 30_000,
  });
  // The panel's own list changed (a new conversation, a new title, one moved
  // to the top): refresh this copy.
  useEffect(() => {
    if (signature === undefined) return;
    void queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
  }, [signature, queryClient]);
  return query;
}

export function SidebarChats(): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const readiness = useAssistantReadiness();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const active = useActiveConversation();
  const available = meta?.assistant === true && readiness.state === 'ready';
  const { data, isLoading, isError, isFetching, refetch } =
    useConversations(available);
  const groupRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(PAGE);
  // The conversation whose deletion is being confirmed, and how that goes.
  const [removing, setRemoving] = useState<Conversation>();
  const [busy, setBusy] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const { destroyConversation } = useAI();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  if (!available) return null;

  const title = toText(text('chats.title'));
  const newLabel = toText(text('chats.new'));
  const conversations = data ?? [];
  // On a phone the sheet closes first, so its focus return does not pull
  // focus back from the panel opening over the page.
  const open = (target: ConversationRequest): void => {
    if (isMobile) setOpenMobile(false);
    requestConversation(target);
  };
  const label = (item: Conversation): string =>
    !item.title || item.title === UNTITLED
      ? toText(text('chats.untitled'))
      : item.title;

  // Deleted through the panel's chat while it is mounted (so the
  // conversation on screen and its list follow), through the plugin
  // otherwise; the dialog stays open on a failure and says so.
  const remove = async (item: Conversation): Promise<void> => {
    setBusy(true);
    setDeleteFailed(false);
    try {
      await (deleteThroughPanel(item.id) ?? destroyConversation(item.id));
      setRemoving(undefined);
      // The deleted row's menu button is gone: focus goes to the heading's
      // "New conversation" rather than falling to the page.
      requestAnimationFrame(() =>
        groupRef.current
          ?.querySelector<HTMLElement>('[data-sidebar=group-action]')
          ?.focus(),
      );
      toaster.show({
        type: 'success',
        title: toText(text('chats.deleted', { title: label(item) })),
      });
      void queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    } catch {
      setDeleteFailed(true);
    } finally {
      setBusy(false);
    }
  };

  // The popover of the collapsed sidebar lists rows without their menu.
  const rows = (
    items: readonly Conversation[],
    withActions = true,
  ): ReactElement => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            isActive={item.id === active}
            aria-current={item.id === active ? 'true' : undefined}
            title={label(item)}
            onClick={() => open(item.id)}
          >
            <span className='truncate'>{label(item)}</span>
            {item.unread && (
              <>
                <span
                  aria-hidden
                  className='ml-auto size-1.5 shrink-0 rounded-full bg-destructive'
                />
                <span className='sr-only'>{` · ${toText(text('chats.unread'))}`}</span>
              </>
            )}
          </SidebarMenuButton>
          {withActions && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuAction
                    showOnHover
                    aria-label={toText(
                      text('chats.actions', { title: label(item) }),
                    )}
                  />
                }
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              {/* As wide as its items: the trigger is a small icon. */}
              <DropdownMenuContent
                side='right'
                align='start'
                className='w-auto min-w-40'
              >
                <DropdownMenuItem
                  variant='destructive'
                  onClick={() => {
                    setDeleteFailed(false);
                    setRemoving(item);
                  }}
                >
                  <Trash2 />
                  {toText(text('chats.delete'))}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
  const failed = (
    <Alert variant='destructive' className='px-2 py-1.5'>
      <AlertDescription className='flex items-center justify-between gap-2 text-xs'>
        {toText(text('chats.failed'))}
        <Button
          size='xs'
          variant='ghost'
          className='shrink-0'
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {toText(text(isFetching ? 'chats.loading' : 'chats.retry'))}
        </Button>
      </AlertDescription>
    </Alert>
  );
  const empty = (
    <p className='px-2 py-1 text-xs text-muted-foreground'>
      {toText(text('chats.empty'))}
    </p>
  );

  if (state === 'collapsed' && !isMobile)
    return (
      <ChatsPopover title={title} newLabel={newLabel} onNew={() => open('new')}>
        {isLoading ? (
          <p className='px-2 py-1 text-xs text-muted-foreground'>
            {toText(text('chats.loading'))}
          </p>
        ) : isError ? (
          failed
        ) : conversations.length ? (
          rows(conversations.slice(0, PAGE), false)
        ) : (
          empty
        )}
      </ChatsPopover>
    );

  return (
    <SidebarGroup ref={groupRef} role='group' aria-label={title}>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarGroupAction
              aria-label={newLabel}
              onClick={() => open('new')}
            />
          }
        >
          <SquarePen />
        </TooltipTrigger>
        <TooltipContent side='right'>{newLabel}</TooltipContent>
      </Tooltip>
      <SidebarGroupContent>
        {isLoading ? (
          <SidebarMenu aria-label={toText(text('chats.loading'))}>
            {[0, 1, 2].map((index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuSkeleton />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        ) : isError ? (
          failed
        ) : conversations.length ? (
          <>
            {rows(conversations.slice(0, shown))}
            <AutoLoadMore
              hasMore={shown < conversations.length}
              loading={false}
              onLoad={() => setShown((count) => count + PAGE)}
            />
          </>
        ) : (
          empty
        )}
      </SidebarGroupContent>
      {removing && (
        <ConfirmDialog
          title={toText(text('chats.deleteTitle', { title: label(removing) }))}
          description={
            <>
              {toText(text('chats.deleteHint'))}
              {deleteFailed && (
                <span className='mt-2 block text-destructive'>
                  {toText(text('chats.deleteFailed'))}
                </span>
              )}
            </>
          }
          busy={busy}
          confirmLabel={toText(text('chats.delete'))}
          busyLabel={toText(text('chats.deleting'))}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() => void remove(removing)}
        />
      )}
    </SidebarGroup>
  );
}

// The collapsed sidebar's entry: an icon whose popover, on hover or keyboard
// focus, holds "New conversation" and the newest conversations, as
// NavigationPopover in navigation-menu.tsx opens a menu group.
function ChatsPopover({
  title,
  newLabel,
  onNew,
  children,
}: {
  readonly title: string;
  readonly newLabel: string;
  readonly onNew: () => void;
  readonly children: ReactElement;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const restoringFocusRef = useRef(false);
  const close = (): void => setOpen(false);
  return (
    <SidebarGroup role='group' aria-label={title}>
      <SidebarMenu>
        <SidebarMenuItem>
          <Popover open={open} onOpenChange={setOpen}>
            <SidebarMenuButton
              className='data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground'
              render={
                <PopoverTrigger
                  openOnHover
                  delay={0}
                  closeDelay={0}
                  onFocus={(event) => {
                    if (restoringFocusRef.current) {
                      restoringFocusRef.current = false;
                      return;
                    }
                    if (event.currentTarget.matches(':focus-visible'))
                      setOpen(true);
                  }}
                  render={<button type='button' />}
                />
              }
              aria-label={title}
            >
              <MessagesSquare />
            </SidebarMenuButton>
            <PopoverContent
              side='right'
              align='start'
              sideOffset={8}
              initialFocus={false}
              finalFocus={(interaction) => {
                restoringFocusRef.current = interaction === 'keyboard';
                return interaction === 'keyboard';
              }}
              className='max-h-(--available-height) w-max max-w-sm min-w-48 gap-0.5 overflow-y-auto border border-sidebar-border bg-sidebar p-1.5 text-sidebar-foreground shadow-lg'
            >
              <PopoverTitle className='px-2 pt-1 pb-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground'>
                {title}
              </PopoverTitle>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      close();
                      onNew();
                    }}
                  >
                    <SquarePen />
                    <span>{newLabel}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              {/* Choosing a conversation closes the popover before it opens
                  the panel; Retry keeps it open to show what came of it. */}
              <div
                onClickCapture={(event) => {
                  if (
                    (event.target as HTMLElement).closest(
                      '[data-sidebar=menu-button]',
                    )
                  )
                    close();
                }}
              >
                {children}
              </div>
            </PopoverContent>
          </Popover>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
