import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Command as CommandPrimitive } from 'cmdk';
import {
  Building2,
  ContactRound,
  Handshake,
  ListChecks,
  Radar,
  RotateCw,
  Search,
  Sparkles,
  SquareCheckBig,
  type LucideIcon,
} from 'lucide-react';
import { useState, type KeyboardEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button.js';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../ui/command.js';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog.js';
import { Kbd } from '../ui/kbd.js';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../ui/sidebar.js';
import { Spinner } from '../ui/spinner.js';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.js';
import {
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
  type CrmRecord,
  type Entity,
} from './api.js';
import { useAssistantReadiness } from './assistant-state.js';
import {
  SEARCH_SHORTCUT,
  searchWords,
  useGlobalSearch,
  type GlobalSearch,
  type SearchMode,
} from './global-search-state.js';
import { useDebounced } from './record-search.js';
import { SearchAnswer } from './search-answer.js';
import { SearchRow } from './search-results.js';

// The global search's dialog and its menu entry (global-search.tsx holds
// the state): a command palette over the page, finding records by keyword
// or asking the AI.

// Each kind's menu icon, beside its group of results.
const KIND_ICONS: Record<Entity, LucideIcon> = {
  leads: Radar,
  opportunities: Handshake,
  accounts: Building2,
  contacts: ContactRound,
  tasks: SquareCheckBig,
  approvals: ListChecks,
};

interface SearchGroup {
  entity: Entity;
  total: number;
  rows: CrmRecord[];
  titles: Record<string, string>;
}

export function GlobalSearchDialog(): ReactElement | null {
  const search = useGlobalSearch();
  const { text } = useCrmText();
  if (!search) return null;
  return (
    <>
      {/* Where the dialog is: ⌘K acts only here (global-search.tsx). */}
      <span data-crm-search-host hidden />
      <Dialog open={search.open} onOpenChange={search.setOpen}>
        <DialogContent
          // Told apart from other dialogs by ⌘K (global-search.tsx).
          data-crm-search
          showCloseButton={false}
          // A palette sits high and narrow, its results growing downward.
          className='top-[8svh] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[12svh] sm:max-w-2xl'
        >
          <DialogTitle className='sr-only'>
            {text('globalSearch.dialogTitle')}
          </DialogTitle>
          {search.open && <SearchPanel search={search} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchPanel({ search }: { search: GlobalSearch }): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const readiness = useAssistantReadiness();
  const navigate = useNavigate();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const assistantOn = Boolean(meta?.assistant);
  const aiReady = assistantOn && readiness.state === 'ready';
  const aiReason =
    readiness.state === 'unavailable'
      ? readiness.reason
      : toText(text('assistantLoading'));
  // A mode left on 问 AI while the chat cannot start falls back to search.
  const mode: SearchMode = search.mode === 'ask' && aiReady ? 'ask' : 'search';
  const typed = search.value.trim();
  const q = useDebounced(typed, 200);
  const results = useQuery({
    queryKey: [...scopeKey, 'global-search', q],
    queryFn: () =>
      api<{ data: SearchGroup[] }>(`search?q=${encodeURIComponent(q)}`),
    enabled: mode === 'search' && q.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30000,
    // A refusal (an over-long text) answers the same however often asked.
    retry: false,
  });
  const groups = q && typed ? (results.data?.data ?? []) : [];
  const words = searchWords(q);
  const go = (path: string): void => {
    search.setOpen(false);
    void navigate(path);
  };
  // The selection starts on the first result (or on 问 AI when there is
  // none) and keeps a choice made with the arrows or the mouse only until
  // the results change.
  const firstKey = groups[0]?.rows[0]
    ? `${groups[0].entity}:${toText(groups[0].rows[0].id)}`
    : 'ask';
  const signature = `${q}|${groups.map((g) => `${g.entity}${String(g.total)}`).join()}`;
  const [selected, setSelected] = useState<string>();
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setSelected(undefined);
  }

  const placeholder = toText(
    text(
      mode === 'ask'
        ? 'globalSearch.askPlaceholder'
        : 'globalSearch.placeholder',
    ),
  );
  const onAskKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    // The palette would take Enter otherwise; and Enter while an input
    // method composes only confirms the composition.
    if (event.key !== 'Enter') return;
    event.stopPropagation();
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    search.ask(search.value);
  };

  return (
    <Command
      // cmdk names its input by this label.
      label={placeholder}
      shouldFilter={false}
      loop
      value={selected ?? firstKey}
      onValueChange={setSelected}
      className='rounded-none! bg-popover p-0'
    >
      <div className='flex items-center gap-2 border-b border-border px-3'>
        {mode === 'ask' ? (
          <Sparkles className='size-4 shrink-0 text-ai' />
        ) : results.isFetching ? (
          <Spinner className='size-4 shrink-0 text-muted-foreground' />
        ) : (
          <Search className='size-4 shrink-0 text-muted-foreground' />
        )}
        {mode === 'search' ? (
          <CommandPrimitive.Input
            value={search.value}
            onValueChange={search.setValue}
            placeholder={placeholder}
            aria-label={placeholder}
            // The server takes up to 100 characters.
            maxLength={100}
            className='h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm'
          />
        ) : (
          <input
            // The dialog's one field, focused as the palette opens.
            autoFocus
            value={search.value}
            onChange={(event) => search.setValue(event.target.value)}
            onKeyDown={onAskKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            // The server takes up to 100 characters.
            maxLength={100}
            className='h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm'
          />
        )}
        {assistantOn && !aiReady && (
          // The AI tab is disabled: its reason in a tooltip on the switch,
          // which a disabled tab cannot carry itself; the 问 AI row says it
          // in the open.
          <Tooltip>
            <TooltipTrigger
              render={<span className='shrink-0' tabIndex={0} />}
              aria-label={aiReason}
            >
              <ModeSwitch mode={mode} aiReady={false} onMode={search.setMode} />
            </TooltipTrigger>
            <TooltipContent>{aiReason}</TooltipContent>
          </Tooltip>
        )}
        {assistantOn && aiReady && (
          <ModeSwitch mode={mode} aiReady onMode={search.setMode} />
        )}
      </div>
      {mode === 'search' ? (
        <CommandList
          className={`max-h-[min(60svh,34rem)] p-1 ${
            results.isPlaceholderData ? 'opacity-60' : ''
          }`}
        >
          {!typed ? (
            <div className='flex flex-col gap-1 px-3 py-6 text-center text-sm text-muted-foreground'>
              <p>{text('globalSearch.hint')}</p>
              {aiReady && <p>{text('globalSearch.hintAsk')}</p>}
            </div>
          ) : results.isError ? (
            <div
              role='alert'
              className='flex flex-col items-center gap-2 px-3 py-6 text-sm text-muted-foreground'
            >
              {text('globalSearch.failed')}
              <Button
                variant='outline'
                size='sm'
                onClick={() => void results.refetch()}
              >
                <RotateCw />
                {text('globalSearch.retry')}
              </Button>
            </div>
          ) : !results.data || q !== typed ? (
            !groups.length && (
              <p
                role='status'
                className='flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground'
              >
                <Spinner className='size-3.5' />
                {text('globalSearch.searching')}
              </p>
            )
          ) : (
            !groups.length && (
              <p className='px-3 py-6 text-center text-sm text-muted-foreground'>
                {text('globalSearch.noResults')}
              </p>
            )
          )}
          {groups.map((group) => {
            const Icon = KIND_ICONS[group.entity];
            const list = toText(text(`entities.${group.entity}`));
            return (
              <CommandGroup
                key={group.entity}
                heading={
                  <span className='inline-flex items-center gap-1.5'>
                    <Icon className='size-3.5' />
                    {`${list} · ${String(group.total)}`}
                  </span>
                }
              >
                {group.rows.map((row) => (
                  <CommandItem
                    key={toText(row.id)}
                    value={`${group.entity}:${toText(row.id)}`}
                    onSelect={() =>
                      go(`/crm/${group.entity}/${toText(row.id)}`)
                    }
                  >
                    <SearchRow
                      entity={group.entity}
                      record={row}
                      titles={group.titles}
                      words={words}
                    />
                  </CommandItem>
                ))}
                {group.total > group.rows.length && (
                  <CommandItem
                    value={`${group.entity}:all`}
                    onSelect={() =>
                      go(
                        `/crm/${group.entity}?${new URLSearchParams({ search: q }).toString()}`,
                      )
                    }
                    className='text-muted-foreground'
                  >
                    <span className='pl-6'>
                      {text('globalSearch.showAllIn', {
                        list,
                        count: group.total,
                      })}
                    </span>
                  </CommandItem>
                )}
              </CommandGroup>
            );
          })}
          {assistantOn && typed && (
            <CommandGroup>
              <CommandItem
                value='ask'
                disabled={!aiReady}
                onSelect={() => search.ask(typed)}
              >
                <Sparkles className='text-ai' />
                <span className='truncate'>
                  {text('globalSearch.askAbout', { text: typed })}
                </span>
              </CommandItem>
              {/* Why it cannot be asked, in the open: a disabled row takes no
                  pointer, so a tooltip would never show (I7). */}
              {!aiReady && (
                <p className='px-2 pb-1.5 pl-8 text-xs text-muted-foreground'>
                  {aiReason}
                </p>
              )}
            </CommandGroup>
          )}
        </CommandList>
      ) : (
        <div className='max-h-[min(60svh,34rem)] overflow-y-auto p-3'>
          {search.answer ? (
            <SearchAnswer
              answer={search.answer}
              onClose={() => {
                search.clearAnswer();
                document
                  .querySelector<HTMLInputElement>(
                    '[data-slot="dialog-content"] input',
                  )
                  ?.focus();
              }}
              onFollowUp={search.followUp}
              onRetry={() => search.ask(search.answer?.question ?? '')}
              onOpenConversation={search.openConversation}
              onGo={go}
            />
          ) : (
            <p className='px-1 py-4 text-center text-sm text-muted-foreground'>
              {text('globalSearch.askHint')}
            </p>
          )}
        </div>
      )}
    </Command>
  );
}

// The switch between keyword search and asking the AI.
function ModeSwitch({
  mode,
  aiReady,
  onMode,
}: {
  mode: SearchMode;
  aiReady: boolean;
  onMode: (mode: SearchMode) => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <Tabs
      value={mode}
      onValueChange={(next) => onMode(next as SearchMode)}
      className='shrink-0'
    >
      <TabsList>
        <TabsTrigger value='search' className='px-2.5'>
          <Search className='sm:hidden' />
          <span className='max-sm:sr-only'>
            {text('globalSearch.searchTab')}
          </span>
        </TabsTrigger>
        <TabsTrigger value='ask' disabled={!aiReady} className='px-2.5'>
          <Sparkles className='text-ai sm:hidden' />
          <span className='max-sm:sr-only'>{text('globalSearch.askTab')}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

// The menu's Search, right under the overview (NavigationMenu's `after`):
// a button that opens the dialog, with its shortcut; in the phone's sheet it
// closes the sheet first.
export function SearchNavButton(): ReactElement | null {
  const search = useGlobalSearch();
  const { text } = useCrmText();
  const { isMobile, setOpenMobile, state } = useSidebar();
  if (!search) return null;
  const label = toText(text('globalSearch.label'));
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => {
          if (isMobile) setOpenMobile(false);
          search.setOpen(true);
        }}
        tooltip={{
          children: `${label} · ${SEARCH_SHORTCUT}`,
          role: 'tooltip',
          sideOffset: 8,
        }}
      >
        <Search />
        <span>{label}</span>
        {!isMobile && state === 'expanded' && (
          <Kbd className='ml-auto'>{SEARCH_SHORTCUT}</Kbd>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
