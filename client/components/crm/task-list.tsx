import { AiStateTag } from './ai-state-tag.js';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Ban,
  Building2,
  Clock,
  Handshake,
  Radar,
  User,
  Users,
} from 'lucide-react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Checkbox } from '../ui/checkbox.js';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs.js';
import {
  dueText,
  editsAll,
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
  type ListData,
} from './api.js';
import { AutoLoadMore } from './auto-load.js';
import { ErrorNotice, RecordLink } from './common.js';
import { RecordOutcomeDialog } from './outcome.js';
import { DEFAULT_TIME_ZONE } from '../../../server/providers/crm/zone-time.js';

// The task list as a to-do list rather than a table: a box to tick, the
// task, and what it concerns, when it is and whose it is. Open tasks,
// soonest first and untimed last, and what is done or cancelled, latest
// first, are a tab each, the tabs left of the view switch (TaskTabs).
// With a status picked in the filters, only that status is listed, without
// tabs.

const PAGE_SIZE = 50;

type TaskPages = ReturnType<typeof useTaskPages>;

function useTaskPages(
  params: URLSearchParams,
  set: Record<string, string>,
  enabled = true,
): {
  rows: CrmRecord[];
  titles: Record<string, string>;
  // Each task whose AI preparation is being written or waits, for the
  // people doing it.
  ai: Record<string, 'running' | 'pending'>;
  total: number;
  loading: boolean;
  more: (() => void) | undefined;
  fetchingMore: boolean;
} {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const base = new URLSearchParams(params);
  for (const key of ['page', 'pageSize', 'status', 'orderBy']) base.delete(key);
  for (const [key, value] of Object.entries(set)) base.set(key, value);
  base.set('pageSize', String(PAGE_SIZE));
  const query = useInfiniteQuery({
    queryKey: [...scopeKey, 'tasks/list', base.toString()],
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams(base);
      p.set('page', String(pageParam));
      return api<ListData>(`tasks?${p.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page * last.meta.pageSize < last.meta.total
        ? last.meta.page + 1
        : undefined,
    enabled,
  });
  const pages = query.data?.pages ?? [];
  return {
    rows: pages.flatMap((p) => p.data),
    titles: pages.reduce<Record<string, string>>(
      (all, p) => ({ ...all, ...p.meta.titles }),
      {},
    ),
    ai: pages.reduce<Record<string, 'running' | 'pending'>>(
      (all, p) => ({ ...all, ...p.meta.ai }),
      {},
    ),
    total: pages[0]?.meta.total ?? 0,
    loading: query.isLoading,
    more: query.hasNextPage ? () => void query.fetchNextPage() : undefined,
    fetchingMore: query.isFetchingNextPage,
  };
}

// The open tasks and, unless a status is picked, the completed and
// cancelled ones.
function useTaskSets(
  params: URLSearchParams,
  status: string,
): { open: TaskPages; done: TaskPages } {
  const open = useTaskPages(params, {
    status: status || 'open',
    orderBy: (status || 'open') === 'open' ? 'dueAt' : '-updatedAt',
  });
  const done = useTaskPages(
    params,
    { excludeStatus: 'open', orderBy: '-updatedAt' },
    !status,
  );
  return { open, done };
}

export type TaskTab = 'open' | 'done';

// What is to do and what is done or cancelled, a tab each, left of the
// list's view switch.
export function TaskTabs({
  value,
  onChange,
}: {
  value: TaskTab;
  onChange: (tab: TaskTab) => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as TaskTab)}>
      <TabsList>
        <TabsTrigger value='open'>{text('taskList.open')}</TabsTrigger>
        <TabsTrigger value='done'>{text('taskList.done')}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export function TaskList({
  params,
  status,
  tab,
  empty,
}: {
  // The list's filters (search, owner, scope); status and paging are the
  // list's own.
  params: URLSearchParams;
  // A status picked in the filters, or '' for the tab's tasks.
  status: string;
  tab: TaskTab;
  empty: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  const { open, done } = useTaskSets(params, status);
  if (open.loading || (!status && done.loading)) return <></>;
  if (!open.total && (status || !done.total)) return <>{empty}</>;
  const shown = status || tab === 'open' ? open : done;
  return (
    <TaskRows
      pages={shown}
      emptyText={text(
        shown === open ? 'taskList.nothingOpen' : 'taskList.nothingDone',
      )}
    />
  );
}

function TaskRows({
  pages,
  emptyText,
}: {
  pages: TaskPages;
  emptyText?: string;
}): ReactElement {
  return (
    <TaskCards
      rows={pages.rows}
      titles={pages.titles}
      ai={pages.ai}
      hasMore={Boolean(pages.more)}
      loading={pages.fetchingMore}
      onLoad={() => pages.more?.()}
      emptyText={emptyText}
    />
  );
}

// Tasks as the task list draws them, for the list and a record's Tasks tab:
// a card of rows, the next page loading as its end scrolls into view. On a
// record's tab, the record itself is not named on each row.
export function TaskCards({
  rows,
  titles,
  hasMore,
  loading,
  onLoad,
  emptyText,
  recordId,
  ai = {},
}: {
  rows: CrmRecord[];
  titles: Record<string, string>;
  hasMore: boolean;
  loading: boolean;
  onLoad: () => void;
  emptyText?: ReactNode;
  // The record whose tab this is.
  recordId?: string;
  // The AI's preparation of each task, at work or waiting (the task list's).
  ai?: Record<string, 'running' | 'pending'>;
}): ReactElement {
  const { text } = useCrmText();
  // The open ones first, as they came (soonest first); then, under their
  // heading, the completed and cancelled ones, the latest closed first.
  const open = rows.filter((task) => toText(task.status) === 'open');
  const closed = rows
    .filter((task) => toText(task.status) !== 'open')
    .sort(
      (a, b) =>
        new Date(toText(b.updatedAt ?? b.dueAt ?? '')).getTime() -
        new Date(toText(a.updatedAt ?? a.dueAt ?? '')).getTime(),
    );
  const card = (list: CrmRecord[]): ReactElement => (
    <div className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs'>
      {list.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          titles={titles}
          recordId={recordId}
          aiState={ai[toText(task.id)]}
        />
      ))}
    </div>
  );
  return rows.length ? (
    // Rows lay their particulars beside the title once the card is wide
    // enough, whatever the page beside it takes.
    <div className='@container grid gap-3'>
      {open.length ? card(open) : null}
      {closed.length ? (
        <>
          {open.length ? (
            <p className='pt-1 text-xs font-medium text-muted-foreground'>
              {text('taskList.done')}
            </p>
          ) : null}
          {card(closed)}
        </>
      ) : null}
      <AutoLoadMore hasMore={hasMore} loading={loading} onLoad={onLoad} />
    </div>
  ) : (
    <p className='rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground'>
      {emptyText}
    </p>
  );
}

function TaskRow({
  task,
  titles,
  recordId,
  aiState,
}: {
  task: CrmRecord;
  titles: Record<string, string>;
  recordId?: string;
  aiState?: 'running' | 'pending';
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  // When the row was drawn: what counts as overdue.
  const [now] = useState(() => Date.now());
  const timeZone = meta?.settings.timeZone ?? DEFAULT_TIME_ZONE;
  const status = toText(task.status);
  const finished = status !== 'open';
  // Ticked by whoever may edit it: their own, or everyone's with the right.
  const editable =
    Boolean(meta?.permissions.tasks?.update) &&
    (editsAll(meta, 'tasks') || task.ownerId === meta?.userId);
  const overdue =
    !finished && Boolean(task.dueAt) && +new Date(toText(task.dueAt)) < now;
  const linkedId = toText(
    task.opportunityId || task.leadId || task.companyId || '',
  );
  const linkedEntity = task.opportunityId
    ? 'opportunities'
    : task.leadId
      ? 'leads'
      : 'companies';
  const LinkedIcon = task.opportunityId
    ? Handshake
    : task.leadId
      ? Radar
      : Building2;
  const participants = Array.isArray(task.internalParticipants)
    ? task.internalParticipants.length
    : 0;
  const owner = meta?.users.find((u) => u.id === task.ownerId)?.name;
  // Ticking opens the dialog that completes it with what came of it, as the
  // task page's Complete does (and has the AI follow its record up);
  // unticking opens it again at once.
  const [recording, setRecording] = useState(false);
  const toggle = async (): Promise<void> => {
    if (!finished) {
      setRecording(true);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await api(`tasks/${toText(task.id)}`, 'PATCH', {
        status: 'open',
      });
      await refresh();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className='px-4 py-3'>
      <div className='flex items-start gap-3'>
        <span className='flex h-5 shrink-0 items-center'>
          {status === 'cancelled' ? (
            // A cancelled task is not ticked off; it is set aside.
            <span
              className='flex size-4 items-center justify-center text-destructive/70'
              title={text('options.cancelled', { defaultValue: 'cancelled' })}
            >
              <Ban className='size-3.5' />
            </span>
          ) : (
            // Coloured as the statuses are: done in the success colour, the
            // box to tick a shade firmer, turning green on hover. Sized in
            // whole pixels: the compact scale's 14.4px put its 1px border on
            // half pixels, drawn thicker on some sides than others.
            <Checkbox
              className='size-[14px] border-muted-foreground/40 hover:border-success data-checked:border-success data-checked:bg-success data-checked:text-background'
              checked={status === 'completed'}
              disabled={!editable || busy}
              aria-label={toText(
                text(finished ? 'taskList.reopen' : 'taskList.complete'),
              )}
              onCheckedChange={() => void toggle()}
            />
          )}
        </span>
        {/* One line from 32rem (the title cut short, whole on hover, its
            particulars at the right), as a record's Tasks tab is wide;
            narrower, the particulars go under the title. */}
        <div className='flex min-w-0 flex-1 flex-col gap-1 @lg:flex-row @lg:items-center @lg:gap-4'>
          <span
            className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${finished ? 'text-muted-foreground line-through' : ''}`}
          >
            <span className='min-w-0'>
              <RecordLink
                entity='tasks'
                record={{ id: toText(task.id), name: toText(task.name) }}
              />
            </span>
            {/* The AI preparing it, or its preparation waiting, as a
                lead's row shows its follow-up. */}
            <AiStateTag state={aiState} work='prep' className='shrink-0' />
          </span>
          <span className='flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground'>
            {linkedId && linkedId !== recordId && titles[linkedId] && (
              <span className='inline-flex max-w-56 min-w-0 items-center gap-1'>
                <LinkedIcon className='size-3.5 shrink-0' />
                <RecordLink
                  entity={linkedEntity}
                  record={{ id: linkedId, name: titles[linkedId] }}
                />
              </span>
            )}
            {Boolean(task.dueAt) && (
              <span
                className={`inline-flex items-center gap-1 tabular-nums ${overdue ? 'text-destructive' : ''}`}
              >
                <Clock className='size-3.5 shrink-0' />
                {dueText(task, timeZone)}
              </span>
            )}
            {owner && (
              <span className='inline-flex items-center gap-1'>
                <User className='size-3.5 shrink-0' />
                {owner}
              </span>
            )}
            {participants > 0 && (
              <span
                className='inline-flex items-center gap-1 tabular-nums'
                title={toText(text('fields.internalParticipants'))}
              >
                <Users className='size-3.5 shrink-0' />
                {participants}
              </span>
            )}
          </span>
        </div>
      </div>
      {Boolean(error) && (
        <div className='mt-2'>
          <ErrorNotice error={error} />
        </div>
      )}
      {recording && (
        <RecordOutcomeDialog task={task} onClose={() => setRecording(false)} />
      )}
    </div>
  );
}
