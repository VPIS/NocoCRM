import {
  authenticationToken,
  type AuthEnv,
} from '@nocobase/app-plugin-authentication';
import {
  agentsToken,
  isReadingAction,
  runIdentityOf,
} from '@nocobase/app-plugin-agents/server/tokens';
import {
  authorizationToken,
  type AuthorizationEnv,
} from '@nocobase/app-plugin-authorization';
import type { Application } from '@nocobase/app-server/application';
import {
  ApiError,
  apiErrorHandler,
  cliRoute,
  declaredRouteActionOf,
  type CliRouteOptions,
  type OpenAPIV3_1,
} from '@nocobase/app-server/router';
import type { ErrorHandler, MiddlewareHandler } from 'hono';
import type { Actor } from '../providers/crm/authorization.js';
import { leadEvaluatorToken } from '../providers/crm/lead-evaluation.js';
import { opportunityEvaluatorToken } from '../providers/crm/opportunity-evaluation.js';
import { approvalReviewerToken } from '../providers/crm/approval-review.js';
import { CrmError } from '../providers/crm/schema.js';
import { CRM_ERROR_DOMAIN, toApiError } from './errors.js';
import { PLAN_ACTION } from '../providers/crm-agents/actions.js';

// What every CRM route shares: the signed-in user as the services' actor,
// and the CRM's errors in the standard body.

export type CrmEnv = {
  Variables: AuthEnv['Variables'] &
    AuthorizationEnv['Variables'] & { actor: Actor };
};

// The credentials a route a run may call accepts: a person's session or API
// key, and an agent's run token (the Agents plugin). Every such route names
// its business action in `cliRoute({ action })`.
export const RUN_SECURITY: OpenAPIV3_1.SecurityRequirementObject[] = [
  { cookieAuth: [] },
  { apiKeyAuth: [] },
  { runToken: [] },
];

// What a route an agent's run may call declares: the credentials above and
// the command's business action (crm-agents/actions.ts), which the guard
// checks against what the run holds.
export const runCommand = (
  action: string,
  options: Omit<CliRouteOptions, 'action'> = {},
): {
  security: OpenAPIV3_1.SecurityRequirementObject[];
} & ReturnType<typeof cliRoute> => ({
  security: RUN_SECURITY,
  ...cliRoute({ ...options, action }),
});

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
  // An agent's run acts as the person who woke it, kept to the actions its
  // agent holds (crm-agents/gate.ts): the route's action is checked here,
  // since the router only filters the commands it offers. A run never writes:
  // every change it asks for is refused with PLAN_REQUIRED, and it proposes
  // the change as a plan the person confirms (migration step 2: every agent
  // starts at suggesting, guideline 3.5).
  const run: MiddlewareHandler<CrmEnv> = async (c, next) => {
    const identity = runIdentityOf(c.get('auth'));
    if (!identity) return next();
    const action = declaredRouteActionOf(c);
    const allowed =
      action && app.container.has(agentsToken)
        ? await app.container.resolve(agentsToken).gate.allowed(identity)
        : new Set<string>();
    if (!action || !allowed.has(action))
      throw new ApiError({
        status: 'PERMISSION_DENIED',
        reason: 'ACTION_NOT_ALLOWED',
        domain: CRM_ERROR_DOMAIN,
        message: `This agent may not ${action ?? 'call this route'}.`,
        metadata: { action: action ?? '' },
      });
    if (!isReadingAction(action) && action !== PLAN_ACTION)
      throw new ApiError({
        status: 'FAILED_PRECONDITION',
        reason: 'PLAN_REQUIRED',
        domain: CRM_ERROR_DOMAIN,
        message:
          'An agent does not change records: propose the change as a plan for the person to confirm.',
        metadata: { reason: 'alwaysConfirm', action },
      });
    return next();
  };
  return [
    // A run's token and a scoped API key are scoped credentials: the CRM's
    // routes accept them, a run's only where a route's security lists it.
    app.container.resolve(authenticationToken).required({ scopedKeys: true }),
    app.container.resolve(authorizationToken).middleware(),
    actor,
    run,
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
