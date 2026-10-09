import { TrendChart } from '../components/crm/trend-chart.js';
import { AssistantAskBox } from '../components/crm/assistant-ask-box.js';
import { SectionNav } from '../components/crm/section-nav.js';
import {
  ActivityReport,
  CycleReport,
  ReasonsReport,
  RevenueReport,
} from '../components/crm/dashboard-reports.js';
import { AutoLoadMore } from '../components/crm/auto-load.js';
import { SortableTable } from '../components/crm/sortable-table.js';
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
  CheckCircle2,
  CircleDashed,
  Clock,
  Inbox,
  Layers,
  PauseCircle,
  Percent,
  Trophy,
  type LucideIcon,
  Scale,
  User,
  ShieldCheck,
  Building2,
  FilePen,
  PhoneOff,
  UserMinus,
  UserX,
  XCircle,
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
  Metric,
  RecordLink,
} from '../components/crm/common.js';
import {
  useCrmQuery,
  useCrmApi,
  useCrmText,
  useMetadata,
  useSessionUser,
  rows,
  moneyTotals,
  localDate,
  type Data,
  type CrmRecord,
  type Entity,
  type ListData,
} from '../components/crm/api.js';

// The six risk cards: which list page they open, the metric key that page
// filters by, and the icon. The number itself comes from the same rule the
// list page's card uses, so the two always agree.
const attentionCards: {
  key: string;
  entity: Entity;
  metric: string;
  icon: LucideIcon;
  days?: 'leadStaleDays' | 'staleDays' | 'closeReminderDays';
}[] = [
  {
    key: 'uncontacted',
    entity: 'leads',
    metric: 'uncontacted',
    icon: Clock,
  },
  {
    key: 'staleLeads',
    entity: 'leads',
    metric: 'stale',
    icon: PauseCircle,
    days: 'leadStaleDays',
  },
  {
    key: 'staleAccounts',
    entity: 'accounts',
    metric: 'stale',
    icon: PauseCircle,
    days: 'staleDays',
  },
  {
    key: 'noOpenOpportunity',
    entity: 'accounts',
    metric: 'noOpenOpportunity',
    icon: CircleDashed,
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
  { key: 'noContacts', entity: 'accounts', metric: 'noContacts', icon: UserX },
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
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const navigate = useNavigate();
  const [scope, setScope] = useState<'mine' | 'team'>('team');
  const query = useCrmQuery<Data>(`dashboard?scope=${scope}`);
  const data = query.data;
  const attention = (data?.attention ?? {}) as Data;
  const business = (data?.business ?? {}) as Data;
  const overall = (data?.overall ?? {}) as Data;
  const funnel = rows(data?.funnel);
  const maxCount = Math.max(1, ...funnel.map((r) => Number(r.count)));
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
      initial={data?.[name] as ListData | undefined}
      empty={empty}
      to={to}
      timeZone={timeZone}
    />
  );

  // A section of the page, by its title's key, which also gives the id the
  // page's own navigation (SectionNav) scrolls to; its top clears that
  // navigation.
  const sectionId = (key: string): string =>
    `overview-${key.replace(/\W+/g, '-')}`;
  const section = (key: string, children: ReactNode): ReactElement => (
    <section id={sectionId(key)} className='scroll-mt-16 space-y-3'>
      <h2 className='text-sm font-medium text-muted-foreground'>{text(key)}</h2>
      {children}
    </section>
  );
  // Today's work opens the page, under the ask box and above this row,
  // which lists the sections below it.
  const sectionKeys = [
    'overall',
    'reports.revenueSection',
    'risks',
    'monthBusiness',
    'reports.lossSection',
    'sourcesSection',
    ...(scope === 'team' ? ['teamSection'] : []),
  ];

  // The value a cell shows and the value its column sorts by: an amount by
  // its total, a source by its label, a rate or a count as a number.
  const display = (row: Data, key: string): ReactNode =>
    key === 'conversionRate'
      ? row[key] == null
        ? '—'
        : `${toText(Math.round(Number(row[key]) * 100))}%`
      : typeof row[key] === 'object' && row[key] !== null
        ? moneyTotals(row[key], language)
        : key === 'source'
          ? text(`options.${toText(row[key])}`, {
              defaultValue: toText(row[key]),
            })
          : toText(row[key] ?? '—');
  const sortValue = (row: Data, key: string): number | string | undefined => {
    const value = row[key];
    if (value === null || value === undefined || value === '') return undefined;
    if (key === 'source') return toText(display(row, key));
    if (typeof value === 'number') return value;
    if (typeof value === 'object') {
      // No amount at all shows as "—" and sorts with the other blanks.
      const amounts = Object.values(value as Record<string, unknown>);
      if (!amounts.length) return undefined;
      return amounts.reduce<number>(
        (sum, amount) => sum + Number(amount ?? 0),
        0,
      );
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : toText(value);
  };
  const table = (
    title: string,
    items: Data[],
    columns: [string, string][],
    keyOf: (row: Data) => string,
  ): ReactElement => (
    <Card className={FRAME}>
      <CardHeader>
        <CardTitle className='text-base'>{text(title)}</CardTitle>
      </CardHeader>
      <CardContent>
        <SortableTable
          rows={items}
          rowKey={keyOf}
          columns={columns.map(([key, label]) => ({
            id: key,
            title: text(label),
            sortValue: (row: Data) => sortValue(row, key),
            cell: (row: Data) => display(row, key),
          }))}
        />
      </CardContent>
    </Card>
  );

  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      <CrmFrame
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
            {/* Today's work needs no heading: it opens the page, right under
                the ask box; named for screen readers. Set well apart from the
                box, so the box stands out as the page's opening, and apart
                from the section row below by more than the frame's spacing. */}
            <section
              aria-label={toText(text('todaysWork'))}
              className='pt-14 pb-6'
            >
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
            <SectionNav
              label={text('overviewSections')}
              sections={sectionKeys.map((key) => ({
                id: sectionId(key),
                label: text(key),
              }))}
            />
            {section(
              'overall',
              <>
                <div className='grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]'>
                  <Metric
                    title={text('pipeline')}
                    icon={Layers}
                    value={moneyTotals(business.pipeline, language)}
                    note={text('metricNotes.pipeline')}
                    onClick={() => openList('opportunities', 'open')}
                  />
                  <Metric
                    title={text('weighted')}
                    icon={Scale}
                    value={moneyTotals(business.weighted, language)}
                    note={text('metricNotes.weighted')}
                    onClick={() => openList('opportunities', 'open')}
                  />
                  <Metric
                    title={text('leadConversionRate')}
                    icon={Percent}
                    value={
                      overall.conversionRate == null
                        ? '—'
                        : `${toText(Math.round(Number(overall.conversionRate) * 100))}%`
                    }
                    note={
                      overall.conversionRate == null
                        ? text('noRate')
                        : text('metricNotes.conversionRate')
                    }
                  />
                  <Metric
                    title={text('winRate')}
                    icon={Percent}
                    value={
                      overall.winRate == null
                        ? '—'
                        : `${toText(Math.round(Number(overall.winRate) * 100))}%`
                    }
                    note={
                      overall.winRate == null
                        ? text('noRate')
                        : text('metricNotes.winRate')
                    }
                  />
                  <Metric
                    title={text('customers')}
                    icon={Building2}
                    value={Number(overall.customers ?? 0)}
                    note={text('metricNotes.customers', {
                      share: Number(overall.accounts)
                        ? `${toText(Math.round((Number(overall.customers ?? 0) / Number(overall.accounts)) * 100))}%`
                        : '0%',
                    })}
                    onClick={() => openList('accounts', 'customers')}
                  />
                </div>
                <Card className={FRAME}>
                  <CardHeader className='flex flex-row items-center justify-between'>
                    <CardTitle className='text-base'>
                      {text('funnel')}
                    </CardTitle>
                    <Link
                      className='text-xs text-muted-foreground hover:text-primary'
                      to='/crm/opportunities'
                    >
                      {text('more')} ↗
                    </Link>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    {funnel.map((stage) => (
                      <div
                        key={toText(stage.stage)}
                        className='grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-xs'
                      >
                        <span>{text(`options.${toText(stage.stage)}`)}</span>
                        <div className='h-6 rounded-md bg-muted'>
                          <div
                            className='h-full rounded-md bg-primary/75'
                            style={{
                              width: `${toText((Number(stage.count) / maxCount) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className='text-right tabular-nums'>
                          <span className='font-medium'>
                            {Number(stage.count)}
                          </span>
                          <span className='ml-2 text-muted-foreground'>
                            {moneyTotals(stage.amount, language)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>,
            )}
            {section(
              'reports.revenueSection',
              <div className='space-y-4'>
                <RevenueReport revenue={data.revenue as Data | undefined} />
                <TrendChart
                  title={text('trends')}
                  rows={rows(data.trends)}
                  language={language}
                  table={
                    <SortableTable
                      rows={rows(data.trends)}
                      rowKey={(row) => toText(row.month)}
                      columns={(
                        [
                          ['month', 'month'],
                          ['won', 'options.won'],
                          ['lost', 'options.lost'],
                        ] as const
                      ).map(([key, label]) => ({
                        id: key,
                        title: text(label),
                        sortValue: (row: Data) =>
                          key === 'month'
                            ? toText(row.month)
                            : Number(row[key] ?? 0),
                        cell: (row: Data) =>
                          key === 'month'
                            ? toText(row.month)
                            : Number(row[key] ?? 0),
                      }))}
                    />
                  }
                />
              </div>,
            )}
            {section(
              'risks',
              // The same grid as the other sections, so every group of figures
              // lays out alike: two to a row on a phone, as many as fit wider.
              <div className='grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]'>
                {attentionCards.map((card) => (
                  <Metric
                    key={card.key}
                    title={text(card.key)}
                    icon={card.icon}
                    value={Number(attention[card.key] ?? 0)}
                    tone={
                      Number(attention[card.key] ?? 0) > 0
                        ? 'attention'
                        : 'neutral'
                    }
                    note={text(`metricNotes.${card.key}`, {
                      defaultValue: '',
                      days: card.days ? meta?.settings[card.days] : undefined,
                    })}
                    onClick={() => openList(card.entity, card.metric)}
                  />
                ))}
              </div>,
            )}
            {section(
              'monthBusiness',
              <>
                <div className='grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]'>
                  <Metric
                    title={text('newLeads')}
                    icon={Inbox}
                    value={Number(business.newLeads ?? 0)}
                    note={text('metricNotes.newLeads')}
                    onClick={() => openList('leads', 'newThisMonth')}
                  />
                  <Metric
                    title={text('convertedLeads')}
                    icon={CheckCircle2}
                    value={Number(business.convertedLeads ?? 0)}
                    note={text('metricNotes.convertedLeads')}
                    onClick={() => openList('leads', 'convertedThisMonth')}
                  />
                  <Metric
                    title={text('wonThisMonth')}
                    icon={Trophy}
                    value={moneyTotals(business.wonThisMonth, language)}
                    note={text('metricNotes.wonThisMonth')}
                    onClick={() => openList('opportunities', 'wonThisMonth')}
                  />
                  <Metric
                    title={text('completedThisMonth')}
                    icon={CheckCircle2}
                    value={Number(business.completedThisMonth ?? 0)}
                    note={text('metricNotes.completedThisMonth')}
                    onClick={() => openList('tasks', 'completedThisMonth')}
                  />
                  <Metric
                    title={text('churnedThisMonth')}
                    icon={UserMinus}
                    value={Number(business.churnedThisMonth ?? 0)}
                    tone={
                      Number(business.churnedThisMonth ?? 0) > 0
                        ? 'attention'
                        : 'neutral'
                    }
                    note={text('metricNotes.churnedThisMonth', {
                      added: Number(business.newAccounts ?? 0),
                    })}
                    onClick={() => openList('accounts', 'churnedThisMonth')}
                  />
                  <Metric
                    title={text('approvedThisMonth')}
                    icon={ShieldCheck}
                    value={Number(business.approvedThisMonth ?? 0)}
                    note={text('metricNotes.approvedThisMonth')}
                    onClick={() => openList('approvals', 'approvedThisMonth')}
                  />
                  <Metric
                    title={text('rejectedThisMonth')}
                    icon={XCircle}
                    value={Number(business.rejectedThisMonth ?? 0)}
                    note={text('metricNotes.rejectedThisMonth', {
                      rate:
                        business.approvalRate == null
                          ? '—'
                          : `${toText(Math.round(Number(business.approvalRate) * 100))}%`,
                    })}
                    onClick={() => openList('approvals', 'rejectedThisMonth')}
                  />
                </div>
              </>,
            )}
            {section(
              'reports.lossSection',
              <div className='space-y-4'>
                <ReasonsReport reasons={data.reasons as Data | undefined} />
                <CycleReport cycle={data.cycle as Data | undefined} />
              </div>,
            )}
            {section(
              'sourcesSection',
              table(
                'sources',
                rows(data.sources),
                [
                  ['source', 'fields.source'],
                  ['leads', 'entities.leads'],
                  ['converted', 'converted'],
                  ['conversionRate', 'conversionRate'],
                  ['won', 'won'],
                ],
                (row) => toText(row.source),
              ),
            )}
            {scope === 'team' &&
              section(
                'teamSection',
                <div className='space-y-4'>
                  {table(
                    'sellers',
                    rows(data.sellers),
                    [
                      ['name', 'owner'],
                      ['pipeline', 'pipeline'],
                      ['wonThisMonth', 'wonThisMonth'],
                      ['uncontacted', 'uncontacted'],
                      ['staleLeads', 'staleLeads'],
                      ['staleAccounts', 'staleAccounts'],
                      ['overdueTasks', 'overdueTasks'],
                    ],
                    (row) => toText(row.id),
                  )}
                  <ActivityReport
                    activity={data.activity as Data | undefined}
                  />
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

// Each card's colour, from the theme's status tokens: today's tasks in the
// info colour, the overdue ones in the destructive, the approvals waiting in
// the warning; its icon sits on a tile of it and its top is washed with it.
const AGENDA_TONES: Record<
  AgendaName | 'quiet',
  { tile: string; wash: string }
> = {
  today: {
    tile: 'bg-info/10 text-info dark:bg-info/20',
    wash: 'from-info/8',
  },
  overdue: {
    tile: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
    wash: 'from-destructive/8',
  },
  approvals: {
    tile: 'bg-warning/10 text-warning dark:bg-warning/20',
    wash: 'from-warning/8',
  },
  quiet: { tile: 'bg-muted text-muted-foreground', wash: 'from-transparent' },
};

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
  initial: ListData | undefined;
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
  // Nothing overdue is nothing to warn of: the card then takes no colour.
  const tone =
    name === 'overdue' && !total ? AGENDA_TONES.quiet : AGENDA_TONES[name];
  const loadMore = async (): Promise<void> => {
    setLoading(true);
    try {
      const next = await api<ListData>(
        `dashboard/${name}?scope=${scope}&page=${toText(page + 1)}&pageSize=${toText(AGENDA_PAGE)}`,
      );
      setMore((all) => [...all, ...next.data]);
      setPage(next.page);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className={`${FRAME} relative overflow-hidden`}>
      {/* A wash of the card's colour across its top, behind the header. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b to-transparent ${tone.wash}`}
      />
      <CardHeader className='relative flex flex-row items-center gap-2.5'>
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone.tile}`}
        >
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
          <span className='font-heading text-lg leading-none font-semibold text-muted-foreground tabular-nums'>
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
