import { z } from 'zod';

// The company's WhatsApp number (whatsapp/service.ts): its connection, the
// conversations with customers, their messages.

export const WhatsAppNumber = z
  .object({
    id: z.string(),
    phoneNumberId: z.string().describe("Meta's phone number id."),
    wabaId: z.string().nullable(),
    mode: z
      .string()
      .describe(
        "api: a number on the Cloud API alone; coexistence: one also used on the WhatsApp Business app; demo: the demo dataset's.",
      ),
    displayPhone: z.string().nullable(),
    displayName: z.string().nullable(),
    qualityRating: z.string().nullable(),
    status: z.string().nullable(),
    messagingLimit: z.string().nullable(),
    hasAccessToken: z.boolean(),
    connectedAt: z.string().nullable(),
    lastWebhookAt: z
      .string()
      .nullable()
      .describe('When a delivery for it last came in.'),
    conversations: z
      .number()
      .describe('Its conversations, which keep it from being removed.'),
  })
  .meta({ ref: 'CrmWhatsAppNumber' });

export const WhatsAppConnection = z
  .object({
    configured: z
      .boolean()
      .describe('The app secret and a number with its access token are set.'),
    hasAppSecret: z.boolean(),
    verifyToken: z
      .string()
      .nullable()
      .describe("To enter in the Meta app's webhook settings."),
    webhookPath: z
      .string()
      .describe(
        "The webhook's path under the deployment's public address, for Meta's callback URL, the same for every number.",
      ),
    secretsReady: z
      .boolean()
      .describe('Whether the secrets service can seal credentials.'),
    numbers: z.array(WhatsAppNumber),
    demoNumbers: z
      .array(WhatsAppNumber)
      .describe(
        "The demo dataset's numbers: shown with their conversations, receiving nothing and changed by no number route.",
      ),
  })
  .meta({ ref: 'CrmWhatsAppConnection' });

export const SaveWhatsAppApp = z.strictObject({
  appSecret: z
    .string()
    .max(256)
    .optional()
    .describe(
      "The Meta app's secret, which signs every number's deliveries; left out to keep the stored one.",
    ),
});

const numberFields = {
  wabaId: z.string().max(32).nullable().optional(),
  mode: z.enum(['api', 'coexistence']).optional(),
};
export const AddWhatsAppNumber = z.strictObject({
  phoneNumberId: z.string().min(1).max(32),
  accessToken: z.string().min(1).max(1024),
  ...numberFields,
});
export const UpdateWhatsAppNumber = z.strictObject({
  phoneNumberId: z.string().min(1).max(32).optional(),
  accessToken: z
    .string()
    .max(1024)
    .optional()
    .describe('Left out to keep the stored one.'),
  ...numberFields,
});
export const NumberParams = z.object({ numberId: z.string() });

export const WhatsAppCheck = z.union([
  z.object({
    ok: z.literal(true),
    standing: z.object({
      displayPhone: z.string().optional(),
      displayName: z.string().optional(),
      qualityRating: z.string().optional(),
      status: z.string().optional(),
      messagingLimit: z.string().optional(),
    }),
  }),
  z.object({
    ok: z.literal(false),
    reason: z
      .string()
      .describe('notConfigured, network, or http_<status> from Meta.'),
  }),
]);

export const WhatsAppHealth = z.object({
  received: z.number(),
  processed: z.number(),
  pending: z.number(),
  failed: z.number(),
  failures: z.array(z.object({ error: z.string(), count: z.number() })),
  mediaPending: z.number(),
  mediaUnavailable: z.number(),
});

export const WhatsAppMessage = z
  .object({
    id: z.string(),
    conversationId: z.string(),
    direction: z.enum(['in', 'out']),
    origin: z.string(),
    type: z.string(),
    text: z.string().nullable(),
    caption: z.string().nullable(),
    media: z
      .object({
        status: z.enum(['pending', 'stored', 'unavailable']),
        fileId: z.string().nullable(),
        url: z
          .string()
          .nullable()
          .describe('The stored file, through the attachments content route.'),
        mimeType: z.string().nullable(),
        filename: z.string().nullable(),
      })
      .nullable(),
    replyTo: z.string().nullable(),
    status: z.string().nullable(),
    sentById: z.string().nullable(),
    editedAt: z
      .string()
      .nullable()
      .describe('When the team edited it on the WhatsApp Business app.'),
    revokedAt: z
      .string()
      .nullable()
      .describe('When the team deleted it on the WhatsApp Business app.'),
    occurredAt: z.string(),
  })
  .meta({ ref: 'CrmWhatsAppMessage' });

export const WhatsAppCustomer = z
  .object({
    id: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
    username: z.string().nullable(),
    profileName: z.string().nullable(),
    state: z.enum(['unlinked', 'linked', 'dismissed', 'spam']),
    leadId: z.string().nullable(),
    contactId: z.string().nullable(),
    matchedBy: z.string().nullable(),
  })
  .meta({ ref: 'CrmWhatsAppCustomer' });

export const WhatsAppNumberLabel = z
  .object({
    id: z.string(),
    phone: z.string().describe("Its display number, else Meta's id."),
    name: z.string().nullable(),
    mode: z.string().describe('api, coexistence or demo.'),
  })
  .meta({ ref: 'CrmWhatsAppNumberLabel' });

export const WhatsAppConversationRow = z.object({
  id: z.string(),
  numberId: z.string(),
  number: WhatsAppNumberLabel.nullable().describe(
    'The company number the conversation is on.',
  ),
  waContactId: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  state: z.string(),
  leadId: z.string().nullable(),
  contactId: z.string().nullable(),
  lastInboundAt: z.string().nullable(),
  lastMessageAt: z.string().nullable(),
  lastDirection: z.string().nullable(),
  unreadCount: z
    .number()
    .describe(
      "Awaiting a reply: the customer's messages since the team's last reply, 0 once answered.",
    ),
  last: z
    .object({
      type: z
        .string()
        .describe(
          "The message's type, or `revoked` for one the team deleted on the WhatsApp Business app (its words then null).",
        ),
      text: z.string().nullable(),
      caption: z.string().nullable(),
      direction: z.string(),
      occurredAt: z.string(),
    })
    .nullable(),
});

export const WhatsAppConversation = z.object({
  id: z.string(),
  number: WhatsAppNumberLabel.nullable().describe(
    'The company number the conversation is on.',
  ),
  record: z
    .object({
      entity: z.enum(['leads', 'contacts']),
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .describe(
      'The lead or contact the customer is linked to, as pages name it; null when none or not readable.',
    ),
  lastInboundAt: z.string().nullable(),
  unreadCount: z.number(),
  contact: WhatsAppCustomer,
  messages: z.array(WhatsAppMessage),
  more: z.boolean().describe('Earlier messages exist (ask with `before`).'),
});

export const ConversationsQuery = z.object({
  view: z.enum(['all', 'unlinked']).default('all'),
  numberId: z
    .string()
    .optional()
    .meta({ description: "One number's conversations alone." }),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const MessagesQuery = z.object({
  before: z
    .string()
    .optional()
    .describe('Only messages earlier than this instant.'),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const ConversationParams = z.object({ conversationId: z.string() });

export const LinkConversationInput = z.union([
  z.strictObject({ leadId: z.string() }),
  z.strictObject({ contactId: z.string() }),
  z.strictObject({ state: z.enum(['unlinked', 'dismissed', 'spam']) }),
]);

export const RecordMessagesQuery = MessagesQuery.extend({
  person: z
    .string()
    .optional()
    .describe(
      "Whose conversation, a customer of the record's (`people[].id`); the one who wrote last when left out.",
    ),
});

export const RecordMessages = z.object({
  messages: z.array(
    WhatsAppMessage.and(z.object({ waContactId: z.string().nullable() })),
  ),
  more: z.boolean(),
  people: z
    .array(
      WhatsAppCustomer.and(
        z.object({
          messageCount: z.number(),
          lastMessageAt: z.string().nullable(),
        }),
      ),
    )
    .describe("The record's people on WhatsApp, the latest to write first."),
  person: z
    .string()
    .nullable()
    .describe('Whose conversation `messages` are: one person at a time.'),
});
