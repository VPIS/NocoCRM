import { ApiError, type ApiErrorStatus } from '@nocobase/app-server/router';
import { CrmError } from '../providers/crm/schema.js';

// The CRM's errors in the standard error body (references/http-api.md). The
// services throw CrmError with a camelCase code the client's locale keys use
// (`errors.<code>`); the routes answer it as an ApiError of domain `crm`
// whose reason is that code in UPPER_SNAKE_CASE, which the client turns back
// (errorCode in client/components/crm/api.ts).

export const CRM_ERROR_DOMAIN = 'crm';

// `taskChanged` → `TASK_CHANGED`.
export const reasonOf = (code: string): string =>
  code.replace(/([a-z0-9])([A-Z])/gu, '$1_$2').toUpperCase();

// A conflict with what someone else just did; every other 409 the services
// throw is a state the request may not change, a 400 FAILED_PRECONDITION.
const ABORTED = new Set(['conflict']);

// The status the CRM's own status stands for.
function statusOf(error: CrmError): ApiErrorStatus {
  if (ABORTED.has(error.code)) return 'ABORTED';
  switch (error.status) {
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'PERMISSION_DENIED';
    case 404:
      return 'NOT_FOUND';
    case 409:
      // The assistant cannot take the work now: a dependency is down.
      return error.code === 'assistantUnavailable'
        ? 'UNAVAILABLE'
        : 'FAILED_PRECONDITION';
    // The model provider failed.
    case 502:
    case 503:
      return 'UNAVAILABLE';
    // The users plugin refused what the demo import asked of it; its
    // explanation travels in metadata.detail.
    case 500:
      return 'FAILED_PRECONDITION';
    default:
      return 'INVALID_ARGUMENT';
  }
}

export function crmApiError(error: CrmError): ApiError {
  const status = statusOf(error);
  return new ApiError({
    status,
    reason: reasonOf(error.code),
    domain: CRM_ERROR_DOMAIN,
    message: `The CRM refused the request: ${error.code}${error.field ? ` (${error.field})` : ''}.`,
    ...(error.field && status === 'INVALID_ARGUMENT'
      ? {
          fieldViolations: [
            { field: error.field, description: `Refused: ${error.code}.` },
          ],
        }
      : {}),
    ...(error.field || error.detail
      ? {
          metadata: {
            ...(error.field ? { field: error.field } : {}),
            ...(error.detail ? { detail: error.detail } : {}),
          },
        }
      : {}),
  });
}

// What a route throws that the CRM recognises, as an ApiError; anything
// else is left for the application's handler (a 500 INTERNAL_ERROR).
export function toApiError(error: unknown): unknown {
  if (error instanceof CrmError) return crmApiError(error);
  // A body that is not JSON.
  if (error instanceof SyntaxError)
    return new ApiError({
      status: 'INVALID_ARGUMENT',
      reason: 'INVALID_INPUT',
      domain: CRM_ERROR_DOMAIN,
      message: 'The request body is not valid JSON.',
    });
  return error;
}
