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
  SaveWhatsAppConnection,
  WhatsAppCheck,
  WhatsAppConnection,
  WhatsAppConversation,
  WhatsAppConversationRow,
  WhatsAppHealth,
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
        "The number connected and what to enter in Meta's webhook settings; credentials are never returned. For whoever manages the CRM's settings.",
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
      summary: 'Save the WhatsApp connection',
      operationId: 'saveWhatsAppConnection',
      description:
        "The number's ids, the system user's access token and the app secret, sealed on the server; a credential left out is kept. Needs the secrets service's keys.",
      responses: {
        '200': dataResponse(WhatsAppConnection),
        ...apiErrorResponses,
        '503': apiErrorResponse(503, 'No secrets key is configured.'),
      },
    }),
    apiValidator('json', SaveWhatsAppConnection),
    async (c) => {
      await manage(c);
      return c.json({
        data: withBase(await whatsapp().saveConnection(c.req.valid('json'))),
      });
    },
  );
  router.post(
    '/whatsapp/connection/check',
    describeRoute({
      tags,
      summary: 'Check the WhatsApp number',
      operationId: 'checkWhatsAppConnection',
      description:
        "Reads the number's standing from Meta (name, quality, limit) with the stored token, and saves it.",
      responses: {
        '200': dataResponse(WhatsAppCheck),
        ...apiErrorResponses,
      },
    }),
    async (c) => {
      await manage(c);
      return c.json({ data: await whatsapp().check() });
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
    '/whatsapp/unreadCount',
    describeRoute({
      tags,
      summary: 'Count unread WhatsApp messages',
      operationId: 'countUnreadWhatsAppMessages',
      description:
        'The unread messages in the conversations the reader answers; 0 without the WhatsApp page.',
      responses: {
        '200': dataResponse(z.object({ count: z.number() })),
        ...apiErrorResponses,
      },
    }),
    async (c) =>
      c.json({ data: { count: await whatsapp().unreadCount(c.get('actor')) } }),
  );
  router.get(
    '/whatsapp/conversations',
    describeRoute({
      tags,
      summary: 'List WhatsApp conversations',
      operationId: 'listWhatsAppConversations',
      description:
        "Newest first: the reader's own (`mine`), those linked to no record (`unlinked`), or all they may read.",
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
