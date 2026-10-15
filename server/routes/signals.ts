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
  CompanySignals,
  DecideSignalInput,
  Signal,
  SignalCheck,
  WatchCompanyInput,
} from './schemas/signals.js';

// A company's signals (company-signals.ts): read by whoever may read the
// company; watched, checked at once and marked seen or dismissed by
// whoever may edit it.
export function registerSignalRoutes(
  app: Application,
  router: Hono<CrmEnv>,
): void {
  const signals = () => app.container.resolve(companySignalsToken);
  const tags = ['Companies'];
  router.get(
    '/companies/:companyId/signals',
    describeRoute({
      tags,
      summary: "List a company's signals",
      operationId: 'listCompanySignals',
      description:
        'Newest first, with whether the company is checked daily and when it was last checked.',
      responses: {
        '200': dataResponse(CompanySignals),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    async (c) =>
      c.json({
        data: await signals().of(c.get('actor'), c.req.param('companyId')),
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
      summary: 'Mark a signal seen or dismiss it',
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
