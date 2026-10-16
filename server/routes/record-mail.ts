import type { Application } from '@nocobase/app-server/application';
import {
  apiErrorResponse,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  describeRoute,
} from '@nocobase/app-server/router';
import type { Hono } from 'hono';
import { z } from 'zod';
import { crmToken } from '../providers/crm/index.js';
import { mailOf } from '../providers/crm/mail-context.js';
import { domainOf, type MailTarget } from '../providers/crm/mail-target.js';
import { dealMailTarget } from '../providers/crm/opportunity-evaluation.js';
import type { Actor } from '../providers/crm/authorization.js';
import { toText, type CrmRecord } from '../providers/crm/schema.js';
import type { CrmService } from '../providers/crm/service.js';
import { recordAction } from '../providers/crm-agents/actions.js';
import { runCommand, type CrmEnv } from './context.js';
import { objectNames, RecordParams } from './schemas/records.js';

// A record's mail as its Mail tab finds it (client crm-entity-detail.tsx):
// a lead's or a contact's address, a company's contacts and its website's
// domain, a deal's contacts (else its company's). Read from the reader's own
// mailboxes only, the newest first, each message's own words without the
// quoted ones: what an agent reads before writing back to a customer.

const MAIL_ENTITIES = [
  'leads',
  'contacts',
  'companies',
  'opportunities',
] as const;

const MailItem = z
  .object({
    at: z.string().nullable(),
    direction: z.enum(['fromCustomer', 'toCustomer']),
    from: z.string().nullable(),
    to: z.array(z.string()),
    subject: z.string().nullable(),
    text: z.string().nullable(),
    attachments: z.boolean().optional(),
  })
  .meta({ ref: 'CrmRecordMail' });

export function registerRecordMailRoutes(
  app: Application,
  router: Hono<CrmEnv>,
): void {
  const service = () => app.container.resolve(crmToken);
  for (const entity of MAIL_ENTITIES) {
    const names = objectNames[entity];
    router.get(
      `/${entity}/:${names.param}/mail`,
      describeRoute({
        tags: [names.many],
        summary: `Read a ${names.one.toLowerCase()}'s mail`,
        operationId: `get${names.one}Mail`,
        description:
          "The mail the reader's own mailboxes exchanged with the record's people in the last 180 days, at most ten messages, newest first, each with its own words (quoted earlier messages left out). Empty without a mailbox.",
        ...runCommand(recordAction(entity, 'view'), {
          command: `${entity} mail`,
        }),
        responses: {
          '200': dataResponse(z.array(MailItem)),
          ...apiErrorResponses,
          '404': apiErrorResponse(404),
        },
      }),
      apiValidator('param', RecordParams[entity]),
      async (c) => {
        const actor = c.get('actor');
        const id = toText(c.req.valid('param')[names.param]);
        const crm = service();
        const record = await crm.get(actor, entity, id);
        const target = await targetOf(crm, actor, entity, record);
        const settings = await crm.settings();
        return c.json({
          data: await mailOf(
            app.container,
            actor.id,
            target,
            settings.timeZone,
          ),
        });
      },
    );
  }
}

async function targetOf(
  crm: CrmService,
  actor: Actor,
  entity: (typeof MAIL_ENTITIES)[number],
  record: CrmRecord,
): Promise<MailTarget> {
  const emails = (records: readonly CrmRecord[]): string[] =>
    records.map((item) => toText(item.email ?? '').trim()).filter(Boolean);
  if (entity === 'opportunities') return dealMailTarget(crm, actor, record);
  if (entity === 'companies') {
    const { data } = await crm.list(actor, 'contacts', {
      companyId: toText(record.id),
      pageSize: 100,
    });
    return { addresses: emails(data), domain: domainOf(record.website) };
  }
  return { addresses: emails([record]) };
}
