import { z } from 'zod';
import {
  definitions,
  extraFields,
  type Entity,
  type Field,
} from '../../providers/crm/schema.js';
import { ROLES } from '../../providers/crm/opportunity-capture.js';
import {
  AiStates,
  HistoryEntry,
  JsonObject,
  PageQuery,
  TitlesShape,
} from './common.js';

// The six objects' records, their input and their list filters, built from
// the object definitions (`definitions` in providers/crm/schema.ts), so a
// field added there is documented and accepted here without a second list.
// The service stays the judge of every value: a select's options can be
// extended on the settings page and an unchanged legacy value is kept, so
// the schemas check types and leave the rules to it.

export interface ObjectNames {
  // `lead`, as in `getLead`.
  one: string;
  // `Leads`, as in `listLeads` and the tag.
  many: string;
  // The id's path parameter.
  param: string;
}
export const objectNames: Record<Entity, ObjectNames> = {
  leads: { one: 'Lead', many: 'Leads', param: 'leadId' },
  companies: { one: 'Company', many: 'Companies', param: 'companyId' },
  contacts: { one: 'Contact', many: 'Contacts', param: 'contactId' },
  opportunities: {
    one: 'Opportunity',
    many: 'Opportunities',
    param: 'opportunityId',
  },
  tasks: { one: 'Task', many: 'Tasks', param: 'taskId' },
  approvals: { one: 'Approval', many: 'Approvals', param: 'approvalId' },
};

// An opportunity's contact: who, and their part in the deal.
export const OpportunityContact = z
  .object({
    contactId: z.string(),
    role: z.enum(ROLES),
  })
  .meta({ ref: 'CrmOpportunityContact' });

function describe(field: Field): string {
  const parts: string[] = [];
  if (field.options && field.type === 'select')
    parts.push(`One of: ${field.options.join(', ')} (extensible in settings).`);
  if (field.type === 'country') parts.push('An ISO 3166-1 alpha-2 code.');
  if (field.type === 'subdivision')
    parts.push('An ISO 3166-2 code, or a name taken for its code.');
  if (field.type === 'date') parts.push('A date (RFC 3339).');
  if (field.type === 'datetime') parts.push('An RFC 3339 time.');
  if (field.relation) parts.push(`The id of a record of ${field.relation}.`);
  if (field.type === 'multi' && field.relation === 'users')
    parts.push('User ids.');
  if (field.type === 'files') parts.push('Attachment ids.');
  if (field.required) parts.push('Required.');
  return parts.join(' ');
}

function valueOf(field: Field): z.ZodType {
  switch (field.type) {
    case 'number':
      return z.number().nullable();
    case 'boolean':
      return z.boolean().nullable();
    case 'multi':
    case 'files':
      return z.array(z.string());
    case 'contacts':
      return z.array(OpportunityContact);
    default:
      return z.string().nullable();
  }
}

function withDescription(field: Field, schema: z.ZodType): z.ZodType {
  const description = describe(field);
  return description ? schema.meta({ description }) : schema;
}

// What a record holds; every field but the id is optional, since a reader
// gets only the fields their permission set lets them read.
function recordSchema(entity: Entity) {
  const shape: Record<string, z.ZodType> = {
    id: z.string(),
    name: z.string().optional(),
    ownerId: z.string().optional(),
    createdById: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  };
  for (const field of definitions[entity].fields)
    if (!(field.key in shape))
      shape[field.key] = withDescription(field, valueOf(field)).optional();
  for (const key of extraFields[entity] ?? [])
    if (!(key in shape)) shape[key] = z.string().nullable().optional();
  return z.object(shape).meta({ ref: `Crm${objectNames[entity].one}` });
}

// What a create or an update may set: the object's own fields, each
// optional (a create fills defaults; an update sends only what changes).
function inputSchema(entity: Entity) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of definitions[entity].fields)
    shape[field.key] = withDescription(field, valueOf(field)).optional();
  return z
    .strictObject(shape)
    .meta({ ref: `Crm${objectNames[entity].one}Input` });
}

const entityList = Object.keys(definitions) as Entity[];
export const RecordSchemas = Object.fromEntries(
  entityList.map((entity) => [entity, recordSchema(entity)]),
) as Record<Entity, ReturnType<typeof recordSchema>>;
export const InputSchemas = Object.fromEntries(
  entityList.map((entity) => [entity, inputSchema(entity)]),
) as Record<Entity, ReturnType<typeof inputSchema>>;

// The filters a list, its statistics and its export take, for the objects
// that have each.
const id = (description: string) => z.string().optional().meta({ description });
function filterShape(entity: Entity): Record<string, z.ZodType> {
  const keys = new Set(definitions[entity].fields.map((f) => f.key));
  const has = (key: string) => keys.has(key) || key === 'ownerId';
  const status = definitions[entity].statusField;
  return {
    q: z.string().max(200).optional().meta({
      description:
        'Search: a phone number whole, anything else word by word across name, company, email, phone and website.',
    }),
    ...(status
      ? {
          status: z
            .string()
            .optional()
            .meta({ description: `Only this ${status}.` }),
          excludeStatus: z
            .string()
            .optional()
            .meta({ description: `Everything but this ${status}.` }),
        }
      : {}),
    ...Object.fromEntries(
      (
        [
          ['ownerId', 'Owned by this user.'],
          ['companyId', 'Of this company.'],
          ['leadId', 'Linked to this lead.'],
          ['opportunityId', 'Linked to this opportunity.'],
          ['approverId', 'Decided by this user.'],
        ] as const
      )
        .filter(([key]) => has(key))
        .map(([key, description]) => [key, id(description)]),
    ),
    ...(has('source') ? { source: z.string().optional() } : {}),
    ...(has('topic') ? { topic: z.string().optional() } : {}),
    ...(entity === 'opportunities'
      ? { contactId: id('With this contact among its people.') }
      : {}),
    ...(entity === 'contacts'
      ? {
          // Empty is every contact: the list page sends its filters
          // whether set or not.
          employed: z
            .enum(['true', 'false', ''])
            .optional()
            .meta({ description: 'Still at the company, or no longer.' }),
        }
      : {}),
    ...(entity === 'tasks'
      ? {
          participantId: id('With this user among its participants.'),
          involvedId: id('Owned by this user or with them taking part.'),
          dueFrom: z
            .string()
            .optional()
            .meta({ description: 'Due at or after this RFC 3339 time.' }),
          dueTo: z
            .string()
            .optional()
            .meta({ description: 'Due at or before this RFC 3339 time.' }),
        }
      : {}),
    from: z
      .string()
      .optional()
      .meta({ description: 'Created at or after this RFC 3339 time.' }),
    to: z
      .string()
      .optional()
      .meta({ description: 'Created at or before this RFC 3339 time.' }),
    ids: z.string().optional().meta({
      description:
        'Only these records, comma-separated; empty matches nothing.',
    }),
  };
}
export const FilterQueries = Object.fromEntries(
  entityList.map((entity) => [entity, z.object(filterShape(entity))]),
) as unknown as Record<Entity, z.ZodObject>;
export const ListQueries = Object.fromEntries(
  entityList.map((entity) => [
    entity,
    z.object({
      ...filterShape(entity),
      ...PageQuery.shape,
      orderBy: z.string().optional().meta({
        description:
          'A field the reader may read, `-` before it for descending; newest first by default.',
      }),
    }),
  ]),
) as unknown as Record<Entity, z.ZodObject>;

export const RecordParams = Object.fromEntries(
  entityList.map((entity) => [
    entity,
    z.object({ [objectNames[entity].param]: z.string() }),
  ]),
) as unknown as Record<Entity, z.ZodObject>;

// Creating a lead or an opportunity: whether the AI follows it up at once,
// and whether it was organised by the AI from pasted text.
export const CreateQuery = z.object({
  followUp: z.enum(['true', 'false']).optional().meta({
    description:
      'Leads and opportunities: `false` keeps the AI from following the new record up at once.',
  }),
  via: z.enum(['capture']).optional().meta({
    description:
      'Leads and opportunities: `capture` records the creation as organised by the AI from pasted text and checked by the person.',
  }),
});

// A record's page: the record, the first page of its history and of each
// related list, what a delete would touch, and what the reader may do.
export const RecordDetail = (entity: Entity) =>
  z
    .object({
      record: RecordSchemas[entity],
      history: z.array(HistoryEntry),
      historyTotal: z.number().int().optional(),
      related: z
        .record(z.string(), z.array(JsonObject))
        .meta({
          description: 'The first page of each related list, by object.',
        }),
      relatedTotals: z.record(z.string(), z.number().int()).optional(),
      blockers: z.record(z.string(), z.number().int()).optional().meta({
        description: 'What a delete would orphan, counted per object.',
      }),
      unlinks: z.record(z.string(), z.number().int()).optional().meta({
        description: 'Records a delete would edit, counted per object.',
      }),
      permissions: z.object({
        edit: z.boolean(),
        delete: z.boolean(),
        approve: z.boolean(),
      }),
      ...TitlesShape,
    })
    .meta({ ref: `Crm${objectNames[entity].one}Detail` });

export const Statistics = z
  .object({
    metrics: z
      .record(z.string(), z.number().nullable())
      .meta({ description: 'Counts and rates, by name; `total` always.' }),
    statuses: z.array(z.object({ status: z.string(), count: z.number() })),
    members: z.record(z.string(), z.array(z.string())).optional().meta({
      description: 'The ids behind each count that lists records.',
    }),
  })
  .meta({ ref: 'CrmStatistics' });

export const ImportBody = (entity: Entity) =>
  z.strictObject({
    rows: z
      .array(InputSchemas[entity])
      .min(1)
      .max(500)
      .meta({ description: 'The records to create, at most 500.' }),
  });

export const HistoryQuery = z.object({
  ...PageQuery.shape,
  source: z.string().optional().meta({
    description: 'Only entries of this source (`ai`, `mail` …).',
  }),
  action: z.string().optional().meta({
    description: 'Only entries of this action (`comment` …).',
  }),
});

export { AiStates };
