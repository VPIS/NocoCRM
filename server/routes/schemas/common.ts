import { z } from 'zod';
import type { Titles } from '../../providers/crm/titles.js';

// Schemas every CRM route shares: paging, the names a response resolves for
// the records it refers to, and the entries of a record's activity feed.

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const PageQuery = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .meta({ description: 'The page, from 1.' }),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE)
    .meta({ description: 'Records per page, at most 100.' }),
});

// A JSON object whose keys depend on the case: what changed in a record
// (its own fields, which differ per object), a comment's text and mentions,
// or the AI's result, whose shape depends on its kind.
export const JsonObject = z.record(z.string(), z.unknown());

// Names of the records a response refers to, by id: `titles` composed
// ("company / deal"), `names` bare.
export const TitlesShape = {
  titles: z
    .record(z.string(), z.string())
    .meta({ description: 'Composed names by record id ("company / deal").' }),
  names: z
    .record(z.string(), z.string())
    .meta({ description: 'Bare names by record id.' }),
  opportunities: z
    .record(z.string(), z.object({ amount: z.number(), currency: z.string() }))
    .optional()
    .meta({
      description:
        'The size of the opportunities the response refers to, by id; present when it refers to any.',
    }),
};
export const TitlesSchema: z.ZodType<Titles> = z.object(TitlesShape);

export const PageMetaShape = {
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
};

// What the AI is doing with each record of a page: following it up
// (`running`) or holding a suggestion that waits for a person (`pending`).
export const AiStates = z
  .record(z.string(), z.enum(['running', 'pending']))
  .meta({
    description:
      'Leads and opportunities the AI is following up (`running`) or has a suggestion waiting on (`pending`); approvals whose review is being written or waits, for their approver.',
  });

export const ListMeta = z
  .object({ ...PageMetaShape, ...TitlesShape, ai: AiStates.optional() })
  .meta({ ref: 'CrmListMeta' });

export const HistoryMeta = z
  .object({ ...PageMetaShape, ...TitlesShape })
  .meta({ ref: 'CrmHistoryMeta' });

// One entry of a record's activity feed: a change, a comment, mail, or the
// AI's work.
export const HistoryEntry = z
  .object({
    id: z.string(),
    entity: z.string(),
    recordId: z.string(),
    actorId: z.string().meta({ description: 'Who did it.' }),
    action: z.string().meta({
      description:
        'What happened: `create`, `update`, `status`, `comment`, `mail`, `ai` and others.',
    }),
    fromValue: z.string().nullable().optional(),
    toValue: z.string().nullable().optional(),
    changes: JsonObject.nullable()
      .optional()
      .meta({ description: 'The new values, or the comment.' }),
    previous: JsonObject.nullable()
      .optional()
      .meta({ description: 'The values an update replaced.' }),
    source: z.string().nullable().optional().meta({
      description:
        "Empty for a person, `assistant` for an AI proposal a person confirmed, `capture` for what the AI organised, `ai` for the AI's own work, `mail` for mail.",
    }),
    aiStatus: z.string().nullable().optional(),
    ai: JsonObject.nullable().optional(),
    replyToId: z.string().nullable().optional(),
    occurredAt: z.string().nullable().optional(),
    createdAt: z.string(),
  })
  .meta({ ref: 'CrmHistoryEntry' });
