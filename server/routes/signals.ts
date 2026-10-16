import type { Application } from '@nocobase/app-server/application';
import {
  apiErrorResponse,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  describeRoute,
} from '@nocobase/app-server/router';
import type { Hono } from 'hono';
import { companySignalsToken } from '../providers/crm/company-signals.js';
import type { CrmEnv } from './context.js';
import {
  CompanyProfile,
  CompanyProfileInput,
  CompanySignals,
  CompanySignalsQuery,
  DecideSignalInput,
  Signal,
  SignalCheck,
  WatchCompanyInput,
} from './schemas/signals.js';

// A company's signals (company-signals.ts): read by whoever may read the
// company; watched, checked at once and dismissed by
// whoever may edit it.
export function registerSignalRoutes(
  app: Application,
  router: Hono<CrmEnv>,
): void {
  const signals = () => app.container.resolve(companySignalsToken);
  const tags = ['Companies'];
  router.post(
    '/companies/capture',
    describeRoute({
      tags,
      summary: 'Look a new company up on the web',
      operationId: 'captureCompany',
      description:
        "New company with the AI: searches the web for the company named and returns the form's values found, the fields it was unsure of, the pages it read and the companies the reader may see by that name. Saves nothing. Needs the right to create companies and the Company signals agent's model (without one, 400 FAILED_PRECONDITION with reason SIGNALS_UNAVAILABLE); a failed search is 503 UNAVAILABLE with reason SIGNALS_FAILED.",
      responses: {
        '200': dataResponse(CompanyProfile),
        ...apiErrorResponses,
        '503': apiErrorResponse(503),
      },
    }),
    apiValidator('json', CompanyProfileInput),
    async (c) =>
      c.json({
        data: await signals().profile(c.get('actor'), c.req.valid('json')),
      }),
  );
  router.get(
    '/companies/:companyId/signals',
    describeRoute({
      tags,
      summary: "List a company's signals",
      operationId: 'listCompanySignals',
      description:
        'A page of them, those not dismissed first and the newest events first, with how many there are (all, not dismissed, new), whether the company is checked daily and when it was last checked. `until` widens the first page to reach that signal.',
      responses: {
        '200': dataResponse(CompanySignals),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('query', CompanySignalsQuery),
    async (c) =>
      c.json({
        data: await signals().of(
          c.get('actor'),
          c.req.param('companyId'),
          c.req.valid('query'),
        ),
      }),
  );
  router.put(
    '/companies/:companyId/signals/watch',
    describeRoute({
      tags,
      summary: 'Watch a company for signals',
      operationId: 'watchCompanySignals',
      description:
        'Switches the daily check of a company without an open deal on or off. Needs edit access to the company.',
      responses: {
        '200': dataResponse(CompanySignals),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('json', WatchCompanyInput),
    async (c) =>
      c.json({
        data: await signals().watch(
          c.get('actor'),
          c.req.param('companyId'),
          c.req.valid('json').watched,
        ),
      }),
  );
  router.post(
    '/companies/:companyId/signals/check',
    describeRoute({
      tags,
      summary: 'Check a company for signals now',
      operationId: 'checkCompanySignals',
      description:
        'Searches the web for the company now and keeps the new signals found. Needs edit access to the company and the Qwen model service (without it, 400 FAILED_PRECONDITION with reason SIGNALS_UNAVAILABLE); a failed search is 503 UNAVAILABLE with reason SIGNALS_FAILED.',
      responses: {
        '200': dataResponse(SignalCheck),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
        '503': apiErrorResponse(503),
      },
    }),
    async (c) =>
      c.json({
        data: await signals().checkNow(
          c.get('actor'),
          c.req.param('companyId'),
        ),
      }),
  );
  router.patch(
    '/signals/:signalId',
    describeRoute({
      tags,
      summary: 'Dismiss a signal or undo it',
      operationId: 'decideSignal',
      description: 'Needs edit access to its company.',
      responses: {
        '200': dataResponse(Signal),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('json', DecideSignalInput),
    async (c) =>
      c.json({
        data: await signals().decide(
          c.get('actor'),
          c.req.param('signalId'),
          c.req.valid('json').status,
        ),
      }),
  );
}
