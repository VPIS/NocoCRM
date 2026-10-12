import { RecordDrawerContext } from './record-drawer.js';
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
import { Fragment, useState, type ReactElement, type ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table.js';
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
  type Entity,
  type ListData,
} from './api.js';
import { AutoLoadMore } from './auto-load.js';
import { ErrorNotice, RecordLink } from './common.js';
import { RecordOutcomeDialog } from './outcome.js';
import { DEFAULT_TIME_ZONE } from '../../../server/providers/crm/zone-time.js';

// The task list: on its page a table as the other list pages have
// (TaskTable), on a record's Tasks tab a card of rows (TaskCards); either
// way a box to tick, the task, and what it concerns, when it is and whose
// it is. Open tasks, soonest first and untimed last, and what is done or
// cancelled, latest first, are a tab each, the tabs left of the view switch
// (TaskTabs). With a status picked in the filters, only that status is
// listed, without tabs.

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
    <TaskTable
      pages={shown}
      // What is to do by when it is due; a status picked, or what is
      // closed, as one table.
      grouped={!status && tab === 'open'}
      emptyText={text(
        shown === open ? 'taskList.nothingOpen' : 'taskList.nothingDone',
      )}
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
  const state = useTaskRow(task);
  const {
    timeZone,
    finished,
    overdue,
    linked,
    participants,
    owner,
    error,
    recording,
    setRecording,
  } = state;
  const linkedId = linked?.id ?? '';
  const linkedEntity = linked?.entity ?? 'companies';
  const LinkedIcon = linked?.Icon ?? Building2;
  return (
    <div className='px-4 py-3'>
      <div className='flex items-start gap-3'>
        <span className='flex h-5 shrink-0 items-center'>
          <TaskCheck state={state} />
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

// What a task's row, in the list's cards or its table, shows and does.
function useTaskRow(task: CrmRecord) {
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
  const linked = linkedId
    ? {
        id: linkedId,
        entity: (task.opportunityId
          ? 'opportunities'
          : task.leadId
            ? 'leads'
            : 'companies') as Entity,
        Icon: task.opportunityId ? Handshake : task.leadId ? Radar : Building2,
      }
    : undefined;
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
  return {
    text,
    timeZone,
    status,
    finished,
    editable,
    overdue,
    linked,
    participants,
    owner,
    busy,
    error,
    recording,
    setRecording,
    toggle,
  };
}

// The box that ticks a task off, or the mark of a cancelled one.
function TaskCheck({
  state,
}: {
  state: ReturnType<typeof useTaskRow>;
}): ReactElement {
  const { text, status, finished, editable, busy, toggle } = state;
  return status === 'cancelled' ? (
    // A cancelled task is not ticked off; it is set aside.
    <span
      className='flex size-4 items-center justify-center text-destructive/70'
      title={text('options.cancelled', { defaultValue: 'cancelled' })}
    >
      <Ban className='size-3.5' />
    </span>
  ) : (
    // Coloured as the statuses are: done in the success colour, the box to
    // tick a shade firmer, turning green on hover. Sized in whole pixels:
    // the compact scale's 14.4px put its 1px border on half pixels, drawn
    // thicker on some sides than others.
    <Checkbox
      className='size-[14px] border-muted-foreground/40 hover:border-success data-checked:border-success data-checked:bg-success data-checked:text-background'
      checked={status === 'completed'}
      disabled={!editable || busy}
      aria-label={toText(
        text(finished ? 'taskList.reopen' : 'taskList.complete'),
      )}
      onCheckedChange={() => void toggle()}
    />
  );
}

// The task list's page draws its tasks as the other list pages draw their
// records: a table on the card, under the same quiet header, its columns
// aligned (title, the record it concerns, when, whose, who takes part).
// The tasks to do are grouped by when they are due, in the business time
// zone: overdue, today, tomorrow, later this week, later, and untimed;
// those closed, or one status picked in the filters, are one table.
type DueGroup =
  'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'noTime';

function dueGroups(
  rows: readonly CrmRecord[],
  timeZone: string,
): { group: DueGroup; rows: CrmRecord[] }[] {
  const day = (value: Date): number => {
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
    return Date.parse(`${key}T00:00:00Z`) / 86400000;
  };
  const now = new Date();
  const today = day(now);
  // Days left in this week, Monday its first.
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(now);
  const left =
    6 - ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday);
  const groups = new Map<DueGroup, CrmRecord[]>();
  for (const task of rows) {
    const due = task.dueAt ? new Date(toText(task.dueAt)) : undefined;
    const group: DueGroup = !due
      ? 'noTime'
      : due.getTime() < now.getTime()
        ? 'overdue'
        : day(due) === today
          ? 'today'
          : day(due) === today + 1
            ? 'tomorrow'
            : day(due) <= today + left
              ? 'thisWeek'
              : 'later';
    groups.set(group, [...(groups.get(group) ?? []), task]);
  }
  return (
    ['overdue', 'today', 'tomorrow', 'thisWeek', 'later', 'noTime'] as const
  )
    .filter((group) => groups.has(group))
    .map((group) => ({ group, rows: groups.get(group) ?? [] }));
}

const HEAD =
  'h-11 px-3 py-2.5 text-sm font-medium text-muted-foreground first:pl-4 last:pr-4';
const CELL = 'h-11 truncate px-3 py-2.5 first:pl-4 last:pr-4';

function TaskTable({
  pages,
  emptyText,
  grouped,
}: {
  pages: TaskPages;
  emptyText: string;
  grouped: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const timeZone = meta?.settings.timeZone ?? DEFAULT_TIME_ZONE;
  if (!pages.rows.length)
    return (
      <p className='rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground'>
        {emptyText}
      </p>
    );
  const sections = grouped
    ? dueGroups(pages.rows, timeZone)
    : [{ group: undefined, rows: pages.rows }];
  return (
    <div className='grid gap-3'>
      <div className='overflow-hidden rounded-xl border border-border bg-card shadow-xs'>
        <Table className='min-w-[48rem] table-fixed'>
          <TableHeader className='bg-sidebar/60'>
            <TableRow className='border-border hover:bg-transparent'>
              <TableHead className={HEAD}>{text('fields.taskName')}</TableHead>
              <TableHead className={`${HEAD} w-64`}>
                {text('taskList.record')}
              </TableHead>
              <TableHead className={`${HEAD} w-36`}>
                {text('fields.dueAt')}
              </TableHead>
              <TableHead className={`${HEAD} w-36`}>
                {text('fields.ownerId')}
              </TableHead>
              <TableHead className={`${HEAD} w-24`}>
                {text('fields.internalParticipants')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map(({ group, rows }) => (
              <Fragment key={group ?? 'all'}>
                {group ? (
                  <TableRow className='border-border hover:bg-transparent'>
                    <TableCell
                      colSpan={5}
                      className={`h-9 px-4 pt-3 pb-1.5 text-xs font-medium ${
                        group === 'overdue'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {text(`taskList.groups.${group}`)}
                      <span className='ml-1.5 tabular-nums'>{rows.length}</span>
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.map((task) => (
                  <TaskTableRow
                    key={task.id}
                    task={task}
                    titles={pages.titles}
                    aiState={pages.ai[toText(task.id)]}
                  />
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <AutoLoadMore
        hasMore={Boolean(pages.more)}
        loading={pages.fetchingMore}
        onLoad={() => pages.more?.()}
      />
    </div>
  );
}

function TaskTableRow({
  task,
  titles,
  aiState,
}: {
  task: CrmRecord;
  titles: Record<string, string>;
  aiState?: 'running' | 'pending';
}): ReactElement {
  const state = useTaskRow(task);
  const {
    text,
    timeZone,
    finished,
    overdue,
    linked,
    participants,
    owner,
    error,
    recording,
    setRecording,
  } = state;
  const full = linked ? titles[linked.id] : undefined;
  // A deal by its own name, its company being in its title too ("Company /
  // Deal"); the whole title on hover.
  const shown =
    full && linked?.entity === 'opportunities'
      ? (full.split(' / ').at(-1) ?? full)
      : full;
  return (
    <TableRow className='border-border'>
      <TableCell className={CELL}>
        <span className='flex min-w-0 items-center gap-3'>
          <span className='flex shrink-0 items-center'>
            <TaskCheck state={state} />
          </span>
          <span
            className={`flex min-w-0 items-center gap-2 ${finished ? 'text-muted-foreground line-through' : ''}`}
          >
            {/* Its own page, outside the drawer its records open in. */}
            <RecordDrawerContext.Provider value={undefined}>
              <RecordLink
                entity='tasks'
                record={{ id: toText(task.id), name: toText(task.name) }}
              />
            </RecordDrawerContext.Provider>
            <AiStateTag state={aiState} work='prep' className='shrink-0' />
          </span>
        </span>
        {Boolean(error) && (
          <div className='mt-2 whitespace-normal'>
            <ErrorNotice error={error} />
          </div>
        )}
        {recording && (
          <RecordOutcomeDialog
            task={task}
            onClose={() => setRecording(false)}
          />
        )}
      </TableCell>
      <TableCell className={`${CELL} text-muted-foreground`}>
        {linked && shown ? (
          <span className='flex min-w-0 items-center gap-1.5' title={full}>
            <linked.Icon className='size-3.5 shrink-0' />
            <RecordLink
              entity={linked.entity}
              record={{ id: linked.id, name: shown }}
            />
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell
        className={`${CELL} tabular-nums ${overdue ? 'text-destructive' : ''}`}
      >
        {task.dueAt ? dueText(task, timeZone) : '—'}
      </TableCell>
      <TableCell className={CELL}>{owner ?? '—'}</TableCell>
      <TableCell
        className={`${CELL} tabular-nums text-muted-foreground`}
        title={toText(text('fields.internalParticipants'))}
      >
        {participants > 0 ? (
          <span className='inline-flex items-center gap-1'>
            <Users className='size-3.5 shrink-0' />
            {participants}
          </span>
        ) : (
          '—'
        )}
      </TableCell>
    </TableRow>
  );
}
