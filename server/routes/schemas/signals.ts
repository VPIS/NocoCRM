import { z } from 'zod';
import type {
  CheckResult,
  CompanySignalsView,
  SignalView,
} from '../../providers/crm/company-signals.js';
import { SIGNAL_TYPES } from '../../providers/crm/signal-reading.js';
import { PageQuery } from './common.js';

// Company signals (company-signals.ts): what happened to a company, found
// on the web, with the pages that say so.

export const Signal: z.ZodType<SignalView> = z
  .object({
    id: z.string(),
    companyId: z.string(),
    type: z.string().describe(`One of ${SIGNAL_TYPES.join(', ')}.`),
    title: z.string(),
    summary: z.string(),
    occurredOn: z.string().describe('The day the event happened (YYYY-MM-DD).'),
    sources: z
      .array(z.object({ title: z.string(), url: z.string(), site: z.string() }))
      .describe('The pages the web search read that state it.'),
    status: z
      .enum(['new', 'seen', 'dismissed'])
      .describe(
        'dismissed once someone dismissed it; seen, from before, reads as new.',
      ),
    createdAt: z.string(),
    decidedById: z.string().nullable(),
    decidedAt: z.string().nullable(),
  })
  .meta({ ref: 'CrmSignal' });

export const CompanySignals: z.ZodType<CompanySignalsView> = z
  .object({
    available: z
      .boolean()
      .describe('Whether a web search is configured (the Qwen model service).'),
    watched: z.boolean().describe('Switched on to be checked daily.'),
    inDailyCheck: z
      .boolean()
      .describe('Checked daily: watched, or with an open deal.'),
    checkedAt: z.string().nullable(),
    canEdit: z.boolean(),
    total: z.number().int().describe('All its signals, dismissed or not.'),
    open: z.number().int().describe('Those not dismissed.'),
    fresh: z
      .number()
      .int()
      .describe('Those new: found in the last week and not dismissed.'),
    page: z.number().int(),
    pageSize: z
      .number()
      .int()
      .describe('The page size, widened to reach `until` when given.'),
    signals: z
      .array(Signal)
      .describe('A page: those not dismissed first, the newest events first.'),
  })
  .meta({ ref: 'CrmCompanySignals' });

export const CompanySignalsQuery = z.object({
  ...PageQuery.shape,
  until: z.string().optional().meta({
    description:
      'A signal the first page widens to reach, for opening the list at it.',
  }),
});

export const SignalCheck: z.ZodType<CheckResult> = z
  .object({ found: z.array(Signal) })
  .meta({ ref: 'CrmSignalCheck' });

export const WatchCompanyInput = z
  .object({ watched: z.boolean() })
  .meta({ ref: 'CrmWatchCompanyInput' });

export const DecideSignalInput = z
  .object({
    status: z
      .enum(['dismissed', 'new'])
      .describe(
        'dismissed: the event is not proposed again; new: undoes a dismissal.',
      ),
  })
  .meta({ ref: 'CrmDecideSignalInput' });
