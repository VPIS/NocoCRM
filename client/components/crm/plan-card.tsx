import { Badge } from '#components/ui/badge';
import { Button } from '#components/ui/button';
import { Checkbox } from '#components/ui/checkbox';
import { Spinner } from '#components/ui/spinner';
import { useChatPanel } from '@nocobase/app-plugin-agents/client/chat';
import {
  ArrowRight,
  Check,
  ClipboardList,
  MessagesSquare,
  X,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  fieldLabelKey,
  relativeTime,
  toText,
  useCrmText,
  useMetadata,
  type CrmRecord,
  type Entity,
  type Field,
} from './api.js';
import { ErrorNotice, RecordLink, Value } from './common.js';
import { InlineField } from './inline.js';
import { Markdown } from './markdown.js';
import { usePlanDecision, usePlans, type PlanView } from './plans.js';

// A plan an agent proposed, as its decision card (NocoSolution frontend
// standard §S4.5): what it changes, step by step, and the one choice it asks
// for — carry it out, leaving steps out if need be, or void it. The same
// card in the agent's conversation, the inbox and a record's page.

type Step = PlanView['steps'][number];

const TONES: Record<
  PlanView['status'],
  'ai' | 'success' | 'destructive' | 'muted' | 'info'
> = {
  pending: 'ai',
  executing: 'info',
  executed: 'success',
  failed: 'destructive',
  stale: 'destructive',
  voided: 'muted',
  expired: 'muted',
};

export function PlanCard({
  plan,
  origin = true,
}: {
  plan: PlanView;
  // Whether to link the conversation it came from (not inside it).
  origin?: boolean;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const { decide, revise, busy, error, gone } = usePlanDecision(plan);
  // The conversation it came from opens in the assistant panel.
  const chat = useChatPanel();
  const [skipped, setSkipped] = useState<Set<number>>(() => new Set());
  // Once decided here, focus goes to what came of it, the buttons being gone.
  const outcomeRef = useRef<HTMLParagraphElement>(null);
  const [decidedHere, setDecidedHere] = useState(false);
  useEffect(() => {
    if (decidedHere && (plan.status !== 'pending' || gone))
      outcomeRef.current?.focus();
  }, [decidedHere, plan.status, gone]);
  const run = (decision: 'execute' | 'void'): void => {
    setDecidedHere(true);
    void decide(decision, decision === 'execute' ? [...skipped] : []);
  };
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const waiting = plan.status === 'pending' && !gone;
  const kept = plan.steps.length - skipped.size;
  const nameOf = (id: string | null): string =>
    toText(meta?.users.find((user) => user.id === id)?.name ?? '');
  // The field a refused step names, by its label on that step's record.
  const failedField = (field: string): string => {
    const failed = plan.steps.find(
      (step) => step.position === Number(plan.failure?.position),
    );
    const name = field.replace(/^values\./u, '');
    return failed?.check
      ? text(fieldLabelKey(failed.check.entity, name), { defaultValue: name })
      : name;
  };
  const hoursLeft = Math.max(
    1,
    Math.ceil((Date.parse(plan.expiresAt) - now) / 3_600_000),
  );
  return (
    // Drawn as the assistant's confirmation cards were: tinted in the AI's
    // colour while it waits on a decision (in the plain border), neutral once decided; each step
    // a card of its own with its fields in a label column, and the decision
    // under them, the AI's colour on the button that carries it out.
    <section
      aria-label={plan.title}
      className={`rounded-lg border p-4 ${
        waiting ? 'border-border bg-ai/5' : 'border-border bg-card shadow-xs'
      }`}
    >
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
        <ClipboardList className='size-3.5' aria-hidden />
        <span>
          {text('plans.meta', {
            agent: plan.agentName ?? text('plans.agent'),
            time: relativeTime(plan.createdAt, language, now, text('justNow')),
          })}
        </span>
        {origin && plan.conversationId ? (
          <button
            type='button'
            onClick={() =>
              chat.openChat({
                conversationId: plan.conversationId,
                view: 'chat',
              })
            }
            className='inline-flex items-center gap-1 hover:text-primary hover:underline'
          >
            <MessagesSquare className='size-3.5' aria-hidden />
            {text('plans.fromConversation')}
          </button>
        ) : null}
        <Badge variant={TONES[plan.status]} className='ml-auto'>
          {text(`plans.status.${plan.status}`)}
        </Badge>
      </div>
      <h3 className='mt-2 text-sm font-medium break-words'>{plan.title}</h3>
      {plan.summary ? (
        <Markdown compact className='mt-1 text-sm text-muted-foreground'>
          {plan.summary}
        </Markdown>
      ) : null}
      <ol className='mt-3 flex flex-col gap-2'>
        {plan.steps.map((step) => (
          <PlanStep
            key={step.id}
            step={step}
            // A waiting plan's values are the person's to change before
            // deciding, as the confirmation cards' were.
            onRevise={
              waiting && !busy
                ? async (values) => {
                    await revise(step.position, values);
                  }
                : undefined
            }
            selectable={waiting && plan.steps.length > 1}
            kept={!skipped.has(step.position)}
            onKept={(on) =>
              setSkipped((current) => {
                const next = new Set(current);
                if (on) next.delete(step.position);
                else next.add(step.position);
                return next;
              })
            }
          />
        ))}
      </ol>
      {error ? (
        <div className='mt-3'>
          <ErrorNotice error={error} />
        </div>
      ) : null}
      {waiting ? (
        <div className='mt-3 flex flex-wrap items-center justify-between gap-3'>
          <span className='text-xs text-muted-foreground'>
            {text('plans.expiresIn', { count: hoursLeft })}
          </span>
          <div className='flex shrink-0 gap-2'>
            <Button
              size='sm'
              variant='outline'
              disabled={Boolean(busy)}
              onClick={() => run('void')}
            >
              {busy === 'void' ? <Spinner /> : <X />}
              {text('plans.void')}
            </Button>
            <Button
              size='sm'
              className='bg-ai text-ai-foreground hover:bg-ai/90'
              disabled={Boolean(busy) || kept === 0}
              onClick={() => run('execute')}
            >
              {busy === 'execute' ? <Spinner /> : <Check />}
              {text('plans.execute', { count: kept })}
            </Button>
          </div>
        </div>
      ) : plan.status === 'executing' && !gone ? (
        <p className='mt-3 flex items-center gap-2 text-sm text-muted-foreground'>
          <Spinner />
          {text('plans.carryingOut')}
        </p>
      ) : (
        <p
          ref={outcomeRef}
          tabIndex={-1}
          className='mt-3 text-sm text-muted-foreground outline-none'
        >
          {gone
            ? text('plans.gone')
            : outcomeText(plan, text, nameOf, language, now, failedField)}
        </p>
      )}
    </section>
  );
}

function outcomeText(
  plan: PlanView,
  text: (key: string, options?: Record<string, unknown>) => string,
  nameOf: (id: string | null) => string,
  language: string,
  now: number,
  fieldLabel: (field: string) => string,
): string {
  const failure = plan.failure ?? {};
  const time = plan.decidedAt
    ? relativeTime(plan.decidedAt, language, now, text('justNow'))
    : '';
  switch (plan.status) {
    case 'executed':
      return text('plans.outcome.executed', {
        name: nameOf(plan.deciderUserId),
        time,
      });
    case 'voided':
      return text('plans.outcome.voided', {
        name: nameOf(plan.deciderUserId),
        time,
      });
    case 'stale':
      return text('plans.outcome.stale', { position: failure.position });
    case 'failed':
      return text('plans.outcome.failed', {
        position: failure.position,
        reason: `${text(`errors.${toText(failure.code)}`, {
          defaultValue: text('errors.serverError'),
        })}${failure.field ? ` (${fieldLabel(toText(failure.field))})` : ''}`,
      });
    case 'expired':
      return text('plans.outcome.expired');
    default:
      return text('plans.status.executing');
  }
}

function PlanStep({
  step,
  selectable,
  kept,
  onKept,
  onRevise,
}: {
  step: Step;
  selectable: boolean;
  kept: boolean;
  onKept: (kept: boolean) => void;
  // Changes the values the step writes; absent once the plan is decided.
  onRevise?: (values: Record<string, unknown>) => Promise<void>;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const check = step.check;
  const entity = check?.entity ?? 'leads';
  const fields = meta?.definitions[entity]?.fields ?? [];
  // The record it changes, or the one it created once carried out.
  const recordId =
    check?.id ?? (step.result ? toText(step.result.id ?? '') || null : null);
  const what = text(`plans.op.${step.op}`, {
    entity: text(`entity.${entity}`),
  });
  const removed = step.status === 'removed' || (selectable && !kept);
  // The values a step that creates or updates a record writes may be changed.
  const editable =
    !removed && (step.op === 'record.create' || step.op === 'record.update');
  return (
    <li
      className={`flex gap-2.5 rounded-md border border-border bg-card p-3 ${removed ? 'opacity-55' : ''}`}
    >
      {/* A box to leave the step out where there is a choice; nothing,
          not even its number, where there is none. */}
      {selectable ? (
        <Checkbox
          className='mt-0.5'
          checked={kept}
          onCheckedChange={(on) => onKept(on === true)}
          aria-label={text('plans.keepStep', { step: step.position })}
        />
      ) : null}
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-x-1.5 text-sm'>
          <span
            className={`text-muted-foreground ${removed ? 'line-through' : ''}`}
          >
            {what}
          </span>
          {check?.name ? (
            recordId ? (
              <RecordLink
                entity={entity}
                record={{ id: recordId, name: check.name }}
              />
            ) : (
              <span className='font-medium break-words'>{check.name}</span>
            )
          ) : null}
        </div>
        {check?.changes.length ? (
          <dl className='mt-2 flex flex-col gap-1 text-sm'>
            {check.changes.map((change) => (
              <div
                key={change.field}
                className='flex items-baseline gap-3 break-words'
              >
                <dt className='w-24 shrink-0 text-muted-foreground'>
                  {change.field === 'comment'
                    ? text('plans.comment')
                    : text(fieldLabelKey(entity, change.field), {
                        defaultValue: change.field,
                      })}
                </dt>
                <dd className='min-w-0 flex-1'>
                  <StepValue
                    entity={entity}
                    field={fields.find((f) => f.key === change.field)}
                    name={change.field}
                    from={change.from}
                    to={change.to}
                    onRevise={editable ? onRevise : undefined}
                  />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </li>
  );
}

// A value a step writes: while the plan waits, the new value is the field
// the record pages edit it with (a click, then saved as they save), after
// the old one when there was one; a value naming a record an earlier step
// creates ($1) or a field the record has not, as it reads.
function StepValue({
  entity,
  field,
  name,
  from,
  to,
  onRevise,
}: {
  entity: Entity;
  field: Field | undefined;
  name: string;
  from: unknown;
  to: unknown;
  onRevise?: (values: Record<string, unknown>) => Promise<void>;
}): ReactElement {
  const { text } = useCrmText();
  const reference = typeof to === 'string' && to.startsWith('$');
  if (!onRevise || !field || reference)
    return (
      <ChangeValue
        field={field ?? { key: name, type: 'text' }}
        from={from}
        to={to}
      />
    );
  const hadValue = from !== null && from !== undefined && from !== '';
  return (
    <span className='flex min-w-0 items-baseline gap-x-1'>
      {hadValue ? (
        <>
          <span className='shrink-0 text-muted-foreground line-through'>
            <ChangeValue field={field} from={null} to={from} />
          </span>
          <ArrowRight
            className='size-3 shrink-0 self-center text-muted-foreground'
            aria-hidden
          />
        </>
      ) : null}
      <span className='-mx-2 -my-1 min-w-0 flex-1'>
        <InlineField
          entity={entity}
          record={{ id: '', [name]: to } as unknown as CrmRecord}
          field={field}
          label={toText(
            text(fieldLabelKey(entity, name), { defaultValue: name }),
          )}
          editable
          plain
          onSave={async (value) => onRevise({ [name]: value })}
        />
      </span>
    </span>
  );
}

// A changed value as the record pages show it: → new, after the old one
// when there was one.
function ChangeValue({
  field,
  from,
  to,
}: {
  field: Field | { key: string; type: string };
  from: unknown;
  to: unknown;
}): ReactElement {
  const show = (value: unknown): ReactNode =>
    value === null || value === undefined || value === '' ? (
      <span className='text-muted-foreground'>—</span>
    ) : (
      <Value
        field={field.type === 'textarea' ? { ...field, type: 'text' } : field}
        record={{ id: '', [field.key]: value } as unknown as CrmRecord}
        plain
      />
    );
  return (
    <span className='inline-flex flex-wrap items-baseline gap-x-1'>
      {from !== null && from !== undefined && from !== '' ? (
        <>
          <span className='text-muted-foreground line-through'>
            {show(from)}
          </span>
          <ArrowRight
            className='size-3 self-center text-muted-foreground'
            aria-hidden
          />
        </>
      ) : null}
      <span>{show(to)}</span>
    </span>
  );
}

// Atop a record's particulars, where a lead's possible duplicates ask for
// attention, so it shows on every tab: the plans waiting on the reader that
// would change this record (frontend standard §S3.2). A plan decided here
// stays, showing its outcome, until the page is left.
export function WaitingPlans({
  entity,
  recordId,
}: {
  entity: Entity;
  recordId: string;
}): ReactElement | null {
  const { text } = useCrmText();
  const plans = usePlans({ target: `${entity}:${recordId}` });
  // The plans seen waiting during this visit, kept once decided.
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  const pending = (plans.data ?? [])
    .filter((plan) => plan.status === 'pending')
    .map((plan) => plan.id);
  if (pending.some((id) => !seen.has(id)))
    setSeen(new Set([...seen, ...pending]));
  const shown = (plans.data ?? []).filter(
    (plan) => plan.status === 'pending' || seen.has(plan.id),
  );
  if (plans.isLoading || !shown.length) return null;
  const waiting = shown.filter((plan) => plan.status === 'pending');
  return (
    <section
      className='flex flex-col gap-2'
      aria-label={text('plans.waitingOnYou')}
    >
      <div className='flex items-baseline gap-2 px-1'>
        <h2 className='text-sm font-medium'>
          {text('plans.waitingOnYou')}
          {waiting.length ? (
            <>
              <span className='sr-only'>: </span>
              <span className='ml-1.5 text-muted-foreground tabular-nums'>
                {waiting.length}
              </span>
            </>
          ) : null}
        </h2>
      </div>
      {shown.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
      ))}
    </section>
  );
}
