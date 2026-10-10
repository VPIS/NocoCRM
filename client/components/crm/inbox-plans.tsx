import { Button } from '#components/ui/button';
import { useTranslation } from '@nocobase/i18n/client';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { relativeTime, useCrmText } from './api.js';
import { ErrorNotice, Loading } from './common.js';
import { PlanCard } from './plan-card.js';
import { useInboxPlans, type PlanView } from './plans.js';

// The plans an agent proposed to the reader, as a category of the inbox's
// To do (migration step 2; the category is registered in
// inbox-decisions.tsx): those waiting first, then those decided in the last
// week, each opening its decision card beside the list.

export function PlanList({
  plans,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
}: {
  plans: readonly PlanView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const [now] = useState(() => Date.now());
  if (loading) return <Loading />;
  if (error)
    return (
      <div className='flex flex-col items-start gap-2 p-2'>
        <ErrorNotice error={error} />
        <Button variant='outline' size='sm' onClick={onRetry}>
          {text('agentChat.retry')}
        </Button>
      </div>
    );
  return (
    <ul className='flex flex-col gap-0.5'>
      {plans.map((plan) => {
        const selected = plan.id === selectedId;
        const waiting = plan.status === 'pending';
        return (
          <li key={plan.id}>
            <button
              type='button'
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(plan.id)}
              className={`relative flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-[background-color,border-color] ${
                selected
                  ? 'border-transparent bg-card shadow-xs'
                  : 'border-transparent hover:bg-accent/60'
              } ${waiting ? '' : 'opacity-55'}`}
            >
              {/* What waits is marked as the AI's suggestions are. */}
              <span
                aria-hidden
                className={`absolute top-3 bottom-3 left-0 w-0.5 rounded-full ${
                  selected ? 'bg-primary' : waiting ? 'bg-ai' : 'bg-transparent'
                }`}
              />
              <ClipboardList className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
              <span className='grid min-w-0 flex-1 gap-1'>
                <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                  <span className='truncate'>
                    {text('plans.meta', {
                      agent: plan.agentName ?? text('plans.agent'),
                      time: relativeTime(
                        plan.createdAt,
                        language,
                        now,
                        text('justNow'),
                      ),
                    })}
                  </span>
                  <span className='ml-auto shrink-0'>
                    {text(`plans.status.${plan.status}`)}
                  </span>
                </span>
                <span
                  className={`truncate text-sm ${waiting ? 'font-medium' : ''}`}
                  title={plan.title}
                >
                  {plan.title}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function PlanDetail({
  id,
  onBack,
}: {
  readonly id: string | null;
  readonly onBack: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const { t } = useTranslation();
  const { query, plans } = useInboxPlans();
  // A plan picked by its address is that plan or, gone, none; nothing
  // picked opens the first waiting.
  const current = id
    ? plans.find((plan) => plan.id === id)
    : (plans.find((plan) => plan.status === 'pending') ?? plans[0]);
  if (query.isLoading) return <Loading />;
  if (!current)
    return query.error ? (
      <ErrorNotice error={query.error} />
    ) : (
      <p className='p-8 text-center text-sm text-muted-foreground'>
        {text(id ? 'plans.gone' : 'plans.none')}
      </p>
    );
  return (
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
      {/* Keyed: what was unticked or failed on one plan stays with it. */}
      <PlanCard key={current.id} plan={current} />
    </div>
  );
}
