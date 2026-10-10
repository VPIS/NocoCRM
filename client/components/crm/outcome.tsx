import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { Check, CircleCheck, Sparkles } from 'lucide-react';
import { Button, buttonVariants } from '../ui/button.js';
import { Checkbox } from '../ui/checkbox.js';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { Spinner } from '../ui/spinner.js';
import { Textarea } from '../ui/textarea.js';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';
import { ErrorNotice } from './common.js';
import {
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  type CrmRecord,
  agentRuns,
} from './api.js';

// What came of a task, as the person tells it, with the AI writing up
// what they jotted down (headed points: what the other side said, the facts
// settled, what was agreed, the next step), which they read and change
// before recording it; and, where the task belongs to a lead, whether
// the AI then follows the lead up anew (`onFollowUp`). The follow-up card's
// "done" and the task's own "record outcome" both use it.
export function OutcomeBox({
  taskId,
  value,
  onChange,
  disabled,
  followUp,
  onFollowUp,
  bare = false,
}: {
  taskId: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  followUp?: boolean;
  onFollowUp?: (followUp: boolean) => void;
  // In a dialog laid out as the new task's: the text with no box, growing
  // with what is written, and its options as chips under it.
  bare?: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const id = useId();
  const [organising, setOrganising] = useState(false);
  const [error, setError] = useState<unknown>();
  // The bare text grows with what is written, up to half the screen.
  const boxRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || !bare) return;
    const limit = Math.round(window.innerHeight / 2);
    box.style.height = 'auto';
    box.style.height = `${String(Math.min(box.scrollHeight, limit))}px`;
    box.style.overflowY = box.scrollHeight > limit ? 'auto' : 'hidden';
  }, [value, bare]);
  const organise = (): void => {
    setOrganising(true);
    setError(undefined);
    api<{ data: { text: string } }>(
      `tasks/${taskId}/organiseFeedback`,
      'POST',
      {
        text: value,
      },
    )
      .then((result) => onChange(result.data.text))
      .catch(setError)
      .finally(() => setOrganising(false));
  };
  if (bare)
    return (
      <div className='space-y-4'>
        <textarea
          ref={boxRef}
          autoFocus
          rows={3}
          value={value}
          maxLength={LONG_TEXT_LIMIT}
          disabled={disabled || organising}
          placeholder={toText(text('evaluation.outcomePlaceholder'))}
          aria-label={toText(text('fields.result'))}
          onChange={(event) => onChange(event.target.value)}
          className='w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground'
        />
        <ErrorNotice error={error} />
        {/* The options as the new task's chips. */}
        <div className='flex flex-wrap items-center gap-1.5'>
          {onFollowUp && meta?.assistant ? (
            <label
              htmlFor={id}
              className={`${buttonVariants({ variant: 'outline', size: 'sm' })} cursor-pointer font-normal`}
            >
              <Checkbox
                id={id}
                checked={followUp ?? true}
                disabled={disabled}
                onCheckedChange={(checked) => onFollowUp(checked === true)}
              />
              {text('evaluation.followUpAfter')}
            </label>
          ) : null}
          {meta?.assistant ? (
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='font-normal text-ai hover:text-ai'
              disabled={disabled || organising || !value.trim()}
              onClick={organise}
            >
              {organising ? <Spinner /> : <Sparkles />}
              {text(
                organising
                  ? 'evaluation.organising'
                  : 'evaluation.organiseOutcome',
              )}
            </Button>
          ) : null}
        </div>
      </div>
    );
  return (
    <div className='grid gap-2'>
      <Textarea
        value={value}
        maxLength={LONG_TEXT_LIMIT}
        disabled={disabled || organising}
        placeholder={toText(text('evaluation.outcomePlaceholder'))}
        aria-label={toText(text('fields.result'))}
        onChange={(event) => onChange(event.target.value)}
        className='max-h-72 min-h-16 bg-background'
      />
      <ErrorNotice error={error} />
      <div className='flex flex-wrap items-center gap-2'>
        {/* The lead followed up anew once this is recorded: ticked by
            default, offered only while the AI is on. */}
        {onFollowUp && meta?.assistant ? (
          <label
            htmlFor={id}
            className='mr-auto flex items-center gap-2 text-sm text-muted-foreground'
          >
            <Checkbox
              id={id}
              checked={followUp ?? true}
              disabled={disabled}
              onCheckedChange={(checked) => onFollowUp(checked === true)}
            />
            {text('evaluation.followUpAfter')}
          </label>
        ) : null}
        {meta?.assistant ? (
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='ml-auto text-ai hover:text-ai'
            disabled={disabled || organising || !value.trim()}
            onClick={organise}
          >
            {organising ? <Spinner /> : <Sparkles />}
            {text(
              organising
                ? 'evaluation.organising'
                : 'evaluation.organiseOutcome',
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// An open task completed from its own page, with what came of it if the
// person writes anything (or has the AI write it up), and its deal, or
// else its lead, followed up anew when that is ticked.
export function RecordOutcomeDialog({
  task,
  onClose,
}: {
  task: CrmRecord;
  onClose: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [outcome, setOutcome] = useState('');
  const [followUp, setFollowUp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const { data: meta } = useMetadata();
  // Offered only while the agent of the task's deal, else its lead, runs
  // after a task is done (the Agents pages switch it).
  const followable =
    Boolean(task.opportunityId || task.leadId) &&
    agentRuns(meta, task.opportunityId ? 'opportunities' : 'leads', 'taskDone');
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      {/* Laid out as the new task's dialog: no heading of its own (named
          for screen readers), the task's name leading, what came of it
          under it with no box, its options as chips, then the buttons. */}
      <DialogContent
        showCloseButton={false}
        className='max-h-[90svh] overflow-y-auto sm:max-w-xl'
      >
        <DialogHeader className='sr-only'>
          <DialogTitle>
            {text('completeTaskOf', { name: toText(task.name) })}
          </DialogTitle>
        </DialogHeader>
        <p className='flex items-center gap-2 text-base font-medium'>
          <CircleCheck className='size-4 shrink-0 text-muted-foreground' />
          <span className='min-w-0 break-words'>{toText(task.name)}</span>
        </p>
        <ErrorNotice error={error} />
        <OutcomeBox
          bare
          taskId={toText(task.id)}
          value={outcome}
          onChange={setOutcome}
          disabled={busy}
          // A follow-up is a deal's or a lead's: offered only for an
          // task of one.
          {...(followable ? { followUp, onFollowUp: setFollowUp } : {})}
        />
        <DialogFooter>
          <Button variant='outline' disabled={busy} onClick={onClose}>
            {text('cancel')}
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(undefined);
              api(`tasks/${toText(task.id)}/recordOutcome`, 'POST', {
                outcome,
                followUp: followable && followUp,
              })
                .then(() => refresh())
                .then(onClose)
                .catch(setError)
                .finally(() => setBusy(false));
            }}
          >
            {busy ? <Spinner /> : <Check />}
            {text('completeTask')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
