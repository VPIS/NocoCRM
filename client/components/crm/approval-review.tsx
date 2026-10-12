import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Spinner } from '../ui/spinner.js';
import { Textarea } from '../ui/textarea.js';
import { ErrorNotice } from './common.js';
import { Row } from './lead-evaluation.js';
import { AiStatusWord } from './ai-status-word.js';
import { aiStateWords } from './ai-state-words.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.js';
import {
  localDate,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
} from './api.js';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';
import { cardPin, recordPin } from './agent-chat/ask.js';
import { DiscussButton } from './agent-chat/discuss-button.js';
import { DEFAULT_TIME_ZONE } from '../../../server/providers/crm/zone-time.js';

// The AI's review of an approval request for its approver
// (server/providers/crm/approval-review.ts): what is asked against the
// standard and what it costs, the deal behind it, the approvals submitted
// with it, earlier requests of its kind, risks and what is missing, and a
// recommendation with the decision comment drafted. The approver approves
// or rejects on the card with the comment as they leave it; the AI never
// decides. On the approval's timeline and in the approver's Waiting on me.

export interface ApprovalReview {
  recommendation: 'approve' | 'conditional' | 'reject' | 'needMore';
  summary: string;
  asked: string;
  reasons: string[];
  together: string | null;
  precedents: string;
  risks: string[];
  missing: string[];
  conditions: string | null;
  comment: string;
}
export interface ReviewEntry {
  id: string;
  recordId: string;
  status:
    'running' | 'pending' | 'accepted' | 'dismissed' | 'failed' | 'superseded';
  createdAt: string;
  ai: {
    result?: ApprovalReview;
    error?: string;
    decidedById?: string;
    decidedAt?: string;
    decision?: 'approve' | 'reject';
    comment?: string;
    // Redone on the approver's word: the review replaced and what they said.
    revises?: string;
    instruction?: string;
    instructedById?: string;
    startedAt?: string;
    // Voided because the approval left the queue without it: withdrawn,
    // or decided on the approval itself; by whom and when.
    approvalOutcome?: 'withdrawn' | 'approved' | 'rejected';
    retiredAt?: string;
    retiredById?: string;
  };
}

export function ReviewPanel({
  entry,
  approvalId,
  approvalName,
  onChanged,
  onRevised,
  inFeed = false,
}: {
  entry: ReviewEntry;
  approvalId: string;
  approvalName: string;
  onChanged: () => Promise<unknown>;
  // The review that replaces this one, redone on the approver's word.
  onRevised?: (entry: ReviewEntry) => void;
  // Opened from its line in the approval's timeline, which already names
  // it and its recommendation: the card leaves its own heading out, as a
  // follow-up's card does there.
  inFeed?: boolean;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const review = entry.ai.result;
  const [comment, setComment] = useState(review?.comment ?? '');
  const [busy, setBusy] = useState<
    'approve' | 'reject' | 'dismiss' | 'revise'
  >();
  // What the approver wants changed, for the AI to redo the review.
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState<unknown>();
  const { data: approval } = useCrmQuery<{ record: Record<string, unknown> }>(
    `approvals/${approvalId}`,
  );
  if (!meta) return null;
  const approver = toText(approval?.record.approverId);
  // The approver's to decide, while the review and the approval wait.
  const deciding =
    entry.status === 'pending' &&
    approver === meta.userId &&
    approval?.record.status === 'pending';
  const decide = (decision: 'approve' | 'reject' | 'dismiss'): void => {
    setBusy(decision);
    setError(undefined);
    api(`approvals/${approvalId}/reviews/${entry.id}/decide`, 'POST', {
      decision,
      comment,
    })
      .then(() => onChanged())
      .catch(setError)
      .finally(() => setBusy(undefined));
  };
  const revise = (): void => {
    setBusy('revise');
    setError(undefined);
    api<{ data: ReviewEntry }>(`approvals/${approvalId}/review`, 'POST', {
      revise: entry.id,
      instruction: instruction.trim(),
    })
      .then(async (result) => {
        setInstruction('');
        onRevised?.(result.data);
        await onChanged();
      })
      .catch(setError)
      .finally(() => setBusy(undefined));
  };
  // Accepting carries out what the review recommends, as a follow-up
  // card's accept does: an approval (on conditions too) or a rejection
  // (asking for more is a rejection saying what to add), with the comment
  // drafted for it. Disagreeing is dismissing the review and deciding on
  // the approval itself.
  const leans =
    review?.recommendation === 'approve' ||
    review?.recommendation === 'conditional'
      ? 'approve'
      : 'reject';
  const decidedStatus =
    entry.status === 'accepted'
      ? text(`approvalReview.statuses.${entry.ai.decision ?? 'approve'}`)
      : entry.status === 'dismissed'
        ? text('evaluation.statuses.dismissed')
        : null;
  const list = (items: string[]) =>
    items.length ? (
      <ul className='list-disc space-y-0.5 pl-5'>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : null;
  return (
    <section
      // On the card's own white, waiting or decided, as every AI card.
      className={`@container grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-border p-4 text-sm shadow-xs [&_:is(input,textarea,[role=combobox]):focus-visible]:border-ring/50! [&_:is(input,textarea,[role=combobox]):focus-visible]:ring-2! [&_:is(input,textarea,[role=combobox]):focus-visible]:ring-ring/10! bg-card`}
    >
      {/* The heading, and who decided it or what became of it; in the
          timeline, whose line names it, only the latter, and nothing while
          it waits, the card then opening on its conclusion. */}
      <div className='flex flex-wrap items-center gap-2 empty:hidden'>
        {inFeed ? null : (
          <>
            <Sparkles className='size-4 shrink-0 text-ai' />
            <span className='shrink-0 font-medium'>
              {text('approvalReview.title')}
            </span>
            {review && (
              <Badge variant={entry.status === 'pending' ? 'ai' : 'muted'}>
                {text(
                  `approvalReview.recommendations.${review.recommendation}`,
                )}
              </Badge>
            )}
          </>
        )}
        {decidedStatus && (
          <span className='text-xs text-muted-foreground'>
            {text('evaluation.decidedBy', {
              status: decidedStatus,
              name:
                meta.users.find((u) => u.id === entry.ai.decidedById)?.name ??
                '',
              time: localDate(
                entry.ai.decidedAt,
                language,
                meta.settings.timeZone,
              ),
            })}
          </span>
        )}
        {entry.status === 'superseded' && (
          <span className='text-xs text-muted-foreground'>
            {entry.ai.approvalOutcome
              ? text(`approvalReview.retired.${entry.ai.approvalOutcome}`, {
                  name:
                    meta.users.find((u) => u.id === entry.ai.retiredById)
                      ?.name ?? '',
                  time: localDate(
                    entry.ai.retiredAt,
                    language,
                    meta.settings.timeZone,
                  ),
                })
              : text('approvalReview.superseded')}
          </span>
        )}
      </div>
      {/* A review redone on the approver's word says whose and what. */}
      {entry.ai.instruction && (
        <p className='text-muted-foreground'>
          {text('evaluation.instructionBy', {
            name:
              meta.users.find((u) => u.id === entry.ai.instructedById)?.name ??
              '',
            text: entry.ai.instruction,
          })}
        </p>
      )}
      {entry.status === 'running' && (
        <p className='flex items-center gap-2 text-muted-foreground'>
          <Spinner />
          {text(
            entry.ai.instruction
              ? 'evaluation.revising'
              : 'approvalReview.running',
          )}
        </p>
      )}
      {entry.status === 'failed' && (
        <p className='text-muted-foreground'>{text('approvalReview.failed')}</p>
      )}
      {/* The conclusion leads as a sentence, as on the follow-up's card. */}
      {review && (
        <p className='leading-relaxed font-medium text-foreground'>
          {review.summary}
        </p>
      )}
      {review && (
        <dl className='grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2'>
          <Row label={text('approvalReview.asked')}>{review.asked}</Row>
          {review.conditions && (
            <Row label={text('approvalReview.conditions')}>
              {review.conditions}
            </Row>
          )}
          {review.risks.length > 0 && (
            <Row label={text('approvalReview.risks')}>{list(review.risks)}</Row>
          )}
          {review.reasons.length > 0 && (
            <Row label={text('approvalReview.reasons')}>
              {list(review.reasons)}
            </Row>
          )}
          {review.together && (
            <Row label={text('approvalReview.together')}>{review.together}</Row>
          )}
          <Row label={text('approvalReview.precedents')}>
            {review.precedents}
          </Row>
          {review.missing.length > 0 && (
            <Row label={text('approvalReview.missing')}>
              {list(review.missing)}
            </Row>
          )}
          {/* The comment sent with the decision: the AI's draft while the
              approver decides, then what was sent. */}
          {deciding ? (
            <Row label={text('approvalReview.comment')}>
              <Textarea
                value={comment}
                maxLength={LONG_TEXT_LIMIT}
                rows={2}
                className='min-h-0 bg-background'
                onChange={(e) => setComment(e.target.value)}
              />
            </Row>
          ) : entry.ai.comment ? (
            <Row label={text('approvalReview.comment')}>{entry.ai.comment}</Row>
          ) : null}
        </dl>
      )}
      <ErrorNotice error={error} />
      {/* Everything to do with it, at the card's foot as on a follow-up's
          card: redoing it in a sentence; then talking it over at the left
          and, at the right, setting it aside or doing what it advises,
          whose hover says what that is. */}
      {entry.status === 'pending' && review && (
        <div className='grid gap-3 border-t border-border pt-3'>
          {deciding && (
            <form
              className='flex min-w-0 items-end gap-2'
              onSubmit={(event) => {
                event.preventDefault();
                if (instruction.trim()) revise();
              }}
            >
              <Textarea
                value={instruction}
                maxLength={1000}
                rows={1}
                placeholder={toText(text('approvalReview.revisePlaceholder'))}
                aria-label={toText(text('evaluation.revise'))}
                disabled={Boolean(busy)}
                onChange={(event) => setInstruction(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    if (instruction.trim()) revise();
                  }
                }}
                // One line as tall as a small button, growing with more.
                className='max-h-40 min-h-7 resize-none bg-background py-[calc((var(--spacing)*7-1lh-2px)/2)]'
              />
              <Button
                type='submit'
                size='sm'
                className='shrink-0 bg-ai text-ai-foreground hover:bg-ai/90'
                disabled={Boolean(busy) || !instruction.trim()}
              >
                {busy === 'revise' ? <Spinner /> : <Sparkles />}
                {text(
                  busy === 'revise'
                    ? 'evaluation.adjusting'
                    : 'evaluation.revise',
                )}
              </Button>
            </form>
          )}
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <span className='mr-auto flex items-center gap-1'>
              <DiscussButton
                pins={[
                  recordPin('approvals', approvalId, approvalName),
                  cardPin(
                    entry.id,
                    `${text('approvalReview.title')} · ${text(
                      `approvalReview.recommendations.${review.recommendation}`,
                    )}`,
                  ),
                ]}
              />
            </span>
            {deciding && (
              <>
                {/* The review set aside: the approval still waits for the
                    approver, on its own page. */}
                <Button
                  size='sm'
                  variant='ghost'
                  disabled={Boolean(busy)}
                  onClick={() => decide('dismiss')}
                >
                  {busy === 'dismiss' ? <Spinner /> : <X />}
                  {text('evaluation.dismiss')}
                </Button>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size='sm'
                        className='bg-ai text-ai-foreground hover:bg-ai/90'
                        disabled={Boolean(busy)}
                        onClick={() => decide(leans)}
                      />
                    }
                  >
                    {busy === leans ? <Spinner /> : <Check />}
                    {text(`approvalReview.accept.${leans}`)}
                  </TooltipTrigger>
                  <TooltipContent className='max-w-80 flex-col items-start gap-1'>
                    <p className='font-medium'>
                      {text('approvalReview.will.title')}
                    </p>
                    <ul className='list-disc space-y-0.5 pl-4'>
                      <li>{text(`approvalReview.will.${leans}`)}</li>
                      <li>{text('evaluation.will.mark')}</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// A review on the approval's timeline, in its line: where it stands, as a
// follow-up's line shows its status (what it recommends is on the card):
// waiting, approved or rejected on it, dismissed, or voided by the approval
// leaving the queue; who decided it and when on hover.
export function ReviewFeedEntry({
  entry,
}: {
  entry: { aiStatus?: unknown; ai?: unknown };
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const ai = (entry.ai ?? {}) as ReviewEntry['ai'];
  const status = toText(entry.aiStatus);
  if (!ai.result) return null;
  const words =
    status === 'accepted'
      ? text(`approvalReview.statuses.${ai.decision ?? 'approve'}`)
      : status === 'superseded' && ai.approvalOutcome
        ? ai.approvalOutcome === 'withdrawn'
          ? text('options.withdrawn')
          : text(
              `approvalReview.statuses.${ai.approvalOutcome === 'rejected' ? 'reject' : 'approve'}`,
            )
        : text(`evaluation.statuses.${status}`);
  return (
    <Badge
      variant={
        status === 'pending'
          ? 'ai'
          : status === 'accepted'
            ? 'success'
            : 'muted'
      }
      title={
        (status === 'accepted' || status === 'dismissed') && ai.decidedAt
          ? `${meta?.users.find((u) => u.id === ai.decidedById)?.name ?? ''} · ${localDate(ai.decidedAt, language, meta?.settings.timeZone ?? DEFAULT_TIME_ZONE)}`
          : undefined
      }
    >
      {words}
    </Badge>
  );
}

// Where the latest review of an approval stands, ending in the way to ask
// for another (the approver's, while the approval waits), for the
// approval's page.
export function ReviewStatus({
  approvalId,
  onOpen,
  wide = false,
}: {
  approvalId: string;
  onOpen: (entryId: string) => void;
  // Across its row, as atop an approval's particulars.
  wide?: boolean;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const { data: entry } = useCrmQuery<ReviewEntry | null>(
    `approvals/${approvalId}/reviews/latest`,
    Boolean(meta?.assistant),
    { refetchInterval: (data) => (data?.status === 'running' ? 4000 : false) },
  );
  const { data: approval } = useCrmQuery<{ record: Record<string, unknown> }>(
    `approvals/${approvalId}`,
  );
  const lastStatusRef = useRef(entry?.status);
  useEffect(() => {
    if (lastStatusRef.current === 'running' && entry?.status !== 'running')
      void refresh();
    lastStatusRef.current = entry?.status;
  }, [entry?.status, refresh]);
  if (!meta?.assistant) return null;
  const record = approval?.record;
  // The review is the approver's alone (the server returns none to anyone
  // else), and so is asking for one.
  const mayAsk =
    record?.status === 'pending' && record.approverId === meta.userId;
  const review = entry?.ai.result;
  const ask = (): void => {
    setBusy(true);
    setError(undefined);
    api(`approvals/${approvalId}/review`, 'POST', {})
      .then(() => refresh())
      .catch(setError)
      .finally(() => setBusy(false));
  };
  // On the AI's tint whatever it stands at, its dot saying where; at work,
  // the AI's state tag's words, as on a list's row (ai-state-tag.tsx).
  const live = entry?.status === 'running';
  const again = mayAsk && entry?.status !== 'running';
  // Nothing to show (no review, and not the approver's to ask for one):
  // no empty box to push the row's buttons aside.
  if (!entry && !mayAsk && !error) return null;
  // Where it stands, in the timeline's words.
  const standing =
    entry?.status === 'running'
      ? text('approvalReview.working')
      : entry?.status === 'superseded'
        ? text('approvalReview.superseded')
        : text(`evaluation.statuses.${toText(entry?.status)}`);
  return (
    <div className='flex flex-wrap items-center gap-1'>
      {/* As a lead's and a deal's suggestion read (EvaluationStatus): the
          AI's mark, the recommendation and where it stands on one line,
          then asking again; before the first review, a button asks. */}
      {entry ? (
        <div
          className={`${wide ? 'flex min-w-0 flex-1' : 'inline-flex max-w-full'} h-7 items-center rounded-lg border text-sm border-transparent bg-ai/10 dark:bg-ai/20 ${live ? 'text-ai' : ''}`}
        >
          {/* Only whose it is and where it stands; its hover says what it
              recommends, why, and where it stands in words. */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type='button'
                  onClick={() => onOpen(entry.id)}
                  aria-label={[
                    text('approvalReview.ask'),
                    review
                      ? text(
                          `approvalReview.recommendations.${review.recommendation}`,
                        )
                      : '',
                    standing,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  className={`flex h-full min-w-0 items-center gap-1.5 rounded-l-lg px-2 transition-colors ${
                    again ? '' : 'rounded-r-lg'
                  } hover:bg-ai/15 ${wide ? 'flex-1' : ''}`}
                />
              }
            >
              {entry.status === 'running' ? (
                <Spinner className='size-3.5 text-ai' />
              ) : (
                <Sparkles className='size-3.5 text-ai' />
              )}
              <span className='min-w-0 truncate font-medium'>
                {text(
                  live ? aiStateWords.review.running : 'approvalReview.ask',
                )}
              </span>
              {live ? null : <AiStatusWord status={toText(entry.status)} />}
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              align='start'
              className='max-w-80 flex-col items-start gap-1'
            >
              {review ? (
                <p className='font-medium'>
                  {text(
                    `approvalReview.recommendations.${review.recommendation}`,
                  )}
                </p>
              ) : null}
              {review?.summary ? (
                <p className='line-clamp-3 opacity-90'>{review.summary}</p>
              ) : null}
              {/* Where it stands, and what a click does, on one line. */}
              <p className='opacity-80'>
                {standing}
                {language.startsWith('zh') ? '，' : ' · '}
                {text('evaluation.chipHint')}
              </p>
            </TooltipContent>
          </Tooltip>
          {again ? (
            <>
              <span aria-hidden className='h-3.5 w-px shrink-0 bg-border' />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type='button'
                      disabled={busy}
                      onClick={ask}
                      aria-label={toText(text('approvalReview.again'))}
                      className='flex h-full shrink-0 items-center gap-1 rounded-r-lg px-2 font-medium text-ai transition-colors hover:bg-ai/10 disabled:opacity-50'
                    />
                  }
                >
                  {busy ? <Spinner className='size-3.5' /> : null}
                  {text('evaluation.rerun')}
                </TooltipTrigger>
                <TooltipContent side='bottom'>
                  {text('approvalReview.again')}
                </TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </div>
      ) : mayAsk ? (
        // Shaped as a lead's first follow-up button (EvaluateButton), and
        // as the chip it gives way to: on the AI's tint, led by its mark.
        <button
          type='button'
          className='inline-flex h-7 items-center gap-1.5 rounded-lg bg-ai/10 px-2.5 font-sans text-sm font-medium tracking-normal text-ai transition-colors hover:bg-ai/15 disabled:opacity-60 dark:bg-ai/20'
          disabled={busy}
          onClick={ask}
        >
          {busy ? (
            <Spinner className='size-3.5' />
          ) : (
            <Sparkles className='size-3.5' />
          )}
          {text('approvalReview.ask')}
        </button>
      ) : null}
      <ErrorNotice error={error} />
    </div>
  );
}
