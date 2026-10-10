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
import {
  relativeTime,
  toText,
  useCrmText,
  useMetadata,
  useRefresh,
} from './api.js';
import {
  DECISION_PARAM,
  isDecided,
  recordOf,
  scopeOf,
  useDecisions,
  useWording,
  type DecisionItem,
} from './inbox-decisions-data.js';

// The inbox's AI suggestions as they are drawn: the list in its left column
// and the chosen one in its detail pane (inbox-decisions.tsx registers them).

// The suggestions in the inbox's left column, under its AI suggestions tab
// (no heading of their own): those waiting, and, on request, the handled
// ones after them.
export function DecisionList({
  items,
  selectedId,
  onSelect,
  scope,
  onScope,
  error,
  loading,
  handledShown,
  onHandled,
}: {
  items: DecisionItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  scope: 'mine' | 'team';
  onScope: (scope: 'mine' | 'team') => void;
  error: unknown;
  loading: boolean;
  handledShown: boolean;
  onHandled: (show: boolean) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const { nameOf, kindOf, ownerOf } = useWording();
  // Deciding for leads one does not own is for whoever may edit them all.
  const update = meta?.permissions.leads.update;
  const team = update ? update.all === true : false;
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
              {/* The team's view names whose record it is. */}
              {scope === 'team' && ownerOf(entry) ? (
                <span className='truncate'>· {ownerOf(entry)}</span>
              ) : null}
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
                {entry.entity === 'approvals' ? (
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
      {/* Whose: the reader's own or the team's, for whoever may edit every
          lead. */}
      {team ? (
        <div className='flex justify-end px-1 pb-1'>
          <div className='flex rounded-lg border p-0.5'>
            {(['mine', 'team'] as const).map((value) => (
              <Button
                key={value}
                size='xs'
                variant={scope === value ? 'secondary' : 'ghost'}
                onClick={() => onScope(value)}
              >
                {text(value === 'mine' ? 'scopeMine' : 'scopeTeam')}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
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
          {handledShown ? (
            <div className='space-y-1 pt-4'>
              <div className='flex items-center justify-between gap-2 pr-1'>
                {heading(text('decisions.handled'))}
                <button
                  type='button'
                  onClick={() => onHandled(false)}
                  className='text-xs text-muted-foreground transition-colors hover:text-foreground'
                >
                  {text('inbox.hideHandled')}
                </button>
              </div>
              {handled.length ? (
                <ul className='space-y-0.5'>{handled.map(row)}</ul>
              ) : (
                <p className='px-3 py-2 text-sm text-muted-foreground'>
                  {text('inbox.noHandled')}
                </p>
              )}
            </div>
          ) : (
            <button
              type='button'
              onClick={() => onHandled(true)}
              className='px-3 pt-1 text-xs text-muted-foreground transition-colors hover:text-foreground'
            >
              {text('inbox.showHandled')}
            </button>
          )}
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
  const query = useDecisions(scopeOf(params));
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
        kind={wording.kindOf(current)}
        owner={wording.ownerOf(current)}
        when={wording.when}
      />
    </div>
  );
}

// The heading of the detail: the name, then a line of labelled facts led by
// the record's type, set apart from what follows by a rule.
function DetailHeading({
  name,
  kind,
  facts,
  action,
}: {
  name: string;
  kind: string;
  facts: [label: string, value: string][];
  action: ReactElement;
}): ReactElement {
  const { text, language } = useCrmText();
  const colon = language.startsWith('zh') ? '：' : ':';
  return (
    <div className='mb-5 flex items-start justify-between gap-4 border-b pb-4'>
      {/* Takes the width the action leaves, so the facts wrap only when
          that is full, not at the name's width. */}
      <div className='grid min-w-0 flex-1 gap-1'>
        <h2 className='font-heading text-xl leading-tight font-semibold break-words @3xl:truncate'>
          {name}
        </h2>
        {/* Wide, one line of facts; narrow, a row each, labels and values
            in two columns. */}
        <dl className='mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm @3xl:flex @3xl:flex-wrap @3xl:items-center'>
          {/* The record's type leads the line, unlabelled. */}
          <dd className='col-span-2 text-muted-foreground @3xl:col-span-1'>
            {kind}
          </dd>
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div
                key={label}
                className='contents @3xl:flex @3xl:min-w-0 @3xl:items-center @3xl:gap-3'
              >
                {/* Narrow, the facts wrap and a rule would start a line;
                    their labels set them apart. */}
                <span
                  aria-hidden
                  className='hidden h-3 w-px bg-border @3xl:block'
                />
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

// A lead's or a deal's follow-up, or an approval's review, decided here as on
// its record's page, or opened in its timeline, where it is brought into view
// and marked.
function DecisionEntry({
  entry,
  name,
  kind,
  owner,
  when,
  onRevised,
}: {
  entry: DecisionItem;
  onRevised: (entry: EvaluationEntry) => void;
  name: string;
  kind: string;
  owner: string;
  when: (at: string) => string;
}): ReactElement {
  const { text } = useCrmText();
  const refresh = useRefresh();
  const open = (path: string) => (
    <Button
      size='sm'
      variant='outline'
      nativeButton={false}
      render={<Link to={path} />}
    >
      <ArrowUpRight />
      {text('decisions.openRecord')}
    </Button>
  );
  // An approval's review: decided here by its approver.
  if (entry.entity === 'approvals' && entry.approval)
    return (
      <>
        <DetailHeading
          name={name}
          kind={kind}
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
        kind={kind}
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
