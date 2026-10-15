import type { ReactElement } from 'react';
import { useCrmText } from './api.js';

// A failed AI card's line: that it did not finish, and why when the CRM can
// say (`ai.error` as runFailure in server/providers/crm/ai-model.ts records
// it): a model that did not answer within the turn's limit is a model too
// slow for the work, which the administrator changes on the work's agent
// agent; any other failure is the provider's, said in the logs.
export function AiFailure({
  message,
  error,
}: {
  message: string;
  error?: string;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <p className='text-muted-foreground'>
      {message}
      {error === 'timedOut' ? <> {text('aiFailure.timedOut')}</> : null}
    </p>
  );
}
