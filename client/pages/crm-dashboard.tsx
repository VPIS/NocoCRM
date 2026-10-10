import { AssistantAskBox } from '../components/crm/assistant-ask-box.js';
import { AutoLoadMore } from '../components/crm/auto-load.js';
import { dueText, toText } from '../components/crm/api.js';
import {
  Suspense,
  lazy,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  RecordDrawerContext,
  useRecordDrawerState,
} from '../components/crm/record-drawer.js';
import { Link, useNavigate } from 'react-router';
import {
  AlarmClock,
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  Clock,
  PauseCircle,
  type LucideIcon,
  User,
  ShieldCheck,
  FilePen,
  TimerOff,
  Hourglass,
  PhoneOff,
  UserX,
  ListChecks,
  SquareCheckBig,
} from 'lucide-react';
import { Button } from '../components/ui/button.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { KindTag } from '../components/crm/kind-tag.js';
import {
  CrmFrame,
  Loading,
  ErrorNotice,
  RecordLink,
} from '../components/crm/common.js';
import {
  useCrmQuery,
  useCrmApi,
  useCrmText,
  useMetadata,
  useSessionUser,
  localDate,
  type Data,
  type CrmRecord,
  type Entity,
  type Titled,
} from '../components/crm/api.js';

// A page of a dashboard list (`dashboard/:list`), in the shape the
// workspace's routes still answer under /api/crm.
type AgendaPage = Titled & {
  data: CrmRecord[];
  total: number;
  page: number;
  pageSize: number;
};

// The six risk cards: which list page they open, the metric key that page
// filters by, and the icon. The number itself comes from the same rule the
// list page's card uses, so the two always agree.
const attentionCards: {
  key: string;
  entity: Entity;
  metric: string;
  icon: LucideIcon;
  days?: 'leadStaleDays' | 'staleDays' | 'closeReminderDays';
  // The card's own title where it is not the metric's name.
  title?: string;
}[] = [
  // Titled plainly "New leads": its note says they are the ones nobody has
  // contacted yet.
  {
    key: 'uncontacted',
    entity: 'leads',
    metric: 'uncontacted',
    icon: Clock,
    title: 'uncontactedCard',
  },
  {
    key: 'staleLeads',
    entity: 'leads',
    metric: 'stale',
    icon: PauseCircle,
    days: 'leadStaleDays',
  },
  {
    key: 'staleCompanies',
    entity: 'companies',
    metric: 'stale',
    icon: Hourglass,
    days: 'staleDays',
  },
  {
    key: 'staleOpportunities',
    entity: 'opportunities',
    metric: 'stale',
    icon: TimerOff,
    days: 'leadStaleDays',
  },
  {
    key: 'closingSoon',
    entity: 'opportunities',
    metric: 'closingSoon',
    icon: CalendarClock,
    days: 'closeReminderDays',
  },
  {
    key: 'overdueOpportunities',
    entity: 'opportunities',
    metric: 'overdueOpportunities',
    icon: AlertCircle,
  },
  // Gaps in the book itself, and one's own unfinished requests.
  { key: 'noContacts', entity: 'companies', metric: 'noContacts', icon: UserX },
  {
    key: 'missingContact',
    entity: 'contacts',
    metric: 'missingContact',
    icon: PhoneOff,
  },
  { key: 'toSubmit', entity: 'approvals', metric: 'toSubmit', icon: FilePen },
];

// The task and approval cards open their record in the detail page's
// drawer; its code loads only when a record is first opened.
const RecordDrawer = lazy(() =>
  import('./crm-detail.js').then((module) => ({
    default: module.RecordDrawer,
  })),
);

// Framed as the list pages' cards and the task list are: a faint border, not
// the Card primitive's ring, and the lightest shadow.
const FRAME = 'border border-border/60 shadow-xs ring-0';

export default function DashboardPage(): ReactElement {
  const drawer = useRecordDrawerState();
  // Loaded on the first open and kept mounted after, so closing animates.
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  if (drawer.opened && !drawerLoaded) setDrawerLoaded(true);
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const navigate = useNavigate();
  const [scope, setScope] = useState<'mine' | 'team'>('team');
  const query = useCrmQuery<Data>(`dashboard?scope=${scope}`);
  const data = query.data;
  const attention = (data?.attention ?? {}) as Data;
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  // The page greets the user by the time of day rather than naming itself;
  // the menu, the breadcrumb and the window title still call it the
  // overview.
  const user = useSessionUser();
  const part = dayPart(timeZone);
  const greeting = user?.name
    ? text(`greeting.${part}`, { name: user.name })
    : text(`greetingAlone.${part}`);
  const openList = (entity: Entity, metric: string): void =>
    void navigate(`/crm/${toText(entity)}?metric=${metric}`);

  // One of the three "today" lists: tasks carry their type and a start
  // time; approvals carry their topic and when they were submitted. The
  // workspace brings the first page of each; the card asks for the rest.
  const agenda = (
    name: AgendaName,
    empty: string,
    to: string,
  ): ReactElement => (
    <AgendaCard
      key={`${name}-${scope}`}
      name={name}
      scope={scope}
      initial={data?.[name] as AgendaPage | undefined}
      empty={empty}
      to={to}
      timeZone={timeZone}
    />
  );

  // A section of the page, under a heading of its own.
  const section = (key: string, children: ReactNode): ReactElement => (
    <section className='space-y-3'>
      <h2 className='text-sm font-medium text-muted-foreground'>{text(key)}</h2>
      {children}
    </section>
  );

  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      <CrmFrame
        narrow
        title={
          <>
            <GreetingFace className='mr-3 h-[0.92em] w-[0.94em] shrink-0' />
            {greeting}
          </>
        }
        titleAside={
          <div className='flex rounded-lg border p-0.5'>
            {(['mine', 'team'] as const).map((value) => (
              <Button
                key={value}
                size='sm'
                variant={scope === value ? 'secondary' : 'ghost'}
                onClick={() => setScope(value)}
              >
                {text(value === 'mine' ? 'scopeMine' : 'scopeTeam')}
              </Button>
            ))}
          </div>
        }
      >
        {/* Outside the sections, so the sticky section row and the section
            ids are untouched; above the loading state and the error, so it
            keeps its place. */}
        <AssistantAskBox />
        <ErrorNotice error={query.error} />
        {query.isLoading || !data ? (
          <Loading />
        ) : (
          <>
            {/* Today's work, under a heading like the section below it. Set
                well apart from the box, so the box stands out as the page's
                opening, and apart from the section below by more than the
                frame's spacing. */}
            <section className='space-y-3 pt-14 pb-6'>
              <h2 className='text-sm font-medium text-muted-foreground'>
                {text('todaysWork')}
              </h2>
              <div className='grid gap-4 lg:grid-cols-3'>
                {agenda(
                  'today',
                  text('noToday'),
                  '/crm/tasks?metric=todayTasks',
                )}
                {agenda(
                  'overdue',
                  text('noOverdue'),
                  '/crm/tasks?metric=overdueTasks',
                )}
                {agenda(
                  'approvals',
                  text('overdueApprovalHint'),
                  scope === 'team'
                    ? '/crm/approvals?status=pending'
                    : '/crm/approvals?metric=myDecisions',
                )}
              </div>
            </section>
            {section(
              'risks',
              // One row per card in even columns: three across when they
              // fit, then two, then one.
              <div className='@container'>
                <div className='grid gap-3 @xl:grid-cols-2 @3xl:grid-cols-3'>
                  {attentionCards.map((card) => (
                    <AttentionCard
                      key={card.key}
                      title={toText(text(card.title ?? card.key))}
                      note={toText(
                        text(`metricNotes.${card.key}`, {
                          defaultValue: '',
                          days: card.days
                            ? meta?.settings[card.days]
                            : undefined,
                        }),
                      )}
                      icon={card.icon}
                      count={Number(attention[card.key] ?? 0)}
                      onClick={() => openList(card.entity, card.metric)}
                    />
                  ))}
                </div>
              </div>,
            )}
          </>
        )}
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

// One thing that may need attention: its icon on a grey tile, its title with
// the rule under it, and the count on the right, all aligned to the card's
// top, so cards whose rule takes two lines line up with their neighbours.
// Something waiting turns only the count amber, a zero stays grey: amber is a
// small signal beside the AI's purple, never a block of colour. A click opens
// the list behind the count.
function AttentionCard({
  title,
  note,
  icon: Icon,
  count,
  onClick,
}: {
  title: string;
  note: string;
  icon: LucideIcon;
  count: number;
  onClick: () => void;
}): ReactElement {
  const waiting = count > 0;
  return (
    <button
      type='button'
      onClick={onClick}
      className='flex min-w-0 items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-left shadow-xs transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
    >
      <span className='grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground'>
        <Icon className='size-4' aria-hidden />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block truncate text-sm font-medium'>{title}</span>
        {note && (
          <span className='line-clamp-2 text-xs text-muted-foreground'>
            {note}
          </span>
        )}
      </span>
      <span
        className={`shrink-0 text-2xl leading-9 font-semibold tabular-nums ${
          waiting ? 'text-warning' : 'text-muted-foreground/70'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

type AgendaName = 'today' | 'overdue' | 'approvals';
// Each card's icon: the tasks' and the approvals' menu icons, and an alarm
// for the overdue tasks.
const AGENDA_ICONS: Record<AgendaName, LucideIcon> = {
  today: SquareCheckBig,
  overdue: AlarmClock,
  approvals: ListChecks,
};

// A face drawn in a few strokes that leads the greeting: two eyes, a nose
// and a broad smile, in the band of colours the ask boxes' border carries
// (client/styles.css), so the page's opening reads as one.
function GreetingFace({ className }: { className?: string }): ReactElement {
  const id = useId();
  return (
    <svg
      // Cropped to the strokes, so the box is the face and lines up with the
      // glyphs beside it.
      viewBox='1.5 1.5 21 20.5'
      fill='none'
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id={id} x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' style={{ stopColor: 'var(--ai)' }} />
          <stop
            offset='0.5'
            style={{
              stopColor: 'color-mix(in oklch, var(--ai) 45%, var(--info))',
            }}
          />
          <stop
            offset='1'
            style={{
              stopColor:
                'color-mix(in oklch, var(--ai) 70%, var(--destructive))',
            }}
          />
        </linearGradient>
      </defs>
      <g stroke={`url(#${id})`} strokeLinecap='round' strokeLinejoin='round'>
        <path d='M4.5 3v3.5M19.5 3v3.5' strokeWidth={3} />
        <path d='M12.6 6.2 10.4 11.6l3.4.6' strokeWidth={2.2} />
        <path d='M3 16.2c4.6 5.4 13.4 5.4 18 0' strokeWidth={3} />
      </g>
    </svg>
  );
}

// The part of the day the page greets in, by the hour in the CRM's time
// zone: morning until noon, afternoon until six, evening after.
function dayPart(timeZone: string): 'morning' | 'afternoon' | 'evening' {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date()),
  );
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}
// A workspace card pages in fives: five is what fits under the day's
// heading without scrolling, and the rest comes on request.
const AGENDA_PAGE = 5;

function AgendaCard({
  name,
  scope,
  initial,
  empty,
  to,
  timeZone,
}: {
  name: AgendaName;
  scope: 'mine' | 'team';
  initial: AgendaPage | undefined;
  empty: string;
  to: string;
  timeZone: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const entity: Entity = name === 'approvals' ? 'approvals' : 'tasks';
  const AgendaIcon = AGENDA_ICONS[name];
  // Pages fetched past the first, which came with the workspace itself.
  const [more, setMore] = useState<CrmRecord[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const records = [...(initial?.data ?? []), ...more];
  const total = initial?.total ?? 0;
  const loadMore = async (): Promise<void> => {
    setLoading(true);
    try {
      const next = await api<AgendaPage>(
        `dashboard/${name}?scope=${scope}&page=${toText(page + 1)}&pageSize=${toText(AGENDA_PAGE)}`,
      );
      setMore((all) => [...all, ...next.data]);
      setPage(next.page);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className={FRAME}>
      <CardHeader className='flex flex-row items-center gap-2.5'>
        <span className='grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground'>
          <AgendaIcon className='size-4' />
        </span>
        <div className='flex min-w-0 flex-1 items-baseline gap-2'>
          <CardTitle className='truncate text-base'>
            {text(
              name === 'approvals'
                ? scope === 'team'
                  ? 'pendingApprovalsTeam'
                  : 'pendingApprovals'
                : name,
            )}
          </CardTitle>
          {/* The count, amber while the card lists something, as the
              attention cards' counts; the tile stays grey. */}
          <span
            className={`font-heading text-lg leading-none font-semibold tabular-nums ${
              total ? 'text-warning' : 'text-muted-foreground'
            }`}
          >
            {total}
          </span>
        </div>
        <Link
          to={to}
          aria-label={text('more')}
          className='rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <ArrowUpRight className='size-4' />
        </Link>
      </CardHeader>
      <CardContent className='relative space-y-1'>
        {records.length ? (
          records.map((r) => (
            <div
              key={r.id}
              className='-mx-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/50'
            >
              <div className='flex items-center gap-2'>
                {name === 'approvals' && <KindTag value={r.topic} />}
                <span className='min-w-0 flex-1 truncate'>
                  <RecordLink entity={entity} record={r} />
                </span>
              </div>
              <p className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground'>
                <span className='inline-flex items-center gap-1'>
                  <Clock className='size-3 shrink-0' />
                  {name === 'approvals'
                    ? localDate(r.submittedAt, language, timeZone)
                    : dueText(r, timeZone) || '—'}
                </span>
                {/* Whose it is — the same line in both scopes, so the
                      cards read alike: an approval names its applicant and
                      approver, a task its owner. */}
                {name === 'approvals' ? (
                  <>
                    <span className='inline-flex items-center gap-1'>
                      <User className='size-3 shrink-0' />
                      {toText(
                        meta?.users.find((u) => u.id === r.ownerId)?.name,
                      )}
                    </span>
                    <span className='inline-flex items-center gap-1'>
                      <ShieldCheck className='size-3 shrink-0' />
                      {toText(
                        meta?.users.find((u) => u.id === r.approverId)?.name,
                      )}
                    </span>
                  </>
                ) : (
                  <span className='inline-flex items-center gap-1'>
                    <User className='size-3 shrink-0' />
                    {meta?.users.find((u) => u.id === r.ownerId)?.name}
                  </span>
                )}
              </p>
            </div>
          ))
        ) : (
          <p className='py-2 text-sm text-muted-foreground'>{empty}</p>
        )}
        <AutoLoadMore
          hasMore={records.length < total}
          loading={loading}
          onLoad={() => void loadMore()}
        />
      </CardContent>
    </Card>
  );
}
