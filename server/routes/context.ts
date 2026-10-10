import { authenticationToken } from '@nocobase/app-plugin-authentication';
import {
  authorizationToken,
  type AuthorizationEnv,
} from '@nocobase/app-plugin-authorization';
import type { Application } from '@nocobase/app-server/application';
import { apiErrorHandler } from '@nocobase/app-server/router';
import type { ErrorHandler, MiddlewareHandler } from 'hono';
import type { Actor } from '../providers/crm/authorization.js';
import { leadEvaluatorToken } from '../providers/crm/lead-evaluation.js';
import { opportunityEvaluatorToken } from '../providers/crm/opportunity-evaluation.js';
import { approvalReviewerToken } from '../providers/crm/approval-review.js';
import { CrmError } from '../providers/crm/schema.js';
import { toApiError } from './errors.js';

// What every CRM route shares: the signed-in user as the services' actor,
// and the CRM's errors in the standard body.

export type CrmEnv = {
  Variables: AuthorizationEnv['Variables'] & { actor: Actor };
};

// Authentication, the authorization scope, and the actor the services take:
// the user with the scope and the language they read in.
export function crmGuard(app: Application) {
  const actor: MiddlewareHandler<CrmEnv> = async (c, next) => {
    const scope = c.get('authz');
    const id = scope.identity.principal?.id;
    if (!id) throw new CrmError('unauthorized', 401);
    c.set('actor', {
      id,
      scope,
      locale: c.req.header('accept-language')?.startsWith('zh')
        ? 'zh-CN'
        : 'en-US',
    });
    await next();
  };
  return [
    app.container.resolve(authenticationToken).required(),
    app.container.resolve(authorizationToken).middleware(),
    actor,
  ] as const;
}

// The CRM's errors in the standard body (errors.ts); anything else is the
// application's to answer.
export const crmErrorHandler: ErrorHandler<CrmEnv> = (error, c) =>
  apiErrorHandler(toApiError(error), c);

// The AI's workers, absent while the AI Employee plugin is not registered
// (and in tests that do not provide them).
export function aiWorkers(app: Application) {
  const { container } = app;
  return {
    leads: () =>
      container.has(leadEvaluatorToken)
        ? container.resolve(leadEvaluatorToken)
        : undefined,
    opportunities: () =>
      container.has(opportunityEvaluatorToken)
        ? container.resolve(opportunityEvaluatorToken)
        : undefined,
    approvals: () =>
      container.has(approvalReviewerToken)
        ? container.resolve(approvalReviewerToken)
        : undefined,
  };
}
