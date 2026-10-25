import { ApiClientError } from '@nocobase/app-client';

// Demo Mode already reports refused writes through its global toast. Keep the
// rejection intact for callers, but do not repeat it as a form/field error.
export function isDemoReadOnlyError(error: unknown): boolean {
  return error instanceof ApiClientError && error.reason === 'DEMO_READ_ONLY';
}
