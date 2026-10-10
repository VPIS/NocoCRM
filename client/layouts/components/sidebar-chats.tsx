import {
  useChatPanel,
  useConversationActions,
  useConversationList,
} from '@nocobase/app-plugin-agents/client/chat';
import { Archive, Ellipsis, MessagesSquare, SquarePen } from 'lucide-react';
import { useRef, useState, type ReactElement } from 'react';
import { Alert, AlertDescription } from '#components/ui/alert';
import { Button } from '#components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '#components/ui/popover';
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
} from '#components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components/ui/tooltip';
import { AutoLoadMore } from '../../components/crm/auto-load.js';
import { toText, useCrmText } from '../../components/crm/api.js';
import { useAgentReadiness } from '../../components/crm/agent-chat/ask.js';

// Application change to the template's sidebar: the user's conversations
// with the assistant (the Agents plugin's conversations, migration step 3), at the
// bottom of the menu, newest first. A row opens its conversation in the
// assistant panel, "New conversation" a blank one. The plugin's list pages
// as the list's end scrolls into view. A row's menu archives it (the plugin
// keeps conversations and offers no delete; its toast undoes it). In the
// collapsed sidebar it is one icon whose popover holds the ten newest, as a
// menu group opens there.

const PAGE = 10;

interface Conversation {
  readonly id: string;
  readonly title: string | null;
  readonly unread: boolean;
}

export function SidebarChats(): ReactElement | null {
  const { text } = useCrmText();
  const readiness = useAgentReadiness();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const panel = useChatPanel();
  const actions = useConversationActions();
  const list = useConversationList({ pageSize: PAGE });
  const groupRef = useRef<HTMLDivElement>(null);
  if (readiness.state !== 'ready') return null;

  const { isLoading, isError, isFetching, refetch } = list;
  const active = panel.open ? panel.conversationId : null;
  const title = toText(text('chats.title'));
  const newLabel = toText(text('chats.new'));
  const conversations: Conversation[] = (list.data?.pages ?? []).flatMap(
    (page) =>
      page.items.map((item) => ({
        id: item.id,
        title: item.title,
        unread: !item.read,
      })),
  );
  // On a phone the sheet closes first, so its focus return does not pull
  // focus back from the panel opening over the page.
  const open = (id: string | null): void => {
    if (isMobile) setOpenMobile(false);
    panel.openChat({ conversationId: id, view: 'chat' });
  };
  const label = (item: Conversation): string =>
    item.title || toText(text('chats.untitled'));
  const archive = (item: Conversation): void => {
    actions.archive.mutate(
      { id: item.id, archived: true },
      {
        onSuccess: () => {
          // The archived row's menu button is gone: focus goes to the
          // heading's "New conversation" rather than falling to the page.
          requestAnimationFrame(() =>
            groupRef.current
              ?.querySelector<HTMLElement>('[data-sidebar=group-action]')
              ?.focus(),
          );
          if (panel.conversationId === item.id) panel.selectConversation(null);
        },
      },
    );
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
                <DropdownMenuItem onClick={() => archive(item)}>
                  <Archive />
                  {toText(text('chats.archive'))}
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
      <ChatsPopover title={title} newLabel={newLabel} onNew={() => open(null)}>
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
              onClick={() => open(null)}
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
            {rows(conversations)}
            <AutoLoadMore
              hasMore={Boolean(list.hasNextPage)}
              loading={list.isFetchingNextPage}
              onLoad={() => void list.fetchNextPage()}
            />
          </>
        ) : (
          empty
        )}
      </SidebarGroupContent>
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
