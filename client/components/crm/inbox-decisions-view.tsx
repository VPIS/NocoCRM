import { useTranslation } from '@nocobase/i18n/client';
import { ArrowLeft, ArrowUpRight, Sparkles } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { ErrorNotice, Loading } from './common.js';
import {
  VerdictBadge,
  VerdictPanel,
  type EvaluationEntry,
} from './lead-evaluation.js';
import { ReviewPanel, type ReviewEntry } from './approval-review.js';
import { PrepPanel, type PrepEntry } from './task-preparation.js';
import { isEndOfDay } from '../../../server/providers/crm/zone-time.js';
import {
  relativeTime,
  toText,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
} from './api.js';
import {
  DECISION_PARAM,
  isDecided,
  recordOf,
  useDecisions,
  useWording,
  type DecisionItem,
} from './inbox-decisions-data.js';

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
    <h2 className='px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase'>
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
          onClick={() => onSelect(entry.id)}
          className={`relative flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-[background-color,border-color] ${
            selected
              ? 'border-border bg-card shadow-xs'
              : 'border-transparent hover:bg-accent/60'
          } ${decided ? 'opacity-55' : ''}`}
        >
          {/* As the inbox marks what waits, in the AI's colour. */}
          <span
            aria-hidden
            className={`absolute top-3 bottom-3 left-0 w-0.5 rounded-full ${
              selected ? 'bg-primary' : decided ? 'bg-transparent' : 'bg-ai'
            }`}
          />
          <Sparkles className='mt-0.5 size-4 shrink-0 text-ai' />
          <span className='grid min-w-0 flex-1 gap-1'>
            <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
              <span className='shrink-0'>{kindOf(entry)}</span>
              <time
                className='ml-auto shrink-0 tabular-nums'
                dateTime={entry.createdAt}
                title={new Date(entry.createdAt).toLocaleString(language)}
              >
                {relativeTime(entry.createdAt, language, now, text('justNow'))}
              </time>
            </span>
            <span className='truncate text-sm font-medium'>
              {nameOf(entry)}
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
            <p className='px-3 py-2 text-sm text-muted-foreground'>
              {text('decisions.empty')}
            </p>
          )}
          {/* The handled ones always after them, under their heading. */}
          {handled.length ? (
            <div className='space-y-1 pt-4'>
              {/* A rule under the heading, apart from those waiting. */}
              <div className='border-b border-border/60 pb-1.5'>
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
// is chosen.
export function DecisionDetail({
  id,
  onBack,
}: {
  readonly id: string | null;
  readonly onBack: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const query = useDecisions();
  const wording = useWording();
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
  return (
    // Container query: the inbox's list and the AI panel narrow this pane.
    <div className='@container p-4 md:p-6'>
      {/* Narrow, the way back to the list, as the inbox's own items have. */}
      <button
        type='button'
        onClick={onBack}
        className='mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden'
      >
        <ArrowLeft className='size-4' />
        {t('navigation.back')}
      </button>
      <DecisionEntry
        entry={current}
        onRevised={(next) => {
          // The card redone in place: its successor is the one shown.
          const updated = new URLSearchParams(params);
          updated.set(DECISION_PARAM, next.id);
          setParams(updated, { replace: true });
        }}
        name={wording.nameOf(current)}
        owner={wording.ownerOf(current)}
        when={wording.when}
      />
    </div>
  );
}

// The heading of the detail: the name, then a line of labelled facts, each
// set apart from the one before by a rule.
function DetailHeading({
  name,
  facts,
  action,
}: {
  name: string;
  facts: [label: string, value: string][];
  action: ReactElement;
}): ReactElement {
  const { text, language } = useCrmText();
  const colon = language.startsWith('zh') ? '：' : ':';
  return (
    <div className='mb-4 flex items-start justify-between gap-4'>
      {/* Takes the width the action leaves, so the facts wrap only when
          that is full, not at the name's width. */}
      <div className='grid min-w-0 flex-1 gap-1'>
        <h2 className='font-heading text-xl leading-tight font-semibold break-words @3xl:truncate'>
          {name}
        </h2>
        {/* Wide, one line of facts; narrow, a row each, labels and values
            in two columns. */}
        <dl className='mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm @3xl:flex @3xl:flex-wrap @3xl:items-center'>
          {facts
            .filter(([, value]) => value)
            .map(([label, value], index) => (
              <div
                key={label}
                className='contents @3xl:flex @3xl:min-w-0 @3xl:items-center @3xl:gap-3'
              >
                {/* Narrow, the facts wrap and a rule would start a line;
                    their labels set them apart. */}
                {index ? (
                  <span
                    aria-hidden
                    className='hidden h-3 w-px bg-border @3xl:block'
                  />
                ) : null}
                <div className='contents @3xl:flex @3xl:min-w-0 @3xl:gap-1'>
                  <dt className='shrink-0 text-muted-foreground'>
                    {text(label)}
                    {colon}
                  </dt>
                  <dd className='min-w-0 truncate tabular-nums @3xl:max-w-72'>
                    {value}
                  </dd>
                </div>
              </div>
            ))}
        </dl>
      </div>
      {action}
    </div>
  );
}

// A lead's or a deal's follow-up, an approval's review or a task's
// preparation, decided here as on
// its record's page, or opened in its timeline, where it is brought into view
// and marked.
function DecisionEntry({
  entry,
  name,
  owner,
  when,
  onRevised,
}: {
  entry: DecisionItem;
  onRevised: (entry: EvaluationEntry) => void;
  name: string;
  owner: string;
  when: (at: string) => string;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  const refresh = useRefresh();
  const open = (path: string) => (
    <Button
      size='sm'
      variant='outline'
      nativeButton={false}
      render={<Link to={path} />}
    >
      <ArrowUpRight />
      {/* What it opens, by name: 打开任务, Open lead. */}
      {text('decisions.openKind', { kind: text(`entity.${entry.entity}`) })}
    </Button>
  );
  // A task's preparation: written into the task here by its owner.
  if (entry.entity === 'tasks' && entry.task)
    return (
      <>
        <DetailHeading
          name={name}
          facts={[
            [
              'fields.dueAt',
              // A date alone reads as the date, not its day's last minute.
              entry.task.dueAt
                ? isEndOfDay(new Date(entry.task.dueAt), timeZone)
                  ? when(entry.task.dueAt).slice(0, 10)
                  : when(entry.task.dueAt)
                : '',
            ],
            ['decisions.evaluatedAt', when(entry.createdAt)],
          ]}
          action={open(`/crm/tasks/${entry.task.id}/history?focus=${entry.id}`)}
        />
        <PrepPanel
          key={entry.id}
          entry={entry as unknown as PrepEntry}
          task={entry.task as unknown as CrmRecord}
          onChanged={async () => {
            await refresh();
          }}
        />
      </>
    );
  // An approval's review: decided here by its approver.
  if (entry.entity === 'approvals' && entry.approval)
    return (
      <>
        <DetailHeading
          name={name}
          facts={[
            ['fields.opportunityId', toText(entry.approval.opportunity)],
            ['fields.topic', toText(text(`options.${entry.approval.topic}`))],
            ['approvalReview.applicant', owner],
            ['decisions.evaluatedAt', when(entry.createdAt)],
          ]}
          action={open(
            `/crm/approvals/${entry.approval.id}/history?focus=${entry.id}`,
          )}
        />
        <ReviewPanel
          key={entry.id}
          entry={entry as unknown as ReviewEntry}
          approvalId={entry.approval.id}
          approvalName={name}
          onRevised={(next) => onRevised(next as unknown as EvaluationEntry)}
          onChanged={async () => {
            await refresh();
          }}
        />
      </>
    );
  return (
    <>
      <DetailHeading
        name={name}
        facts={[
          ...(entry.opportunity
            ? ([
                ['fields.companyId', toText(entry.opportunity.company)],
                [
                  'fields.stage',
                  toText(text(`options.${entry.opportunity.stage}`)),
                ],
              ] as [string, string][])
            : []),
          ['fields.ownerId', owner],
          ['decisions.evaluatedAt', when(entry.createdAt)],
        ]}
        action={open(
          `/crm/${entry.entity}/${recordOf(entry).id}/history?focus=${entry.id}`,
        )}
      />
      <VerdictPanel
        key={entry.id}
        // Past the approvals' branch above: a lead's or a deal's.
        entity={entry.entity as 'leads' | 'opportunities'}
        entry={entry}
        recordId={recordOf(entry).id}
        recordName={name}
        editable
        // Whole, waiting or decided, as the record's timeline shows it.
        full
        onRevised={onRevised}
        onChanged={async () => {
          await refresh();
        }}
      />
    </>
  );
}
