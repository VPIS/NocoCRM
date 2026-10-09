import { useState, type ReactElement, type ReactNode } from 'react';
import { Button } from '../ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js';
import { RecordLink } from './common.js';
import { SortableTable } from './sortable-table.js';
import {
  moneyTotals,
  toText,
  useCrmText,
  useMetadata,
  type CrmRecord,
  type Data,
} from './api.js';

// The overview's reports beyond its counts (server/providers/crm/reports.ts):
// what was won month by month and what is likely to close, why deals are
// lost or paused, how long a deal takes and where it waits, and what each
// member of the team did over the last four weeks.

// Framed as the overview's other cards are.
const FRAME = 'border border-border/60 shadow-xs ring-0';

const rowsOf = (value: unknown): Data[] =>
  Array.isArray(value) ? (value as Data[]) : [];
// The total of an amount kept per currency, for a bar's length; the label
// shows each currency on its own.
const sumOf = (value: unknown): number =>
  Object.values((value ?? {}) as Data).reduce<number>(
    (sum, amount) => sum + Number(amount ?? 0),
    0,
  );

function ReportCard({
  title,
  aside,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <Card className={FRAME}>
      <CardHeader className='flex flex-row items-center justify-between gap-2'>
        <CardTitle className='text-base'>{title}</CardTitle>
        {aside}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Won amounts by month as columns, and the forecast of this month or this
// quarter: what is won, what the likelier deals add, the weighted sum and
// the best case.
export function RevenueReport({
  revenue,
}: {
  revenue: Data | undefined;
}): ReactElement {
  const { text, language } = useCrmText();
  const [period, setPeriod] = useState<'month' | 'quarter'>('month');
  const months = rowsOf(revenue?.months);
  const max = Math.max(1, ...months.map((m) => sumOf(m.won)));
  const monthLabel = (month: unknown): string => {
    const [y, m] = toText(month).split('-').map(Number);
    return new Intl.DateTimeFormat(language, { month: 'short' }).format(
      new Date(Date.UTC(y, (m || 1) - 1, 15)),
    );
  };
  const forecast = ((revenue?.forecast ?? {}) as Data)[period] as
    Data | undefined;
  const best = Math.max(1, sumOf(forecast?.won) + sumOf(forecast?.bestCase));
  const lines: [string, unknown, unknown, string][] = [
    ['won', forecast?.won, forecast?.wonCount, 'bg-success'],
    ['commit', forecast?.commit, forecast?.commitCount, 'bg-primary/75'],
    ['weighted', forecast?.weighted, undefined, 'bg-primary/45'],
    ['bestCase', forecast?.bestCase, forecast?.bestCaseCount, 'bg-primary/20'],
  ];
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <ReportCard title={text('reports.wonByMonth')}>
        <div className='flex h-44 items-end gap-3'>
          {months.map((m) => (
            <div
              key={toText(m.month)}
              className='flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1'
              title={`${toText(m.month)} · ${moneyTotals(m.won, language)} · ${text('reports.dealsCount', { count: Number(m.count ?? 0) })}`}
            >
              <span className='truncate text-[11px] text-muted-foreground tabular-nums'>
                {sumOf(m.won) ? moneyTotals(m.won, language) : ''}
              </span>
              <div
                className='w-full max-w-12 rounded-t-md bg-primary/75'
                style={{
                  height: `${toText(Math.max(sumOf(m.won) ? 4 : 0, (sumOf(m.won) / max) * 100))}%`,
                }}
              />
              <span className='text-xs text-muted-foreground'>
                {monthLabel(m.month)}
              </span>
            </div>
          ))}
        </div>
      </ReportCard>
      <ReportCard
        title={text('reports.forecast')}
        aside={
          <div className='flex rounded-lg border p-0.5'>
            {(['month', 'quarter'] as const).map((value) => (
              <Button
                key={value}
                size='xs'
                variant={period === value ? 'secondary' : 'ghost'}
                onClick={() => setPeriod(value)}
              >
                {text(
                  value === 'month'
                    ? 'reports.thisMonth'
                    : 'reports.thisQuarter',
                )}
              </Button>
            ))}
          </div>
        }
      >
        <div className='space-y-3'>
          {lines.map(([key, amount, count, tone]) => (
            <div key={key} className='space-y-1'>
              <div className='flex items-baseline justify-between gap-3 text-sm'>
                <span title={text(`reports.${key}Hint`, { defaultValue: '' })}>
                  {text(`reports.${key}`)}
                  {count !== undefined && (
                    <span className='ml-2 text-xs text-muted-foreground tabular-nums'>
                      {text('reports.dealsCount', { count: Number(count) })}
                    </span>
                  )}
                </span>
                <span className='font-medium tabular-nums'>
                  {moneyTotals(amount, language)}
                </span>
              </div>
              <div className='h-2 rounded-full bg-muted'>
                <div
                  className={`h-full rounded-full ${tone}`}
                  style={{
                    width: `${toText(Math.min(100, (sumOf(amount) / best) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
          <p className='text-xs text-muted-foreground'>
            {text('reports.forecastHint')}
          </p>
        </div>
      </ReportCard>
    </div>
  );
}

// A list of reasons as bars: how many deals, and their amount.
function ReasonBars({
  rows,
  empty,
}: {
  rows: Data[];
  empty: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const max = Math.max(1, ...rows.map((r) => Number(r.count ?? 0)));
  if (!rows.length)
    return <p className='text-sm text-muted-foreground'>{empty}</p>;
  return (
    <div className='space-y-2.5'>
      {rows.map((r) => (
        <div
          key={toText(r.reason ?? 'none')}
          className='grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-xs'
        >
          <span className='truncate'>
            {r.reason
              ? text(`options.${toText(r.reason)}`, {
                  defaultValue: toText(r.reason),
                })
              : text('reports.unspecified')}
          </span>
          <div className='h-5 rounded-md bg-muted'>
            <div
              className='h-full rounded-md bg-destructive/60'
              style={{
                width: `${toText((Number(r.count ?? 0) / max) * 100)}%`,
              }}
            />
          </div>
          <span className='text-right tabular-nums'>
            <span className='font-medium'>{Number(r.count ?? 0)}</span>
            <span className='ml-2 text-muted-foreground'>
              {moneyTotals(r.amount, language)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// Why deals were lost in the last 90 days, and why the paused ones wait.
export function ReasonsReport({
  reasons,
}: {
  reasons: Data | undefined;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <ReportCard
        title={
          <>
            {text('reports.lostReasons')}
            <span className='ml-2 text-muted-foreground tabular-nums'>
              {Number(reasons?.lostCount ?? 0)}
            </span>
          </>
        }
      >
        <ReasonBars
          rows={rowsOf(reasons?.lost)}
          empty={text('reports.noLost')}
        />
      </ReportCard>
      <ReportCard
        title={
          <>
            {text('reports.pausedReasons')}
            <span className='ml-2 text-muted-foreground tabular-nums'>
              {Number(reasons?.pausedCount ?? 0)}
            </span>
          </>
        }
      >
        <ReasonBars
          rows={rowsOf(reasons?.paused)}
          empty={text('reports.noPaused')}
        />
      </ReportCard>
    </div>
  );
}

// How long a deal takes to be won, how long deals stay in each stage, and
// the open ones waiting longest.
export function CycleReport({
  cycle,
}: {
  cycle: Data | undefined;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const days = (value: unknown): string =>
    value == null
      ? '—'
      : text('reports.days', { days: Math.round(Number(value)) });
  const stages = rowsOf(cycle?.stages);
  const waiting = rowsOf(cycle?.waiting);
  const ownerOf = (id: unknown): string =>
    toText(meta?.users.find((u) => u.id === id)?.name ?? '');
  return (
    <ReportCard title={text('reports.cycle')}>
      {/* By the card's own width: the average above, the stages and the
          waiting deals side by side once there is room for both, beside
          the average once there is room for all three. */}
      <div className='@container'>
        <div className='grid gap-6 @2xl:grid-cols-2 @5xl:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)]'>
          <div className='space-y-1 @2xl:col-span-2 @5xl:col-span-1'>
            <p className='text-3xl font-semibold tabular-nums'>
              {days(cycle?.wonDays)}
            </p>
            <p className='text-xs text-muted-foreground'>
              {Number(cycle?.wonCount ?? 0)
                ? text('reports.cycleNote', {
                    count: Number(cycle?.wonCount ?? 0),
                  })
                : text('reports.noCycle')}
            </p>
          </div>
          <SortableTable
            rows={stages}
            rowKey={(row) => toText(row.stage)}
            columns={[
              {
                id: 'stage',
                title: text('reports.stage'),
                sortValue: (row) => stages.indexOf(row),
                cell: (row) => text(`options.${toText(row.stage)}`),
              },
              {
                id: 'averageDays',
                title: text('reports.averageStay'),
                sortValue: (row) =>
                  row.averageDays == null ? undefined : Number(row.averageDays),
                cell: (row) => days(row.averageDays),
              },
              {
                id: 'open',
                title: text('reports.openNow'),
                sortValue: (row) => Number(row.open ?? 0),
                cell: (row) => Number(row.open ?? 0),
              },
              {
                id: 'waiting',
                title: text('reports.waitingLong'),
                sortValue: (row) => Number(row.waiting ?? 0),
                cell: (row) =>
                  Number(row.waiting ?? 0) ? (
                    <span className='font-medium text-destructive'>
                      {Number(row.waiting)}
                    </span>
                  ) : (
                    0
                  ),
              },
            ]}
          />
          <div className='min-w-0 space-y-2'>
            <p className='text-sm font-medium'>
              {text('reports.waitingDeals')}
              <span className='ml-2 text-muted-foreground tabular-nums'>
                {Number(cycle?.waitingCount ?? 0)}
              </span>
            </p>
            <p className='text-xs text-muted-foreground'>
              {text('reports.waitingHint')}
            </p>
            {waiting.length ? (
              <ul className='divide-y divide-border/60 text-sm'>
                {waiting.map((deal) => (
                  <li key={toText(deal.id)} className='py-2'>
                    <RecordLink
                      entity='opportunities'
                      record={deal as unknown as CrmRecord}
                    />
                    <p className='mt-0.5 text-xs text-muted-foreground'>
                      {text(`options.${toText(deal.stage)}`)} ·{' '}
                      {days(deal.days)}
                      {ownerOf(deal.ownerId)
                        ? ` · ${ownerOf(deal.ownerId)}`
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='text-sm text-muted-foreground'>
                {text('reports.noWaiting')}
              </p>
            )}
          </div>
        </div>
      </div>
    </ReportCard>
  );
}

// What each member of the team did over the last four weeks and this week:
// tasks completed, notes written and mail conversations with customers.
export function ActivityReport({
  activity,
}: {
  activity: Data | undefined;
}): ReactElement {
  const { text } = useCrmText();
  const rows = rowsOf(activity?.rows);
  const week = (row: Data, key: string): number => {
    const weeks = rowsOf(row.weeks);
    return Number(weeks.at(-1)?.[key] ?? 0);
  };
  const total = (row: Data, key: string): number =>
    Number(((row.total ?? {}) as Data)[key] ?? 0);
  const columns = [
    ['tasks', 'reports.tasksDone'],
    ['notes', 'reports.notesWritten'],
    ['mails', 'reports.mailThreads'],
  ] as const;
  return (
    <ReportCard
      title={text('reports.activity')}
      aside={
        <span className='text-xs text-muted-foreground'>
          {text('reports.activityHint')}
        </span>
      }
    >
      <SortableTable
        rows={rows}
        rowKey={(row) => toText(row.id)}
        columns={[
          {
            id: 'name',
            title: text('owner'),
            sortValue: (row) => toText(row.name),
            cell: (row) => toText(row.name),
          },
          // Four weeks' total, this week's beside it.
          ...columns.map(([key, label]) => ({
            id: key,
            title: text(label),
            sortValue: (row: Data) => total(row, key),
            cell: (row: Data) => (
              <span className='tabular-nums'>
                {total(row, key)}
                <span className='ml-2 text-xs text-muted-foreground'>
                  {text('reports.thisWeekCount', { count: week(row, key) })}
                </span>
              </span>
            ),
          })),
        ]}
      />
    </ReportCard>
  );
}
