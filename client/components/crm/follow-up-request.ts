import { useState } from 'react';
import { useCrmApi, useCrmQuery, useMetadata, useRefresh } from './api.js';
import type { EvaluationEntry, FollowedEntity } from './lead-evaluation.js';

// Asking the AI to follow a record up (again), behind EvaluateButton and
// EvaluateMenuItem (lead-evaluation.tsx): whether it may be asked, whether the AI has
// followed the record up before, and asking.
export interface FollowUpRequest {
  readonly available: boolean;
  readonly asked: boolean;
  readonly busy: boolean;
  readonly ask: () => void;
}
export function useFollowUpRequest(
  entity: FollowedEntity,
  recordId: string,
  onError: (error: unknown) => void,
  allowed = true,
): FollowUpRequest {
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const { data: entry } = useCrmQuery<EvaluationEntry | null>(
    `${entity}/${recordId}/evaluation`,
    Boolean(meta?.assistant),
  );
  return {
    available: Boolean(meta?.assistant) && allowed,
    asked: Boolean(entry),
    busy: busy || entry?.status === 'running',
    ask: () => {
      setBusy(true);
      onError(undefined);
      api(`${entity}/${recordId}/evaluation`, 'POST', {})
        .then(() => refresh())
        .catch(onError)
        .finally(() => setBusy(false));
    },
  };
}
