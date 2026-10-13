import type { ReactElement } from 'react';
import { useCrmText } from './api.js';

// Where an AI suggestion stands, in a word beside the chip's name (waiting,
// accepted, ignored, replaced, failed), in the chip's own AI colour, lighter,
// so the chip keeps one hue; only a failure reads in the destructive colour.
export function AiStatusWord({
  status,
}: {
  readonly status: string;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <span
      className={`shrink-0 ${
        status === 'failed' ? 'text-destructive' : 'text-primary/70'
      }`}
    >
      {text(`aiChip.status.${status}`, {
        defaultValue: text('aiChip.status.done'),
      })}
    </span>
  );
}
