import type { ReactElement } from 'react';
import { Badge } from '../ui/badge.js';
import { useCrmText } from './api.js';

// A signal's kind as a tag, each kind its own colour from the CRM's tag
// tones (crm-look.md): funding the good news, hiring news of growth, a
// change of executives one to watch, a risk the alarm, and the other major
// news neutral. The same on the company's card, its whole list and the
// timeline's line.
const TONES: Record<
  string,
  'success' | 'info' | 'warning' | 'destructive' | 'muted'
> = {
  funding: 'success',
  hiring: 'info',
  leadership: 'warning',
  risk: 'destructive',
  business: 'muted',
};

export function SignalTypeTag({
  type,
  className,
}: {
  type: string;
  className?: string;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <Badge variant={TONES[type] ?? 'muted'} className={className}>
      {text(`signals.types.${type}`, { defaultValue: type })}
    </Badge>
  );
}
