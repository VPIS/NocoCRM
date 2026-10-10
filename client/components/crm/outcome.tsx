import { useId, useState, type ReactElement } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '../ui/button.js';
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
}: {
  taskId: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  followUp?: boolean;
  onFollowUp?: (followUp: boolean) => void;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const id = useId();
  const [organising, setOrganising] = useState(false);
  const [error, setError] = useState<unknown>();
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
            onClick={() => {
              setOrganising(true);
              setError(undefined);
              api<{ data: { text: string } }>(
                `tasks/${taskId}/organiseFeedback`,
                'POST',
                { text: value },
              )
                .then((result) => onChange(result.data.text))
                .catch(setError)
                .finally(() => setOrganising(false));
            }}
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
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {text('completeTaskOf', { name: toText(task.name) })}
          </DialogTitle>
        </DialogHeader>
        <ErrorNotice error={error} />
        <OutcomeBox
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
