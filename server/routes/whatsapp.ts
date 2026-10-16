import type { Application } from '@nocobase/app-server/application';
import {
  apiErrorResponse,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  defineRootRoutes,
  describeRoute,
  emptyResponse,
  listResponse,
  type AppRootRouteContribution,
} from '@nocobase/app-server/router';
import { Hono } from 'hono';
import { z } from 'zod';
import { bodyLimit } from 'hono/body-limit';
import { capability } from '../providers/crm/authorization.js';
import { CrmError, toText } from '../providers/crm/schema.js';
import { whatsappToken } from '../providers/crm/whatsapp/service.js';
import type { CrmEnv } from './context.js';
import {
  ConversationParams,
  ConversationsQuery,
  LinkConversationInput,
  MessagesQuery,
  RecordMessages,
  AddWhatsAppNumber,
  NumberParams,
  SaveWhatsAppApp,
  UpdateWhatsAppNumber,
  WhatsAppCheck,
  WhatsAppConnection,
  WhatsAppConversation,
  WhatsAppConversationRow,
  WhatsAppHealth,
  WhatsAppNumberLabel,
} from './schemas/whatsapp.js';

// Meta's webhook for the company's WhatsApp number, at the application's
// root (/webhooks/whatsapp, outside /api, answering in Meta's protocol).
// It is public because Meta presents no session: a GET is the subscription
// check, answered with the challenge only for the verify token the CRM made;
// a POST is a delivery, kept only when its X-Hub-Signature-256 is the app
// secret's HMAC of the raw body, and answered at once so Meta does not
// retry. Duplicates are expected (Meta redelivers for up to seven days) and
// dropped when processed, by message id (whatsapp/service.ts).
export const whatsappWebhookRoutes: AppRootRouteContribution<Application> =
  defineRootRoutes((app) => {
    const router = new Hono();
    const whatsapp = () => app.container.resolve(whatsappToken);
    router.get('/webhooks/whatsapp', async (c) => {
      const ok = await whatsapp().challenge(
        c.req.query('hub.mode'),
        c.req.query('hub.verify_token'),
      );
      if (!ok) return c.text('Forbidden', 403);
      return c.text(c.req.query('hub.challenge') ?? '', 200);
    });
    router.post(
      '/webhooks/whatsapp',
      // A delivery is a few kilobytes; Meta never sends media inline.
      bodyLimit({
        maxSize: 3 * 1024 * 1024,
        onError: (c) => c.text('Payload Too Large', 413),
      }),
      async (c) => {
        const body = new Uint8Array(await c.req.raw.arrayBuffer());
        const kept = await whatsapp().accept(
          body,
          c.req.header('x-hub-signature-256'),
        );
        if (!kept) return c.text('Unauthorized', 401);
        return c.text('OK', 200);
      },
    );
    return router;
  });

// The CRM's WhatsApp pages: the connection and its health for whoever
// manages the CRM's settings; the conversations for whoever may read them
// (by the record a customer is linked to, or the WhatsApp page while they
// are linked to none); a record's messages for whoever may read the record.
export function registerWhatsAppRoutes(
  app: Application,
  router: Hono<CrmEnv>,
): void {
  const whatsapp = () => app.container.resolve(whatsappToken);
  const tags = ['WhatsApp'];
  const manage = async (c: {
    get(key: 'actor'): CrmEnv['Variables']['actor'];
  }) => {
    if (!(await capability(c.get('actor'), 'manage', 'settings')))
      throw new CrmError('forbidden', 403);
  };
  // The webhook's path as Meta must call it, under the deployment's base
  // path, as the root routes are mounted.
  const withBase = <T extends { webhookPath: string }>(view: T): T => ({
    ...view,
    webhookPath: `${toText(app.publicBasePath)}${view.webhookPath}`,
  });
  const page = async (c: {
    get(key: 'actor'): CrmEnv['Variables']['actor'];
  }) => {
    if (!(await whatsapp().hasPage(c.get('actor'))))
      throw new CrmError('forbidden', 403);
  };

  router.get(
    '/whatsapp/connection',
    describeRoute({
      tags,
      summary: 'Get the WhatsApp connection',
      operationId: 'getWhatsAppConnection',
      description:
        "The company's numbers, the Meta app's secret set or not, and what to enter in Meta's webhook settings; credentials are never returned. For whoever manages the CRM's settings.",
      responses: {
        '200': dataResponse(WhatsAppConnection),
        ...apiErrorResponses,
      },
    }),
    async (c) => {
      await manage(c);
      return c.json({ data: withBase(await whatsapp().connection()) });
    },
  );
  router.put(
    '/whatsapp/connection',
    describeRoute({
      tags,
      summary: "Save the WhatsApp Meta app's secret",
      operationId: 'saveWhatsAppConnection',
      description:
        "The secret of the Meta app every number comes through, which signs the webhook's deliveries, sealed on the server; left out to keep the stored one. A verify token is made the first time. Needs the secrets service's keys.",
      responses: {
        '200': dataResponse(WhatsAppConnection),
        ...apiErrorResponses,
        '503': apiErrorResponse(503, 'No secrets key is configured.'),
      },
    }),
    apiValidator('json', SaveWhatsAppApp),
    async (c) => {
      await manage(c);
      return c.json({
        data: withBase(await whatsapp().saveApp(c.req.valid('json'))),
      });
    },
  );
  router.post(
    '/whatsapp/numbers',
    describeRoute({
      tags,
      summary: 'Add a WhatsApp number',
      operationId: 'addWhatsAppNumber',
      description:
        "A number of the company's, by Meta's phone number id (unique: 409 with reason NUMBER_EXISTS otherwise), with its access token, sealed on the server, and how it is connected.",
      responses: {
        '200': dataResponse(WhatsAppConnection),
        ...apiErrorResponses,
        '409': apiErrorResponse(409, 'The number is already there.'),
        '503': apiErrorResponse(503, 'No secrets key is configured.'),
      },
    }),
    apiValidator('json', AddWhatsAppNumber),
    async (c) => {
      await manage(c);
      return c.json({
        data: withBase(await whatsapp().addNumber(c.req.valid('json'))),
      });
    },
  );
  router.put(
    '/whatsapp/numbers/:numberId',
    describeRoute({
      tags,
      summary: 'Change a WhatsApp number',
      operationId: 'updateWhatsAppNumber',
      description:
        'Its ids, how it is connected, and its access token (left out to keep the stored one).',
      responses: {
        '200': dataResponse(WhatsAppConnection),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
        '409': apiErrorResponse(409, 'Another number has that id.'),
      },
    }),
    apiValidator('param', NumberParams),
    apiValidator('json', UpdateWhatsAppNumber),
    async (c) => {
      await manage(c);
      return c.json({
        data: withBase(
          await whatsapp().updateNumber(
            c.req.valid('param').numberId,
            c.req.valid('json'),
          ),
        ),
      });
    },
  );
  router.delete(
    '/whatsapp/numbers/:numberId',
    describeRoute({
      tags,
      summary: 'Remove a WhatsApp number',
      operationId: 'removeWhatsAppNumber',
      description:
        "Only while it holds no conversation, its customers' history being the CRM's: 409 with reason NUMBER_IN_USE otherwise.",
      responses: {
        '200': dataResponse(WhatsAppConnection),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
        '409': apiErrorResponse(409, 'The number holds conversations.'),
      },
    }),
    apiValidator('param', NumberParams),
    async (c) => {
      await manage(c);
      return c.json({
        data: withBase(
          await whatsapp().removeNumber(c.req.valid('param').numberId),
        ),
      });
    },
  );
  router.post(
    '/whatsapp/numbers/:numberId/check',
    describeRoute({
      tags,
      summary: 'Check a WhatsApp number',
      operationId: 'checkWhatsAppNumber',
      description:
        "Reads the number's standing from Meta (name, quality, limit) with its stored token, and saves it.",
      responses: {
        '200': dataResponse(WhatsAppCheck),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('param', NumberParams),
    async (c) => {
      await manage(c);
      return c.json({
        data: await whatsapp().check(c.req.valid('param').numberId),
      });
    },
  );
  router.get(
    '/whatsapp/health',
    describeRoute({
      tags,
      summary: "Get the WhatsApp channel's health",
      operationId: 'getWhatsAppHealth',
      description:
        'Deliveries received, processed, waiting and failed with their reasons, and media not yet stored.',
      responses: {
        '200': dataResponse(WhatsAppHealth),
        ...apiErrorResponses,
      },
    }),
    async (c) => {
      await manage(c);
      return c.json({ data: await whatsapp().health() });
    },
  );
  router.post(
    '/whatsapp/health/retry',
    describeRoute({
      tags,
      summary: 'Retry failed WhatsApp deliveries',
      operationId: 'retryWhatsAppDeliveries',
      responses: { '204': emptyResponse(), ...apiErrorResponses },
    }),
    async (c) => {
      await manage(c);
      await whatsapp().retryFailed();
      return c.body(null, 204);
    },
  );

  router.get(
    '/whatsapp/numbers',
    describeRoute({
      tags,
      summary: 'List the WhatsApp numbers',
      operationId: 'listWhatsAppNumbers',
      description:
        "The numbers conversations can be on (the demo's too), named as the pages name them, for the WhatsApp page's filter. For whoever has that page.",
      responses: {
        '200': dataResponse(z.array(WhatsAppNumberLabel)),
        ...apiErrorResponses,
      },
    }),
    async (c) => {
      await page(c);
      return c.json({ data: [...(await whatsapp().numberLabels()).values()] });
    },
  );
  router.get(
    '/whatsapp/conversations',
    describeRoute({
      tags,
      summary: 'List WhatsApp conversations',
      operationId: 'listWhatsAppConversations',
      description:
        'Newest first: all the reader may read, or those linked to no record (`unlinked`).',
      responses: {
        '200': listResponse(WhatsAppConversationRow),
        ...apiErrorResponses,
      },
    }),
    apiValidator('query', ConversationsQuery),
    async (c) => {
      await page(c);
      const { data, total } = await whatsapp().conversations(
        c.get('actor'),
        c.req.valid('query'),
      );
      return c.json({ data, meta: { total } });
    },
  );
  router.get(
    '/whatsapp/conversations/:conversationId',
    describeRoute({
      tags,
      summary: 'Get a WhatsApp conversation',
      operationId: 'getWhatsAppConversation',
      description: 'The customer and a page of messages, oldest first.',
      responses: {
        '200': dataResponse(WhatsAppConversation),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('param', ConversationParams),
    apiValidator('query', MessagesQuery),
    async (c) => {
      await page(c);
      return c.json({
        data: await whatsapp().conversation(
          c.get('actor'),
          c.req.valid('param').conversationId,
          c.req.valid('query'),
        ),
      });
    },
  );
  router.post(
    '/whatsapp/conversations/:conversationId/read',
    describeRoute({
      tags,
      summary: 'Mark a WhatsApp conversation read',
      operationId: 'readWhatsAppConversation',
      description:
        "On a number on the API alone, whose team's replies the CRM does not see, opening it ends its awaiting a reply; on a coexistence number only the team's reply does, and this changes nothing.",
      responses: {
        '204': emptyResponse(),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('param', ConversationParams),
    async (c) => {
      await page(c);
      await whatsapp().markRead(
        c.get('actor'),
        c.req.valid('param').conversationId,
      );
      return c.body(null, 204);
    },
  );
  router.post(
    '/whatsapp/conversations/:conversationId/link',
    describeRoute({
      tags,
      summary: 'Link a WhatsApp customer',
      operationId: 'linkWhatsAppConversation',
      description:
        'Links the customer to a lead or a contact the reader may edit, unlinks them, or sets them aside (dismissed, spam); their timeline lines move with them.',
      responses: {
        '200': dataResponse(WhatsAppConversation),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('param', ConversationParams),
    apiValidator('json', LinkConversationInput),
    async (c) => {
      await page(c);
      return c.json({
        data: await whatsapp().link(
          c.get('actor'),
          c.req.valid('param').conversationId,
          c.req.valid('json'),
        ),
      });
    },
  );

  for (const [entity, param, operationId] of [
    ['leads', 'leadId', 'listLeadWhatsAppMessages'],
    ['contacts', 'contactId', 'listContactWhatsAppMessages'],
    ['companies', 'companyId', 'listCompanyWhatsAppMessages'],
    ['opportunities', 'opportunityId', 'listOpportunityWhatsAppMessages'],
  ] as const)
    router.get(
      `/${entity}/:${param}/whatsappMessages`,
      describeRoute({
        tags,
        summary: `List the WhatsApp messages of a record's people (${entity})`,
        operationId,
        description:
          "A lead's, a contact's, a company's contacts', a deal's contacts', oldest first; for whoever may read the record.",
        responses: {
          '200': dataResponse(RecordMessages),
          ...apiErrorResponses,
          '404': apiErrorResponse(404),
        },
      }),
      apiValidator('query', MessagesQuery),
      async (c) =>
        c.json({
          data: await whatsapp().recordMessages(
            c.get('actor'),
            entity,
            c.req.param(param),
            c.req.valid('query'),
          ),
        }),
    );
}
