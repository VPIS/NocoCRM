import { TrendChart } from '../components/crm/trend-chart.js';
import { SectionNav } from '../components/crm/section-nav.js';
import {
  ActivityReport,
  CycleReport,
  ReasonsReport,
  RevenueReport,
} from '../components/crm/dashboard-reports.js';
import { SortableTable } from '../components/crm/sortable-table.js';
import {
  useAgentReadiness,
  useAskAgent,
} from '../components/crm/agent-chat/ask.js';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Building2,
  CalendarDays,
  ChartLine,
  CheckCircle2,
  Gauge,
  Inbox,
  Layers,
  Percent,
  Radar,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Trophy,
  UserMinus,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../components/ui/button.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import {
  CrmFrame,
  Loading,
  ErrorNotice,
  Metric,
} from '../components/crm/common.js';
import {
  useCrmQuery,
  useCrmText,
  useAssistantAvailable,
  rows,
  moneyTotals,
  toText,
  type Data,
  type Entity,
} from '../components/crm/api.js';

// The reports: how the business is going, taken out of the overview, which
// keeps what to do today (crm-dashboard.tsx). The figures come from the same
// dashboard endpoint, for the reader's own records or the team's; the page
// lists its sections in a row that sticks to the top as it scrolls, and asks
// The assistant for a written analysis from its header.

// Framed as the list pages' cards and the task list are: a faint border, not
// the Card primitive's ring, and the lightest shadow.
const FRAME = 'border border-border/60 shadow-xs ring-0';

export default function ReportsPage(): ReactElement {
  const { text, language } = useCrmText();
  const navigate = useNavigate();
  const readiness = useAgentReadiness();
  const askAgent = useAskAgent();
  const assistant = useAssistantAvailable();
  const [scope, setScope] = useState<'mine' | 'team'>('team');
  const query = useCrmQuery<Data>(`dashboard?scope=${scope}`);
  const data = query.data;
  const business = (data?.business ?? {}) as Data;
  const overall = (data?.overall ?? {}) as Data;
  const funnel = rows(data?.funnel);
  const maxCount = Math.max(1, ...funnel.map((r) => Number(r.count)));
  const openList = (entity: Entity, metric: string): void =>
    void navigate(`/crm/${toText(entity)}?metric=${metric}`);
  // The assistant writes the analysis in a new conversation in its panel; offered
  // while it can take it.
  const analyze = (): void => {
    if (!readiness.agent) return;
    void askAgent({
      text: toText(text('prompts.analyzeSales')),
      agent: readiness.agent,
    }).catch(() => undefined);
  };

  // A section of the page, by its title's key, which also gives the id the
  // page's own navigation (SectionNav) scrolls to; its top clears that
  // navigation.
  const sectionId = (key: string): string =>
    `reports-${key.replace(/\W+/g, '-')}`;
  // Each heading carries the icon its entry in the navigation row has.
  const section = (key: string, children: ReactNode): ReactElement => {
    const Icon = SECTION_ICONS[key];
    return (
      <section id={sectionId(key)} className='scroll-mt-16 space-y-3'>
        <h2 className='flex items-center gap-1.5 text-sm font-medium text-muted-foreground'>
          {Icon && <Icon className='size-4' aria-hidden />}
          {text(key)}
        </h2>
        {children}
      </section>
    );
  };
  const sectionKeys = [
    'keyFigures',
    'overall',
    'reports.revenueSection',
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
    <CrmFrame
      title={text('reportsTitle')}
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
      actions={
        assistant && readiness.state !== 'unavailable' ? (
          <Button
            variant='outline'
            disabled={readiness.state !== 'ready'}
            onClick={analyze}
          >
            <Sparkles className='text-ai' />
            {text('dock.q.home.analyze')}
          </Button>
        ) : undefined
      }
    >
      <ErrorNotice error={query.error} />
      {query.isLoading || !data ? (
        <Loading />
      ) : (
        <>
          <SectionNav
            label={text('reportSections')}
            sections={sectionKeys.map((key) => ({
              id: sectionId(key),
              label: text(key),
              icon: SECTION_ICONS[key],
            }))}
          />
          {section(
            'keyFigures',
            // Four figures to read first, two by two until a row of four
            // fits; each opens its list.
            <div className='@container'>
              <div className='grid grid-cols-2 gap-4 @2xl:grid-cols-4'>
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
                  title={text('wonThisMonth')}
                  icon={Trophy}
                  value={moneyTotals(business.wonThisMonth, language)}
                  note={text('metricNotes.wonThisMonth')}
                  onClick={() => openList('opportunities', 'wonThisMonth')}
                />
                <Metric
                  title={text('newLeads')}
                  icon={Inbox}
                  value={Number(business.newLeads ?? 0)}
                  note={text('metricNotes.newLeads')}
                  onClick={() => openList('leads', 'newThisMonth')}
                />
              </div>
            </div>,
          )}
          {section(
            'overall',
            <>
              <div className='grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]'>
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
                    share: Number(overall.companies)
                      ? `${toText(Math.round((Number(overall.customers ?? 0) / Number(overall.companies)) * 100))}%`
                      : '0%',
                  })}
                  onClick={() => openList('companies', 'customers')}
                />
              </div>
              <Card className={FRAME}>
                <CardHeader className='flex flex-row items-center justify-between'>
                  <CardTitle className='text-base'>{text('funnel')}</CardTitle>
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
            'monthBusiness',
            <>
              <div className='grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]'>
                <Metric
                  title={text('convertedLeads')}
                  icon={CheckCircle2}
                  value={Number(business.convertedLeads ?? 0)}
                  note={text('metricNotes.convertedLeads')}
                  onClick={() => openList('leads', 'convertedThisMonth')}
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
                    added: Number(business.newCompanies ?? 0),
                  })}
                  onClick={() => openList('companies', 'churnedThisMonth')}
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
                    // Named as the overview's attention cards are.
                    ['uncontacted', 'uncontactedCard'],
                    ['staleLeads', 'staleLeads'],
                    ['staleCompanies', 'staleCompanies'],
                    ['staleOpportunities', 'staleOpportunities'],
                    ['overdueTasks', 'overdueTasks'],
                  ],
                  (row) => toText(row.id),
                )}
                <ActivityReport activity={data.activity as Data | undefined} />
              </div>,
            )}
        </>
      )}
    </CrmFrame>
  );
}

// The icon each section carries in the page's navigation: the lead
// sources take the leads' menu icon.
const SECTION_ICONS: Record<string, LucideIcon> = {
  keyFigures: Target,
  overall: Gauge,
  'reports.revenueSection': ChartLine,
  monthBusiness: CalendarDays,
  'reports.lossSection': TrendingDown,
  sourcesSection: Radar,
  teamSection: Users,
};
