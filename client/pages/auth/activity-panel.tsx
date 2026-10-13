import { useTranslation } from '@nocobase/i18n/client';
import {
  ArrowRightLeft,
  Check,
  ChevronRight,
  Inbox,
  Kanban,
  Mail,
  ShieldCheck,
  Sparkles,
  SquareCheckBig,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';

import { Badge } from '#components/ui/badge';

// The sign-in page's right side: one customer's way through the CRM, from a
// lead to an opportunity to a closed deal, told on a record card. The card
// starts as the lead the AI organised out of an email, turns into the
// opportunity when the lead is converted, fills in its stages as the steps
// come (an AI follow-up, a demo prepared, the customer's reply, an
// approval), and ends won; then the story starts again. Above it, the three
// phases mark where the story is. Sample content: every name and figure is
// in the locale files.

const PHASES = ['lead', 'deal', 'won'] as const;
type Phase = (typeof PHASES)[number];

const LEAD_STATUSES = ['new', 'working', 'converted'] as const;

const DEAL_STAGES = [
  'qualification',
  'proposal',
  'negotiation',
  'won',
] as const;

type Who = 'ai' | 'person' | 'customer';

// Who takes part: the deal's owner, the CRM's four AI agents, the manager
// who approves, and the customer.
const PARTICIPANTS = [
  'rep',
  'leadAgent',
  'prepAgent',
  'dealAgent',
  'approvalAgent',
  'manager',
  'customer',
] as const;
type Participant = (typeof PARTICIPANTS)[number];

const AGENT_ICONS: Readonly<Partial<Record<Participant, LucideIcon>>> = {
  leadAgent: Sparkles,
  prepAgent: SquareCheckBig,
  dealAgent: Sparkles,
  approvalAgent: ShieldCheck,
};

// What the CRM does it with, as the panel's capability tags name it.
const CAPABILITIES = [
  { key: 'capture', icon: Inbox },
  { key: 'followUp', icon: Sparkles },
  { key: 'pipeline', icon: Kanban },
  { key: 'prep', icon: SquareCheckBig },
  { key: 'mail', icon: Mail },
  { key: 'approval', icon: ShieldCheck },
] as const;
type Capability = (typeof CAPABILITIES)[number]['key'];

interface Step {
  readonly id: string;
  readonly who: Who;
  readonly icon: LucideIcon;
  readonly phase: Phase;
  /** The opportunity's stage once this step has happened. */
  readonly stage: number;
  readonly by: Participant;
  readonly with: Capability;
}

const STEPS: readonly Step[] = [
  {
    id: 'captured',
    who: 'ai',
    icon: Sparkles,
    phase: 'lead',
    stage: 0,
    by: 'leadAgent',
    with: 'capture',
  },
  {
    id: 'leadFollowUp',
    who: 'ai',
    icon: Sparkles,
    phase: 'lead',
    stage: 0,
    by: 'leadAgent',
    with: 'followUp',
  },
  {
    id: 'converted',
    who: 'person',
    icon: ArrowRightLeft,
    phase: 'deal',
    stage: 0,
    by: 'rep',
    with: 'pipeline',
  },
  {
    id: 'prepared',
    who: 'ai',
    icon: SquareCheckBig,
    phase: 'deal',
    stage: 0,
    by: 'prepAgent',
    with: 'prep',
  },
  {
    id: 'replied',
    who: 'customer',
    icon: Mail,
    phase: 'deal',
    stage: 1,
    by: 'customer',
    with: 'mail',
  },
  {
    id: 'dealFollowUp',
    who: 'ai',
    icon: Sparkles,
    phase: 'deal',
    stage: 2,
    by: 'dealAgent',
    with: 'followUp',
  },
  {
    id: 'reviewed',
    who: 'ai',
    icon: ShieldCheck,
    phase: 'deal',
    stage: 2,
    by: 'approvalAgent',
    with: 'approval',
  },
  {
    id: 'approved',
    who: 'person',
    icon: ShieldCheck,
    phase: 'deal',
    stage: 2,
    by: 'manager',
    with: 'approval',
  },
  {
    id: 'won',
    who: 'person',
    icon: Check,
    phase: 'won',
    stage: 3,
    by: 'rep',
    with: 'pipeline',
  },
];

// How many of the latest steps the card shows, so it keeps its height.
const SHOWN = 4;
const STEP_MS = 2200;
// The won card stays a while before the story starts again.
const HOLD_MS = 5000;

const WHO_STYLE: Readonly<Record<Who, string>> = {
  ai: 'bg-primary/10 text-primary',
  person: 'bg-muted text-muted-foreground',
  customer: 'bg-info/10 text-info',
};

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// The step the story has reached: one more every STEP_MS, held on the last,
// then back to the first. Under reduced motion, the whole story at once.
function useStory(): number {
  const last = STEPS.length - 1;
  const [step, setStep] = useState(() => (reducedMotion() ? last : 0));
  useEffect(() => {
    if (reducedMotion()) return;
    const timer = setTimeout(
      () => setStep((current) => (current >= last ? 0 : current + 1)),
      step >= last ? HOLD_MS : STEP_MS,
    );
    return () => clearTimeout(timer);
  }, [step, last]);
  return step;
}

// Lead, opportunity, closed: the phases done ticked, the current one filled.
function Journey({ phase }: { readonly phase: Phase }): ReactElement {
  const { t } = useTranslation();
  const at = PHASES.indexOf(phase);
  return (
    <ol className='flex items-center gap-2'>
      {PHASES.map((key, index) => (
        <li className='flex items-center gap-2' key={key}>
          {index > 0 ? (
            <ChevronRight className='size-4 text-muted-foreground/60' />
          ) : null}
          <span
            className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors duration-500 ${
              index === at
                ? phase === 'won'
                  ? 'bg-success text-background'
                  : 'bg-primary text-primary-foreground'
                : index < at
                  ? 'bg-card text-foreground shadow-xs'
                  : 'bg-card text-muted-foreground shadow-xs'
            }`}
          >
            {index < at || (index === at && phase === 'won') ? (
              <Check className='size-3.5' />
            ) : null}
            {t(`loginActivity.phases.${key}`)}
          </span>
        </li>
      ))}
    </ol>
  );
}

// A record's way so far, as segments that fill in: the lead's statuses or
// the opportunity's stages.
function StageBar({
  stages,
  group,
  stage,
  won = false,
}: {
  readonly stages: readonly string[];
  /** The locale group the stages are named in. */
  readonly group: string;
  readonly stage: number;
  readonly won?: boolean;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <ol
      className='grid gap-1.5'
      style={{ gridTemplateColumns: `repeat(${String(stages.length)}, 1fr)` }}
    >
      {stages.map((key, index) => (
        <li className='grid gap-1.5' key={key}>
          <span
            className={`h-1.5 rounded-full transition-colors duration-500 ${
              index <= stage ? (won ? 'bg-success' : 'bg-primary') : 'bg-muted'
            }`}
          />
          <span
            className={`truncate text-xs transition-colors duration-500 ${
              index === stage
                ? 'font-medium text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {t(`loginActivity.${group}.${key}`)}
          </span>
        </li>
      ))}
    </ol>
  );
}

// The record the card shows: the lead while it is one, then the
// opportunity it was converted into, which a won deal closes.
function RecordHead({
  phase,
  graded,
  stage,
}: {
  readonly phase: Phase;
  readonly graded: boolean;
  readonly stage: number;
}): ReactElement {
  const { t } = useTranslation();
  if (phase === 'lead')
    return (
      <div>
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <p className='text-xs text-muted-foreground'>
              {t('loginActivity.lead.kind')}
            </p>
            <h3 className='mt-1 truncate text-lg font-semibold'>
              {t('loginActivity.lead.title')}
            </h3>
            <p className='mt-0.5 truncate text-sm text-muted-foreground'>
              {t('loginActivity.lead.need')}
            </p>
          </div>
          {graded ? (
            <Badge
              variant='success'
              className='shrink-0 animate-in duration-500 fade-in zoom-in-75 motion-reduce:animate-none'
            >
              {t('loginActivity.lead.grade')}
            </Badge>
          ) : null}
        </div>
        <div className='mt-5'>
          <StageBar
            stages={LEAD_STATUSES}
            group='leadStatuses'
            stage={graded ? 1 : 0}
          />
        </div>
      </div>
    );
  const won = phase === 'won';
  return (
    <div className='animate-in duration-500 fade-in slide-in-from-right-4 motion-reduce:animate-none'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0'>
          <p className='text-xs text-muted-foreground'>
            {t('loginActivity.deal.kind')}
          </p>
          <h3 className='mt-1 truncate text-lg font-semibold'>
            {t('loginActivity.deal.title')}
          </h3>
          <p className='mt-0.5 truncate text-sm text-muted-foreground'>
            {t('loginActivity.deal.company')}
          </p>
        </div>
        <div className='shrink-0 text-right'>
          <p
            className={`text-lg font-semibold tabular-nums transition-colors duration-500 ${
              won ? 'text-success' : ''
            }`}
          >
            {t('loginActivity.deal.amount')}
          </p>
          {won ? (
            <Badge
              variant='success'
              className='mt-1 animate-in gap-1 duration-500 fade-in zoom-in-75 motion-reduce:animate-none'
            >
              <Check />
              {t('loginActivity.deal.won')}
            </Badge>
          ) : (
            <p className='mt-1 text-xs text-muted-foreground'>
              {t('loginActivity.deal.owner')}
            </p>
          )}
        </div>
      </div>
      <div className='mt-5'>
        <StageBar stages={DEAL_STAGES} group='stages' stage={stage} won={won} />
      </div>
    </div>
  );
}

function StepRow({ step }: { readonly step: Step }): ReactElement {
  const { t } = useTranslation();
  const Icon = step.icon;
  return (
    <li className='flex animate-in items-start gap-2.5 duration-500 fade-in slide-in-from-bottom-2 motion-reduce:animate-none'>
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full ${WHO_STYLE[step.who]}`}
      >
        <Icon className='size-3.5' />
      </span>
      <span className='min-w-0 pt-0.5 text-sm leading-5'>
        <span className='font-medium'>
          {t(`loginActivity.steps.${step.id}.who`)}
        </span>
        <span className='text-muted-foreground'>
          {' '}
          {t(`loginActivity.steps.${step.id}.what`)}
        </span>
      </span>
    </li>
  );
}

// Everyone taking part, the one doing the current step lit and named, the
// others faded.
function Participants({
  active,
}: {
  readonly active: Participant;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <div className='flex items-center gap-3'>
      <div className='flex -space-x-1'>
        {PARTICIPANTS.map((key) => {
          const Icon = AGENT_ICONS[key];
          const name = t(`loginActivity.participants.${key}`);
          const on = key === active;
          return (
            <span
              className={`relative grid size-7 place-items-center border-2 border-card text-[0.6875rem] font-medium transition-all duration-500 ${
                Icon
                  ? 'rounded-lg bg-primary/10 text-primary'
                  : key === 'customer'
                    ? 'rounded-full bg-info/10 text-info'
                    : 'rounded-full bg-muted text-muted-foreground'
              } ${on ? 'z-10 scale-110 ring-2 ring-primary' : 'opacity-45'}`}
              key={key}
            >
              {Icon ? (
                <Icon className='size-3.5' />
              ) : (
                name
                  .split(/\s+/)
                  .map((part) => part.slice(0, 1))
                  .join('')
                  .slice(0, 2)
              )}
            </span>
          );
        })}
      </div>
      <span
        className='min-w-0 animate-in truncate text-xs font-medium duration-300 fade-in motion-reduce:animate-none'
        key={active}
      >
        {t(`loginActivity.participants.${active}`)}
      </span>
    </div>
  );
}

// What the CRM does, the capability the current step uses lit.
function Capabilities({
  active,
}: {
  readonly active: Capability;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <ul className='flex flex-wrap gap-2'>
      {CAPABILITIES.map(({ key, icon: Icon }) => (
        <li
          className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors duration-500 ${
            key === active
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground'
          }`}
          key={key}
        >
          <Icon className='size-3.5' />
          {t(`loginActivity.capabilities.${key}`)}
        </li>
      ))}
    </ul>
  );
}

/** The sign-in page's aside: a lead's way to a closed deal, looping. */
export function ActivityPanel(): ReactElement {
  const { t } = useTranslation();
  const step = useStory();
  const current = STEPS[step];
  const shown = STEPS.slice(Math.max(0, step + 1 - SHOWN), step + 1);
  return (
    // Laid over the aside rather than in its flow, so the page keeps the
    // form's height whatever the card holds.
    <div className='absolute inset-0 flex flex-col justify-center gap-8 p-12'>
      <header className='max-w-md space-y-2'>
        <h2 className='text-2xl leading-tight font-semibold tracking-tight'>
          {t('loginActivity.heading')}
        </h2>
        <p className='text-sm text-muted-foreground'>
          {t('loginActivity.description')}
        </p>
      </header>
      {/* The story is decoration: the heading above says what it shows. */}
      <div aria-hidden='true' className='grid w-full max-w-md gap-4'>
        <Journey phase={current.phase} />
        <article className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
          {/* A fixed height for the head, the lead's and the
              opportunity's alike, so the card never jumps. */}
          <div className='h-28'>
            <RecordHead
              phase={current.phase}
              graded={step >= 1}
              stage={current.stage}
            />
          </div>
          <div className='mt-4 border-t border-border pt-4'>
            <p className='mb-3 text-xs font-medium text-muted-foreground'>
              {t('loginActivity.timeline')}
            </p>
            <ol className='grid h-40 content-start gap-3 overflow-hidden'>
              {shown.map((item) => (
                <StepRow key={item.id} step={item} />
              ))}
            </ol>
          </div>
          <div className='mt-4 border-t border-border pt-4'>
            <Participants active={current.by} />
          </div>
        </article>
        <Capabilities active={current.with} />
      </div>
    </div>
  );
}
