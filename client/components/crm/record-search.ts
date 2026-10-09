import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  toText,
  useCrmApi,
  useCrmScopeKey,
  type CrmRecord,
  type Entity,
  type ListData,
} from './api.js';

// What the quick dialogs' searching chips share (task-links.tsx,
// approval-quick.tsx): a search typed settles before it is sent, and the
// first matches of a kind come from the list endpoint.

// The first matches of each kind, before anything is typed and after.
export const RESULTS = 5;

export function useDebounced(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// The first matches of one kind of record, through the list endpoint.
export function useMatches(
  entity: Entity,
  search: string,
  enabled: boolean,
  extra: Record<string, string> = {},
): { rows: CrmRecord[]; titles: Record<string, string> } {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const params = new URLSearchParams({ pageSize: String(RESULTS) });
  if (search) params.set('search', search);
  for (const [key, value] of Object.entries(extra))
    if (value) params.set(key, value);
  const path = `${toText(entity)}?${params.toString()}`;
  const query = useQuery({
    queryKey: [...scopeKey, 'task-links', path],
    queryFn: () => api<ListData>(path),
    enabled,
    staleTime: 20000,
  });
  const rows = query.data?.data;
  return {
    rows: Array.isArray(rows) ? rows : [],
    // The names of the records they refer to (a deal's account).
    titles: query.data?.titles ?? {},
  };
}
