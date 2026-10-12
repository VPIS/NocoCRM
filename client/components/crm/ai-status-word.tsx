import type { ReactElement } from 'react';
import { useCrmText } from './api.js';
import { statusDot } from './status-dot.js';

// Where an AI suggestion stands, in a word beside the chip's name (waiting,
// accepted, ignored, replaced, failed), led by its status dot, so the chips
// atop a record's page say it rather than leave it to the dot's colour.
export function AiStatusWord({
  status,
}: {
  readonly status: string;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <span className='flex shrink-0 items-center gap-1 text-xs text-muted-foreground'>
      <span
        aria-hidden
        className={`size-1.5 shrink-0 rounded-full ${statusDot(status)}`}
      />
      {text(`aiChip.status.${status}`, {
        defaultValue: text('aiChip.status.done'),
      })}
    </span>
  );
}
