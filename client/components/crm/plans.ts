import { useToaster } from '@nocobase/app-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type {
  PlanStatus,
  PlanView,
} from '../../../server/providers/crm/plans/engine.js';
import {
  errorCode,
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
} from './api.js';

export type { PlanStatus, PlanView };

// The plans an agent proposed to the reader (server/routes/plans.ts):
// those of a conversation, of a record, or every one, waiting first.
export function usePlans(
  query: {
    conversationId?: string;
    target?: string;
    status?: PlanStatus;
  },
  enabled = true,
) {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const params = new URLSearchParams({ pageSize: '100' });
  for (const [key, value] of Object.entries(query))
    if (value) params.set(key, value);
  const path = `plans?${params.toString()}`;
  return useQuery({
    queryKey: [...scopeKey, path],
    queryFn: () =>
      api<{ data: PlanView[]; meta: { total: number } }>(path).then(
        (r) => r.data,
      ),
    enabled,
    staleTime: 5000,
    // A plan waiting may be decided elsewhere (the inbox, another tab); one
    // being carried out is followed closely until it is decided.
    refetchInterval: (state) =>
      state.state.data?.some((plan) => plan.status === 'executing')
        ? 3000
        : 30000,
  });
}

// The plans the inbox lists: every one waiting or being carried out, and
// those decided in the last week.
const RECENT_MS = 7 * 24 * 3_600_000;
export function useInboxPlans() {
  const query = usePlans({});
  const [since] = useState(() => Date.now() - RECENT_MS);
  const plans = (query.data ?? []).filter(
    (plan) =>
      plan.status === 'pending' ||
      plan.status === 'executing' ||
      Date.parse(plan.decidedAt ?? plan.createdAt) >= since,
  );
  return { query, plans };
}

// Carrying a plan out or voiding it, as the person it was proposed to: the
// card shows what came of it, and every CRM query is refreshed, since the
// steps may have changed any record and the inbox's count.
export function usePlanDecision(plan: PlanView) {
  const api = useCrmApi();
  const client = useQueryClient();
  const toaster = useToaster();
  const { text } = useCrmText();
  const [busy, setBusy] = useState<'execute' | 'void'>();
  const [error, setError] = useState<unknown>();
  // A decision answered 404: the plan is gone (or never was the reader's).
  const [gone, setGone] = useState(false);
  const decide = useCallback(
    async (
      decision: 'execute' | 'void',
      skip: number[] = [],
    ): Promise<PlanView | undefined> => {
      setBusy(decision);
      setError(undefined);
      try {
        const { data } = await api<{ data: PlanView }>(
          `plans/${encodeURIComponent(plan.id)}/${decision}`,
          'POST',
          decision === 'execute'
            ? { revision: plan.revision, ...(skip.length ? { skip } : {}) }
            : { revision: plan.revision },
        );
        const ok = data.status === 'executed' || data.status === 'voided';
        toaster.show({
          type: ok ? 'success' : 'error',
          title: toText(
            text(
              data.status === 'executed'
                ? 'plans.executed'
                : data.status === 'voided'
                  ? 'plans.voided'
                  : 'plans.notExecuted',
              { title: plan.title },
            ),
          ),
        });
        // The plan as decided, at once, before the lists come back.
        client.setQueriesData<PlanView[]>(
          {
            queryKey: ['crm'],
            predicate: (query) =>
              String(query.queryKey.at(-1)).startsWith('plans?'),
          },
          (current) =>
            Array.isArray(current)
              ? current.map((item) => (item.id === data.id ? data : item))
              : current,
        );
        await client.invalidateQueries({ queryKey: ['crm'] });
        return data;
      } catch (cause) {
        if (errorCode(cause).code === 'notFound') setGone(true);
        else setError(cause);
        await client.invalidateQueries({ queryKey: ['crm'] });
        return undefined;
      } finally {
        setBusy(undefined);
      }
    },
    [api, client, plan.id, plan.revision, plan.title, text, toaster],
  );
  // A value of a waiting step changed on the card: the plan as revised
  // (rehearsed again, its revision moved on) replaces it in every list at
  // once; a refusal is thrown for the field's editor to show.
  const revise = useCallback(
    async (position: number, values: Record<string, unknown>) => {
      const { data } = await api<{ data: PlanView }>(
        `plans/${encodeURIComponent(plan.id)}/steps/${String(position)}`,
        'PATCH',
        { revision: plan.revision, values },
      );
      client.setQueriesData<PlanView[]>(
        {
          queryKey: ['crm'],
          predicate: (query) =>
            String(query.queryKey.at(-1)).startsWith('plans?'),
        },
        (current) =>
          Array.isArray(current)
            ? current.map((item) => (item.id === data.id ? data : item))
            : current,
      );
      return data;
    },
    [api, client, plan.id, plan.revision],
  );
  return { decide, revise, busy, error, gone };
}
