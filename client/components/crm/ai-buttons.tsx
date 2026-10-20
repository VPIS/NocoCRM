import { Sparkles } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { Button } from '../ui/button.js';
import { Spinner } from '../ui/spinner.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.js';
import { useCrmText } from './api.js';

// The buttons that ask the AI to work on a suggestion card (the follow-up,
// review and preparation cards) and on their chips: running it the first
// time, running it again, and adjusting it in a sentence. Without a model to
// ask (the workspace's `assistant`) each stays where it is, greyed, its
// hover saying why, so a deployment without one still shows what the AI
// would do there.

// Why the button is greyed.
function NeedsModel(): ReactElement {
  const { text } = useCrmText();
  return <>{text('evaluation.needsModel')}</>;
}

// The first run, before the chip it gives way to: as tall as the small
// buttons beside it, on the AI's tint, led by its mark.
export function RunButton({
  asks,
  busy,
  onAsk,
  children,
}: {
  asks: boolean;
  busy: boolean;
  onAsk: () => void;
  // Its words: the agent's run word.
  children: ReactNode;
}): ReactElement {
  const button = (
    <button
      type='button'
      className='inline-flex h-7 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 font-sans text-sm font-medium tracking-normal text-primary transition-colors hover:bg-primary/15 disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-primary/10 dark:bg-primary/20'
      disabled={busy}
      // Greyed but still taking the pointer, so its hover says why.
      aria-disabled={asks ? undefined : true}
      onClick={asks ? onAsk : undefined}
    >
      {busy ? (
        <Spinner className='size-3.5' />
      ) : (
        <Sparkles className='size-3.5' />
      )}
      {children}
    </button>
  );
  if (asks) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side='bottom' className='max-w-64'>
        <NeedsModel />
      </TooltipContent>
    </Tooltip>
  );
}

// Running it again, at the chip's end after a hairline: in a word, its full
// name on hover, or why it cannot be run.
export function RerunButton({
  asks,
  busy,
  onAsk,
  label,
  hint,
}: {
  asks: boolean;
  busy: boolean;
  onAsk: () => void;
  // Its full name, for screen readers.
  label: string;
  // Its full name on hover.
  hint: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <>
      <span aria-hidden className='h-3.5 w-px shrink-0 bg-primary/20' />
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type='button'
              disabled={busy}
              aria-disabled={asks ? undefined : true}
              onClick={asks ? onAsk : undefined}
              aria-label={label}
              className='flex h-full shrink-0 items-center gap-1 rounded-r-lg px-2 font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent'
            />
          }
        >
          {busy ? <Spinner className='size-3.5' /> : null}
          {text('evaluation.rerun')}
        </TooltipTrigger>
        <TooltipContent side='bottom' className='max-w-64'>
          {asks ? hint : <NeedsModel />}
        </TooltipContent>
      </Tooltip>
    </>
  );
}

// The Adjust button at the right of a card's "Tell AI what to change" box.
// A disabled button takes no pointer, so without a model the hover is on a
// span around it.
export function ReviseButton({
  asks,
  busy,
  revising,
  empty,
}: {
  asks: boolean;
  // The card is doing something, this or another of its actions.
  busy: boolean;
  revising: boolean;
  empty: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const button = (
    <Button
      type='submit'
      size='sm'
      // As tall as the card's other buttons, and the box beside it while
      // that is one line.
      className='shrink-0 bg-primary text-primary-foreground hover:bg-primary/90'
      disabled={busy || !asks || empty}
    >
      {revising ? <Spinner /> : <Sparkles />}
      {text(revising ? 'evaluation.adjusting' : 'evaluation.revise')}
    </Button>
  );
  if (asks) return button;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className='shrink-0' tabIndex={0} />}>
        {button}
      </TooltipTrigger>
      <TooltipContent side='bottom' className='max-w-64'>
        <NeedsModel />
      </TooltipContent>
    </Tooltip>
  );
}
