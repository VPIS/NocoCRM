import { useTranslation } from '@nocobase/i18n/client';
import { ArrowLeft, Maximize2 } from 'lucide-react';
import { lazy, Suspense, useState, type ReactElement } from 'react';
import { Link } from 'react-router';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { ErrorNotice, Loading } from './common.js';
import { VerdictBadge } from './lead-evaluation.js';
import { relativeTime, toText, useCrmText, type Entity } from './api.js';
import {
  isDecided,
  recordOf,
  useDecisions,
  useWording,
  type DecisionItem,
} from './inbox-decisions-data.js';

// The record's pane, from the detail pages, loaded with the first
// suggestion shown so the inbox's own code stays small.
const RecordPane = lazy(() =>
  import('../../pages/crm-detail.js').then((module) => ({
    default: module.RecordPane,
  })),
);

// The inbox's AI suggestions as they are drawn: the list in its left column
// and the chosen one in its detail pane (inbox-decisions.tsx registers them).

// The suggestions in the inbox's left column, under its AI suggestions tab
// (no heading of their own): those waiting, and the handled ones after
// them, under their heading.
export function DecisionList({
  items,
  selectedId,
  onSelect,
  error,
  loading,
}: {
  items: DecisionItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  error: unknown;
  loading: boolean;
}): ReactElement {
  const { text, language } = useCrmText();
  const { nameOf, kindOf } = useWording();
  const waiting = items.filter((entry) => !isDecided(entry));
  const handled = items.filter(isDecided);
  const [now] = useState(() => Date.now());
  const heading = (label: string) => (
    <h2 className='pr-3 pl-5.5 text-xs font-medium tracking-wider text-muted-foreground uppercase'>
      {label}
    </h2>
  );
  // What became of a handled suggestion. An approval's review: approved or
  // rejected on the card, dismissed, or the approval withdrawn or decided on
  // itself; a follow-up: accepted or dismissed.
  const outcomeOf = (entry: DecisionItem): string => {
    // A task's preparation: written into the task, or set aside.
    if (entry.entity === 'tasks')
      return text(
        entry.status === 'accepted'
          ? 'taskPrep.written'
          : 'evaluation.statuses.dismissed',
      );
    if (entry.entity !== 'approvals')
      return text(`evaluation.statuses.${entry.status}`);
    const ai = entry.ai as { decision?: string; approvalOutcome?: string };
    if (entry.status === 'accepted')
      return text(`approvalReview.statuses.${ai.decision ?? 'approve'}`);
    if (entry.status === 'dismissed')
      return text('evaluation.statuses.dismissed');
    return ai.approvalOutcome === 'withdrawn'
      ? text('options.withdrawn')
      : text(
          `approvalReview.statuses.${ai.approvalOutcome === 'rejected' ? 'reject' : 'approve'}`,
        );
  };
  const row = (entry: DecisionItem) => {
    const selected = entry.id === selectedId;
    const decided = isDecided(entry);
    const result = entry.ai.result;
    return (
      <li key={entry.id}>
        <button
          type='button'
          aria-current={selected ? 'true' : undefined}
          data-decision-item=''
          onClick={() => onSelect(entry.id)}
          className={`relative flex w-full items-start gap-3 rounded-lg border py-3 pr-3 pl-[calc(--spacing(5.5)-1px)] text-left transition-[background-color,border-color] ${
            // On the list's white: the selected one on the grey a hovered
            // one takes, a shade deeper.
            selected
              ? 'border-transparent bg-accent'
              : 'border-transparent hover:bg-hover'
          } ${decided ? 'opacity-55' : ''}`}
        >
          {/* As the inbox marks what waits, in the AI's colour, under the
              tab's icon; the card's words start where the tab's label does
              (its icon and gap, 5.5 units, past its 1px border). */}
          <span
            aria-hidden
            className={`absolute top-3 bottom-3 -left-px w-0.5 rounded-full ${
              selected ? 'bg-primary' : decided ? 'bg-transparent' : 'bg-ai'
            }`}
          />
          {/* Two lines: what it is about (its kind's tag, then its record)
              with when, and then where it stands. */}
          <span className='grid min-w-0 flex-1 gap-1'>
            <span className='flex min-w-0 items-baseline gap-1.5'>
              {/* Its kind as a grey tag, as the application's other tags. */}
              <Badge variant='muted' className='shrink-0 self-center'>
                {kindOf(entry)}
              </Badge>
              <span className='min-w-0 truncate text-sm font-medium'>
                {nameOf(entry)}
              </span>
              <time
                className='ml-auto shrink-0 text-xs text-muted-foreground tabular-nums'
                dateTime={entry.createdAt}
                title={new Date(entry.createdAt).toLocaleString(language)}
              >
                {relativeTime(entry.createdAt, language, now, text('justNow'))}
              </time>
            </span>
            {entry.status === 'running' ? (
              <span className='text-xs text-muted-foreground'>
                {/* Not begun yet: waiting its turn behind other follow-ups. */}
                {text(
                  !entry.ai.startedAt
                    ? 'evaluation.queued'
                    : entry.ai.instruction
                      ? 'evaluation.revising'
                      : 'evaluation.running',
                )}
              </span>
            ) : result ? (
              <span className='line-clamp-1 text-xs text-muted-foreground'>
                {/* Handled, what became of it first: decided on the card,
                    dismissed, or an approval withdrawn or decided on
                    itself. */}
                {decided ? (
                  <>
                    <Badge
                      variant={
                        entry.status === 'accepted' ? 'success' : 'muted'
                      }
                    >
                      {outcomeOf(entry)}
                    </Badge>{' '}
                  </>
                ) : null}
                {entry.entity === 'tasks' ? null : entry.entity ===
                  'approvals' ? (
                  <Badge variant={decided ? 'muted' : 'ai'}>
                    {text(
                      `approvalReview.recommendations.${toText(result.recommendation)}`,
                    )}
                  </Badge>
                ) : (
                  <VerdictBadge verdict={result} pending={!decided} />
                )}{' '}
                {result.summary}
              </span>
            ) : null}
          </span>
        </button>
      </li>
    );
  };
  return (
    <section className='space-y-1'>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNotice error={error} />
      ) : (
        <>
          {waiting.length ? (
            <ul className='space-y-0.5'>{waiting.map(row)}</ul>
          ) : (
            <p className='py-2 pr-3 pl-5.5 text-sm text-muted-foreground'>
              {text('decisions.empty')}
            </p>
          )}
          {/* The handled ones always after them, under their heading. */}
          {handled.length ? (
            <div className='space-y-1 pt-4'>
              {/* A rule under the heading, apart from those waiting. */}
              <div className='border-b border-border pb-1.5'>
                {heading(text('decisions.handled'))}
              </div>
              <ul className='space-y-0.5'>{handled.map(row)}</ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

// The chosen suggestion in the inbox's detail pane, or the first while none
// is chosen: its record's left column (heading, actions and tabs, without
// the particulars), opened on the timeline at the AI's card, which is
// handled there as on the record's page. Its code loads with the pane.
export function DecisionDetail({
  id,
  onBack,
}: {
  readonly id: string | null;
  readonly onBack: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const query = useDecisions();
  const items = query.data?.data ?? [];
  const current =
    items.find((entry) => entry.id === id) ??
    items.find((entry) => !isDecided(entry)) ??
    items[0];
  if (query.isLoading) return <Loading />;
  if (!current)
    return query.error ? (
      <ErrorNotice error={query.error} />
    ) : (
      <p className='p-8 text-center text-sm text-muted-foreground'>
        {text('decisions.empty')}
      </p>
    );
  const record = recordOf(current);
  return (
    <RecordPaneFrame
      entity={current.entity}
      recordId={record.id}
      focus={current.id}
      paneKey={current.id}
      onBack={onBack}
    />
  );
}

// A record in the inbox's detail pane, an AI suggestion's or a
// notification's (inbox-notice-detail.tsx): its record's left column
// (heading, actions and tabs, without the particulars), opened on the
// timeline at `focus` when given. Its code loads with the pane.
export function RecordPaneFrame({
  entity,
  recordId,
  focus,
  paneKey,
  onBack,
}: {
  readonly entity: Entity;
  readonly recordId: string;
  readonly focus?: string;
  // A new pane for each item: its timeline, scrolled to it.
  readonly paneKey: string;
  readonly onBack?: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const { t } = useTranslation();
  const search = focus ? `?focus=${encodeURIComponent(focus)}` : '';
  return (
    <div className='flex min-h-full flex-col'>
      {/* The way back to the list, narrow, as the inbox's own items have;
          the record's kind, as the record drawer's bar names it; and the
          record's full page, with its particulars. A bar over a rule, as
          the drawer's is, as tall as the list's tabs beside it, so the two
          rules meet in one line. It stays at the top while the pane
          scrolls. */}
      <div className='sticky top-0 z-20 flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-4'>
        {onBack ? (
          <button
            type='button'
            onClick={onBack}
            className='inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden'
          >
            <ArrowLeft className='size-4' />
            {t('navigation.back')}
          </button>
        ) : null}
        <p className='min-w-0 flex-1 truncate text-sm text-muted-foreground'>
          {text(`entities.${entity}`)}
        </p>
        <Button
          variant='ghost'
          size='sm'
          // Pulled out by its own padding, so its words end where the
          // content's right edge does below.
          className='-mr-2.5'
          nativeButton={false}
          render={<Link to={`/crm/${entity}/${recordId}/history${search}`} />}
        >
          <Maximize2 />
          {text('openFullPage')}
        </Button>
      </div>
      <Suspense fallback={<Loading />}>
        <RecordPane key={paneKey} entity={entity} id={recordId} focus={focus} />
      </Suspense>
    </div>
  );
}
