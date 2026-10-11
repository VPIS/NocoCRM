import { AssistantAskBox } from '../components/crm/assistant-ask-box.js';
import { RecentConversations } from '../components/crm/agent-chat/recent-conversations.js';
import { toText } from '../components/crm/api.js';
import {
  Suspense,
  lazy,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  RecordDrawerContext,
  useRecordDrawerState,
} from '../components/crm/record-drawer.js';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  CalendarClock,
  Clock,
  PauseCircle,
  type LucideIcon,
  FilePen,
  TimerOff,
  Hourglass,
  PhoneOff,
  UserX,
  Sun,
  Sunrise,
  Moon,
} from 'lucide-react';
import { CrmFrame, Loading, ErrorNotice } from '../components/crm/common.js';
import {
  useCrmQuery,
  useCrmText,
  useMetadata,
  useSessionUser,
  type Data,
  type Entity,
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

export default function DashboardPage(): ReactElement {
  const drawer = useRecordDrawerState();
  // Loaded on the first open and kept mounted after, so closing animates.
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  if (drawer.opened && !drawerLoaded) setDrawerLoaded(true);
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const navigate = useNavigate();
  // The team's, as far as the reader may read: the attention counts are
  // what the team has to look at, and a seller's own access already narrows
  // them to their records.
  const query = useCrmQuery<Data>('dashboard?scope=team');
  const data = query.data;
  const attention = (data?.attention ?? {}) as Data;
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  // The page greets the user by the time of day rather than naming itself;
  // the menu, the breadcrumb and the window title still call it the
  // overview.
  const user = useSessionUser();
  const part = dayPart(timeZone);
  const DayPartIcon = DAY_PART_ICONS[part];
  const greeting = user?.name
    ? text(`greeting.${part}`, { name: user.name })
    : text(`greetingAlone.${part}`);
  const openList = (entity: Entity, metric: string): void =>
    void navigate(`/crm/${toText(entity)}?metric=${metric}`);

  // A section of the page, under a heading of its own, set apart from what
  // is above it as the latest conversations are from the ask box.
  const section = (key: string, children: ReactNode): ReactElement => (
    <section className='space-y-3 pt-10'>
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
            <DayPartIcon
              aria-hidden
              strokeWidth={2.25}
              className='mr-3 size-[0.95em] shrink-0 text-foreground'
            />
            {greeting}
          </>
        }
      >
        {/* Outside the sections, so the sticky section row and the section
            ids are untouched; above the loading state and the error, so it
            keeps its place. */}
        <AssistantAskBox />
        {/* The latest conversations, under the box they start from. */}
        <RecentConversations />
        <ErrorNotice error={query.error} />
        {query.isLoading || !data ? (
          <Loading />
        ) : (
          <>
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
      className='flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-xs transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
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

// The time of day the page greets in, drawn before the greeting: the sun
// rising in the morning, the sun in the afternoon, the moon in the evening,
// in the heading's own colour.
const DAY_PART_ICONS: Record<'morning' | 'afternoon' | 'evening', LucideIcon> =
  { morning: Sunrise, afternoon: Sun, evening: Moon };

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
