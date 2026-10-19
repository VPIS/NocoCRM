import { useEffect, useRef, useState, type ReactElement } from 'react';
import { AiFailure } from './ai-failure.js';
import { Check, Sparkles, X, Zap } from 'lucide-react';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Spinner } from '../ui/spinner.js';
import { Textarea } from '../ui/textarea.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.js';
import { ErrorNotice } from './common.js';
import { Row } from './lead-evaluation.js';
import { AiStatusWord } from './ai-status-word.js';
import { aiStateWords } from './ai-state-words.js';
import { doesTask } from '../../../server/providers/crm/task-participants.js';
import {
  localDate,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
} from './api.js';
import { useAgentWords } from './work-agent-name.js';
import { AgentWords } from './work-agent.js';
import { cardPin, recordPin } from './agent-chat/ask.js';
import { DiscussButton } from './agent-chat/discuss-button.js';
import { DEFAULT_TIME_ZONE } from '../../../server/providers/crm/zone-time.js';

// The AI's preparation of a task for its owner
// (server/providers/crm/task-preparation.ts): what the task should achieve,
// where things stand, who is on the other side, recent news about the
// company, the questions to ask, what to bring, the risks and the points to
// cover. It changes nothing; whoever may edit the task may write its points
// into the task's description. On the task's timeline, for the people doing
// the task alone: its owner and its participants.

export interface TaskPreparation {
  summary: string;
  brief: string;
  people: { name: string; note: string }[];
  company: string | null;
  questions: string[];
  bring: string[];
  risks: string[];
  agenda: string[];
}
export interface PrepEntry {
  id: string;
  recordId: string;
  status:
    'running' | 'pending' | 'accepted' | 'dismissed' | 'failed' | 'superseded';
  createdAt: string;
  ai: {
    result?: TaskPreparation;
    error?: string;
    trigger?: string;
    decidedById?: string;
    decidedAt?: string;
    revises?: string;
    instruction?: string;
    instructedById?: string;
    startedAt?: string;
  };
}

export function PrepPanel({
  entry,
  task,
  onChanged,
  inFeed = false,
}: {
  entry: PrepEntry;
  task: CrmRecord;
  onChanged: () => Promise<unknown>;
  // Opened from its line in the task's timeline, which already names it:
  // the card leaves its own heading out, as a follow-up's card does there.
  inFeed?: boolean;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const words = useAgentWords();
  const api = useCrmApi();
  const prep = entry.ai.result;
  const [busy, setBusy] = useState<'accept' | 'dismiss' | 'revise'>();
  const [instruction, setInstruction] = useState('');
  const [error, setError] = useState<unknown>();
  if (!meta) return null;
  const taskId = toText(task.id);
  // The task's people's to act on, while it waits and the task is open;
  // writing it in also needs the right to edit the task, which the server
  // checks.
  const deciding =
    entry.status === 'pending' &&
    doesTask(task, meta.userId) &&
    task.status === 'open';
  const decide = (decision: 'accept' | 'dismiss'): void => {
    setBusy(decision);
    setError(undefined);
    api(`tasks/${taskId}/preparations/${entry.id}/decide`, 'POST', {
      decision,
    })
      .then(() => onChanged())
      .catch(setError)
      .finally(() => setBusy(undefined));
  };
  const revise = (): void => {
    setBusy('revise');
    setError(undefined);
    api(`tasks/${taskId}/prepare`, 'POST', {
      revise: entry.id,
      instruction: instruction.trim(),
    })
      .then(async () => {
        setInstruction('');
        await onChanged();
      })
      .catch(setError)
      .finally(() => setBusy(undefined));
  };
  const nameOf = (id: unknown): string =>
    meta.users.find((u) => u.id === toText(id))?.name ?? '';
  const list = (items: string[], ordered = false) => {
    if (!items.length) return null;
    const Tag = ordered ? 'ol' : 'ul';
    return (
      <Tag
        className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-0.5 pl-5`}
      >
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Tag>
    );
  };
  // What writing it into the task does, on the button's hover.
  const willDo = prep
    ? [
        prep.agenda.length || prep.bring.length
          ? text('taskPrep.will.prep')
          : null,
        prep.questions.length ? text('taskPrep.will.questions') : null,
        text('taskPrep.will.keep'),
        text('evaluation.will.mark'),
      ].filter((step): step is string => Boolean(step))
    : [];
  return (
    <section
      // On the card's own white, waiting or decided.
      className={`@container grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-border p-4 text-sm shadow-xs [&_:is(input,textarea):focus-visible]:border-ring/50! [&_:is(input,textarea):focus-visible]:ring-2! [&_:is(input,textarea):focus-visible]:ring-ring/20! bg-card`}
    >
      {/* The heading and who decided it; in the timeline, whose line names
          it, what started it instead, the card otherwise opening on its
          conclusion. */}
      <div className='flex flex-wrap items-center gap-2 empty:hidden'>
        {inFeed ? (
          entry.ai.trigger ? (
            <span className='flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground'>
              <Zap aria-hidden className='size-3 shrink-0' />
              {text(`taskPrep.trigger.${entry.ai.trigger}`, {
                defaultValue: '',
              })}
            </span>
          ) : null
        ) : (
          <>
            <Sparkles className='size-4 shrink-0 text-primary' />
            <span className='shrink-0 font-medium'>
              <AgentWords
                work='tasks'
                wordKey='preparation'
                fallback='taskPrep.ask'
              />
            </span>
          </>
        )}
        {(entry.status === 'accepted' || entry.status === 'dismissed') && (
          <span className='text-xs text-muted-foreground'>
            {text('evaluation.decidedBy', {
              status: text(
                entry.status === 'accepted'
                  ? 'taskPrep.written'
                  : 'evaluation.statuses.dismissed',
              ),
              name: nameOf(entry.ai.decidedById),
              time: localDate(
                entry.ai.decidedAt,
                language,
                meta.settings.timeZone,
              ),
            })}
          </span>
        )}
      </div>
      {entry.ai.instruction && (
        <p className='text-muted-foreground'>
          {text('evaluation.instructionBy', {
            name: nameOf(entry.ai.instructedById),
            text: entry.ai.instruction,
          })}
        </p>
      )}
      {entry.status === 'running' && (
        <p className='flex items-center gap-2 text-muted-foreground'>
          <Spinner />
          {!entry.ai.startedAt ? (
            text('evaluation.queued')
          ) : entry.ai.instruction ? (
            text('evaluation.revising')
          ) : (
            <AgentWords
              work='tasks'
              wordKey='running.prep'
              fallback='taskPrep.running'
            />
          )}
        </p>
      )}
      {entry.status === 'failed' && (
        <AiFailure
          message={toText(text('taskPrep.failed'))}
          error={entry.ai.error}
        />
      )}
      {/* What it is for leads as a sentence, then where things stand. */}
      {prep && (
        <p className='leading-relaxed font-medium text-foreground'>
          {prep.summary}
        </p>
      )}
      {prep?.brief ? (
        <p className='leading-relaxed text-foreground/90'>{prep.brief}</p>
      ) : null}
      {prep && (
        <dl className='grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2'>
          {prep.agenda.length > 0 && (
            <Row label={text('taskPrep.agenda')}>{list(prep.agenda, true)}</Row>
          )}
          {prep.questions.length > 0 && (
            <Row label={text('taskPrep.questions')}>{list(prep.questions)}</Row>
          )}
          {prep.people.length > 0 && (
            <Row label={text('taskPrep.people')}>
              <ul className='space-y-0.5'>
                {prep.people.map((person) => (
                  <li key={person.name}>
                    <span className='font-medium'>{person.name}</span>
                    {person.note ? (
                      <span className='text-muted-foreground'>
                        {language.startsWith('zh') ? '：' : ': '}
                        {person.note}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Row>
          )}
          {prep.bring.length > 0 && (
            <Row label={text('taskPrep.bring')}>{list(prep.bring)}</Row>
          )}
          {prep.risks.length > 0 && (
            <Row label={text('taskPrep.risks')}>{list(prep.risks)}</Row>
          )}
          {prep.company ? (
            <Row label={text('taskPrep.company')}>
              <span className='break-words whitespace-pre-line'>
                {prep.company}
              </span>
            </Row>
          ) : null}
        </dl>
      )}
      <ErrorNotice error={error} />
      {/* Everything to do with it, at the card's foot as on a follow-up's
          card: redoing it in a sentence; then talking it over at the left
          and, at the right, setting it aside or writing it into the task,
          whose hover says what that does. */}
      {entry.status === 'pending' && prep && (
        <div className='grid gap-3 border-t border-border pt-3'>
          {deciding && meta.assistant && (
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
                placeholder={toText(text('taskPrep.revisePlaceholder'))}
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
                className='max-h-40 min-h-7 resize-none bg-background py-[calc((var(--spacing)*7-1lh-2px)/2)]'
              />
              <Button
                type='submit'
                size='sm'
                className='shrink-0 bg-primary text-primary-foreground hover:bg-primary/90'
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
                  recordPin('tasks', taskId, toText(task.name)),
                  cardPin(
                    entry.id,
                    `${words('tasks', 'preparation', 'taskPrep.ask')} · ${toText(task.name)}`,
                  ),
                ]}
              />
            </span>
            {deciding && (
              <>
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
                        className='bg-primary text-primary-foreground hover:bg-primary/90'
                        disabled={Boolean(busy)}
                        onClick={() => decide('accept')}
                      />
                    }
                  >
                    {busy === 'accept' ? <Spinner /> : <Check />}
                    {text('taskPrep.accept')}
                  </TooltipTrigger>
                  <TooltipContent className='max-w-80 flex-col items-start gap-1'>
                    <p className='font-medium'>{text('taskPrep.will.title')}</p>
                    <ul className='list-disc space-y-0.5 pl-4'>
                      {willDo.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
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

// Atop a task's particulars, for its owner and participants: the newest
// preparation on one
// chip, as a lead's follow-up reads (EvaluationStatus), opening it in the
// timeline, then asking again; before the first, a button that asks.
export function PrepStatus({
  task,
  onOpen,
}: {
  task: CrmRecord;
  onOpen: (entryId: string) => void;
}): ReactElement | null {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const words = useAgentWords();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const taskId = toText(task.id);
  const mine = Boolean(meta && doesTask(task, meta.userId));
  const { data: entry } = useCrmQuery<PrepEntry | null>(
    `tasks/${taskId}/preparations/latest`,
    mine,
    { refetchInterval: (data) => (data?.status === 'running' ? 4000 : false) },
  );
  const lastStatusRef = useRef(entry?.status);
  useEffect(() => {
    if (lastStatusRef.current === 'running' && entry?.status !== 'running')
      void refresh();
    lastStatusRef.current = entry?.status;
  }, [entry?.status, refresh]);
  if (!meta || !mine) return null;
  // Only an open task with a record to prepare from is theirs to ask
  // about, and only while there is a model to ask.
  const mayAsk =
    meta.assistant === true &&
    task.status === 'open' &&
    Boolean(task.leadId || task.companyId || task.opportunityId);
  if (!entry && !mayAsk && !error) return null;
  const ask = (): void => {
    setBusy(true);
    setError(undefined);
    api(`tasks/${taskId}/prepare`, 'POST', {})
      .then(() => refresh())
      .catch(setError)
      .finally(() => setBusy(false));
  };
  // On the AI's tint whatever it stands at, its dot saying where; at work,
  // the AI's state tag's words, as on a list's row (ai-state-tag.tsx).
  const live = entry?.status === 'running';
  const again = mayAsk && entry?.status !== 'running';
  const standing =
    entry?.status === 'running'
      ? text('taskPrep.working')
      : entry?.status === 'accepted'
        ? text('taskPrep.written')
        : text(`evaluation.statuses.${toText(entry?.status)}`);
  const prep = entry?.ai.result;
  return (
    <div className='flex flex-wrap items-center gap-1'>
      {entry ? (
        <div
          className={`inline-flex h-7 max-w-full items-center rounded-lg border text-sm border-transparent bg-primary/10 dark:bg-primary/20 ${live ? 'text-primary' : ''}`}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type='button'
                  onClick={() => onOpen(entry.id)}
                  aria-label={[words('tasks', 'name', 'taskPrep.ask'), standing]
                    .filter(Boolean)
                    .join(' · ')}
                  className={`flex h-full min-w-0 items-center gap-1.5 rounded-l-lg px-2 transition-colors ${
                    again ? '' : 'rounded-r-lg'
                  } hover:bg-primary/15`}
                />
              }
            >
              {entry.status === 'running' ? (
                <Spinner className='size-3.5 text-primary' />
              ) : (
                <Sparkles className='size-3.5 text-primary' />
              )}
              <span className='min-w-0 truncate font-medium text-primary'>
                {live ? (
                  text(aiStateWords.prep.running)
                ) : (
                  <AgentWords
                    inButton
                    work='tasks'
                    wordKey='name'
                    fallback='taskPrep.ask'
                  />
                )}
              </span>
              {live ? null : <AiStatusWord status={toText(entry.status)} />}
            </TooltipTrigger>
            <TooltipContent
              side='bottom'
              align='start'
              className='max-w-80 flex-col items-start gap-1'
            >
              {prep?.summary ? (
                <p className='line-clamp-3 font-medium'>{prep.summary}</p>
              ) : null}
              <p className='opacity-80'>
                {standing}
                {language.startsWith('zh') ? '，' : ' · '}
                {text('evaluation.chipHint')}
              </p>
            </TooltipContent>
          </Tooltip>
          {again ? (
            <>
              <span aria-hidden className='h-3.5 w-px shrink-0 bg-primary/20' />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type='button'
                      disabled={busy}
                      onClick={ask}
                      aria-label={words('tasks', 'rerun', 'taskPrep.again')}
                      className='flex h-full shrink-0 items-center gap-1 rounded-r-lg px-2 font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50'
                    />
                  }
                >
                  {busy ? <Spinner className='size-3.5' /> : null}
                  {text('evaluation.rerun')}
                </TooltipTrigger>
                <TooltipContent side='bottom'>
                  <AgentWords
                    inButton
                    work='tasks'
                    wordKey='rerun'
                    fallback='taskPrep.again'
                  />
                </TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </div>
      ) : (
        // Shaped as a lead's first follow-up button (EvaluateButton).
        <button
          type='button'
          className='inline-flex h-7 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 font-sans text-sm font-medium tracking-normal text-primary transition-colors hover:bg-primary/15 disabled:opacity-60 dark:bg-primary/20'
          disabled={busy}
          onClick={ask}
        >
          {busy ? (
            <Spinner className='size-3.5' />
          ) : (
            <Sparkles className='size-3.5' />
          )}
          <AgentWords
            inButton
            work='tasks'
            wordKey='run'
            fallback='taskPrep.ask'
          />
        </button>
      )}
      <ErrorNotice error={error} />
    </div>
  );
}

// A preparation's line on the task's timeline: where it stands, as a
// follow-up's line shows its status, who decided it and when on hover.
export function PrepFeedEntry({
  entry,
}: {
  entry: { aiStatus?: unknown; ai?: unknown };
}): ReactElement {
  const { data: meta } = useMetadata();
  const { text, language } = useCrmText();
  const ai = (entry.ai ?? {}) as PrepEntry['ai'];
  const status = toText(entry.aiStatus);
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
      {text(
        status === 'accepted'
          ? 'taskPrep.written'
          : `evaluation.statuses.${status}`,
      )}
    </Badge>
  );
}
