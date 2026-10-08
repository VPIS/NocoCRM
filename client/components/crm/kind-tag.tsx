import type { ReactElement } from 'react';
import { Badge } from '../ui/badge.js';
import { toText, useCrmText } from './api.js';

// An approval's topic says what kind of thing a row is,
// not where it stands, so it takes the muted colour beside a status's.
export function KindTag({ value }: { value: unknown }): ReactElement {
  const { text } = useCrmText();
  const kind = toText(value ?? '');
  return (
    <Badge variant='muted'>
      {text(`options.${kind}`, { defaultValue: kind })}
    </Badge>
  );
}
