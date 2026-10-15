import { useState } from 'react';
import { useCrmApi, useCrmQuery, useMetadata, useRefresh } from './api.js';
import type { EvaluationEntry, FollowedEntity } from './lead-evaluation.js';

// Asking the AI to follow a record up (again), behind EvaluateButton and
// EvaluateMenuItem (lead-evaluation.tsx): whether it may be asked, whether the AI has
// followed the record up before, and asking.
export interface FollowUpRequest {
  // Whose follow-up it asks: the lead's or the deal's.
  readonly entity: FollowedEntity;
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
    `${entity}/${recordId}/evaluations/latest`,
    // Only where it may be asked for: a record page of another kind passes
    // its own id, which names no deal.
    Boolean(meta?.assistant) && allowed,
  );
  return {
    entity,
    available: Boolean(meta?.assistant) && allowed,
    asked: Boolean(entry),
    busy: busy || entry?.status === 'running',
    ask: () => {
      setBusy(true);
      onError(undefined);
      api(`${entity}/${recordId}/evaluate`, 'POST', {})
        .then(() => refresh())
        .catch(onError)
        .finally(() => setBusy(false));
    },
  };
}
