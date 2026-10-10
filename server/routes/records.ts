import type { Application } from '@nocobase/app-server/application';
import {
  apiErrorResponse,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  describeRoute,
  emptyResponse,
  listResponse,
} from '@nocobase/app-server/router';
import type { Row } from '@nocobase/db';
import type { Hono } from 'hono';
import { z } from 'zod';
import {
  afterCreate,
  afterUpdate,
  beforeUpdate,
} from '../providers/crm/record-hooks.js';
import { capability } from '../providers/crm/authorization.js';
import { crmToken } from '../providers/crm/index.js';
import { aiStates } from '../providers/crm/lead-evaluation.js';
import { doesTask } from '../providers/crm/task-participants.js';
import {
  CrmError,
  definitions,
  object,
  toText,
  type Entity,
} from '../providers/crm/schema.js';
import { array, type ListOptions } from '../providers/crm/service.js';
import { allRecords, statistics } from '../providers/crm/statistics.js';
import { namedSummary } from '../providers/crm/summary-names.js';
import type { SummaryPeriod } from '../providers/crm/summary.js';
import { resolveTitles } from '../providers/crm/titles.js';
import { aiWorkers, runCommand, type CrmEnv } from './context.js';
import {
  COMMENT_ACTION,
  recordAction,
} from '../providers/crm-agents/actions.js';
import { CommentAttachment, CreateCommentInput } from './schemas/comments.js';
import { HistoryEntry, HistoryMeta, ListMeta } from './schemas/common.js';
import {
  CreateQuery,
  FilterQueries,
  HistoryQuery,
  ImportBody,
  InputSchemas,
  ListQueries,
  objectNames,
  RecordDetail,
  RecordParams,
  RecordSchemas,
  Statistics,
  SummaryQueries,
  SummarySchema,
} from './schemas/records.js';

// The six objects' standard methods and what every one of them has: list,
// get, create, update and delete, its statistics, export and import, its
// activity feed and the comments in it. One route per object rather than a
// `/:entity` parameter, so each operation has its own id, schema and
// command, and nothing at the root is answered as the CRM by accident.
// Permission is the service's: every call reads or writes through
// CrmService as the signed-in user, which refuses what their permission
// set does not allow.

const article = (noun: string) => (/^[AEIOU]/.test(noun) ? 'an' : 'a');

// A list's query as the service takes it: `q` is its search, `orderBy` its
// sort.
export function listOptions(query: Record<string, unknown>): ListOptions {
  const { q, orderBy, ...rest } = query;
  return {
    ...(rest as ListOptions),
    ...(q ? { search: toText(q) } : {}),
    ...(orderBy ? { sort: toText(orderBy) } : {}),
  };
}

export function registerRecordRoutes(
  app: Application,
  router: Hono<CrmEnv>,
  entity: Entity,
): void {
  const service = app.container.resolve(crmToken);
  const ai = aiWorkers(app);
  const names = objectNames[entity];
  const one = names.one.toLowerCase();
  const a = `${article(names.one)} ${one}`;
  const tags = [names.many];
  const base = `/${entity}`;
  const item = `${base}/:${names.param}`;
  const idOf = (params: Record<string, unknown>) => toText(params[names.param]);
  const Record_ = RecordSchemas[entity];
  const Detail = RecordDetail(entity);
  const read = `Returns only what the reader's permission set lets them read.`;
  const command = runCommand;
  const view = recordAction(entity, 'view');
  const notFound = apiErrorResponse(
    404,
    `The ${one} does not exist or the reader may not see it.`,
  );

  router.get(
    `${base}/statistics`,
    describeRoute({
      tags,
      summary: `Get ${one} statistics`,
      operationId: `get${names.one}Statistics`,
      ...command(view, { command: `${entity} statistics` }),
      description: `Counts per status and the figures the ${one} list's cards show, over the ${entity} the filters match. ${read}`,
      responses: { '200': dataResponse(Statistics), ...apiErrorResponses },
    }),
    apiValidator('query', FilterQueries[entity]),
    async (c) =>
      c.json({
        data: await statistics(
          service,
          c.get('actor'),
          entity,
          listOptions(c.req.valid('query')),
        ),
      }),
  );

  router.get(
    `${base}/summary`,
    describeRoute({
      tags,
      summary: `Summarize ${entity}`,
      operationId: `summarize${names.many}`,
      description: `Counts and totals over the ${entity} the filters match, grouped by a field or a period, with sums per currency. ${read}`,
      ...command(view, { command: `${entity} summary` }),
      responses: { '200': dataResponse(SummarySchema), ...apiErrorResponses },
    }),
    apiValidator('query', SummaryQueries[entity]),
    async (c) => {
      const { groupBy, period, measures, ...filters } = c.req.valid('query');
      return c.json({
        data: await namedSummary(
          service,
          c.get('actor'),
          entity,
          listOptions(filters),
          {
            ...(groupBy ? { groupBy: toText(groupBy) } : {}),
            ...(period ? { period: period as SummaryPeriod } : {}),
            ...(measures
              ? {
                  measures: toText(measures)
                    .split(',')
                    .map((m) => m.trim())
                    .filter(Boolean),
                }
              : {}),
          },
        ),
      });
    },
  );

  // Tasks are neither exported nor imported.
  if (entity !== 'tasks') {
    router.get(
      `${base}/export`,
      describeRoute({
        tags,
        summary: `Export ${entity}`,
        operationId: `export${names.many}`,
        description: `Every ${one} the filters match, unpaged. Requires the export capability.`,
        responses: {
          '200': listResponse(Record_, z.object({ total: z.number().int() })),
          ...apiErrorResponses,
        },
      }),
      apiValidator('query', FilterQueries[entity]),
      async (c) => {
        // Taking the data out of the system is a capability of its own.
        if (!(await capability(c.get('actor'), 'export')))
          throw new CrmError('forbidden', 403);
        const data = await allRecords(
          service,
          c.get('actor'),
          entity,
          listOptions(c.req.valid('query')),
        );
        return c.json({ data, meta: { total: data.length } });
      },
    );
    router.post(
      `${base}/import`,
      describeRoute({
        tags,
        summary: `Import ${entity}`,
        operationId: `import${names.many}`,
        description: `Creates every row or none. A refused row is named in the error's field as \`<row>:<field>\`, rows counted from 1.`,
        responses: {
          '201': dataResponse(z.array(Record_), `The created ${entity}.`),
          ...apiErrorResponses,
        },
      }),
      apiValidator('json', ImportBody(entity)),
      async (c) => {
        const { rows } = c.req.valid('json');
        const created = await service.mutate(
          c.get('actor'),
          async (actor, query) => {
            const records = [];
            for (let i = 0; i < rows.length; i++) {
              try {
                records.push(
                  await service.save(actor, entity, rows[i], undefined, query),
                );
              } catch (error) {
                if (error instanceof CrmError)
                  throw new CrmError(
                    error.code,
                    error.status,
                    `${toText(i + 1)}:${toText(error.field ?? '')}`,
                  );
                throw error;
              }
            }
            return records;
          },
        );
        return c.json({ data: created }, 201);
      },
    );
  }

  router.get(
    base,
    describeRoute({
      tags,
      summary: `List ${entity}`,
      operationId: `list${names.many}`,
      ...command(view, {
        command: `${entity} list`,
        columns: ['id', ...definitions[entity].columns],
      }),
      description: `${read} \`meta\` names the records the page refers to.`,
      responses: {
        '200': listResponse(Record_, ListMeta),
        ...apiErrorResponses,
      },
    }),
    apiValidator('query', ListQueries[entity]),
    async (c) => {
      const actor = c.get('actor');
      const result = await service.list(
        actor,
        entity,
        listOptions(c.req.valid('query')),
      );
      const ids = (rows: readonly Row[]) => rows.map((r) => toText(r.id));
      // Leads and opportunities the AI is following up or has a suggestion
      // waiting on; approvals whose review is being written or waits, for
      // their approver alone, whose review it is; tasks whose preparation is
      // being written or waits, for the people doing them alone.
      const states =
        entity === 'leads' || entity === 'opportunities'
          ? await aiStates(service, ids(result.data), entity)
          : entity === 'approvals'
            ? await aiStates(
                service,
                ids(result.data.filter((r) => r.approverId === actor.id)),
                'approvals',
              )
            : entity === 'tasks'
              ? await aiStates(
                  service,
                  ids(result.data.filter((r) => doesTask(r, actor.id))),
                  'tasks',
                )
              : undefined;
      return c.json({
        data: result.data,
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          ...(await resolveTitles(service, actor, { [entity]: result.data })),
          ...(states ? { ai: states } : {}),
        },
      });
    },
  );

  router.post(
    base,
    describeRoute({
      tags,
      summary: `Create ${a}`,
      operationId: `create${names.one}`,
      ...command(recordAction(entity, 'create'), {
        command: `${entity} create`,
      }),
      description:
        entity === 'leads' || entity === 'opportunities'
          ? `The AI follows the new ${one} up at once unless \`followUp=false\` or its agent is switched off.`
          : undefined,
      responses: {
        '201': dataResponse(Record_, `The created ${one}.`),
        ...apiErrorResponses,
        '404': apiErrorResponse(404, 'A record it links to does not exist.'),
      },
    }),
    apiValidator('query', CreateQuery),
    apiValidator('json', InputSchemas[entity]),
    async (c) => {
      const query = c.req.valid('query');
      // A lead or an opportunity the AI organised from pasted text and the
      // person checked (lead-capture.tsx) is recorded as organised by the
      // AI. The mark only labels the history entry; the write is the
      // person's.
      const actor =
        (entity === 'leads' || entity === 'opportunities') &&
        query.via === 'capture'
          ? { ...c.get('actor'), via: 'capture' as const }
          : c.get('actor');
      const record = await service.save(actor, entity, c.req.valid('json'));
      await afterCreate(
        service,
        ai,
        actor,
        entity,
        record,
        query.followUp !== 'false',
      );
      return c.json({ data: record }, 201);
    },
  );

  router.get(
    `${item}/history`,
    describeRoute({
      tags,
      summary: `List ${a}'s history`,
      operationId: `list${names.one}History`,
      ...command(view, { command: `${entity} history` }),
      description: `The ${one}'s activity feed, newest first: changes, comments, mail and the AI's work.`,
      responses: {
        '200': listResponse(HistoryEntry, HistoryMeta),
        ...apiErrorResponses,
        '404': notFound,
      },
    }),
    apiValidator('param', RecordParams[entity]),
    apiValidator('query', HistoryQuery),
    async (c) => {
      const actor = c.get('actor');
      const result = await service.historyOf(
        actor,
        entity,
        idOf(c.req.valid('param')),
        c.req.valid('query'),
      );
      return c.json({
        data: result.data,
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          ...(await resolveTitles(service, actor, {
            [entity]: result.data.map((event) => object(event.changes ?? {})),
          })),
        },
      });
    },
  );

  router.get(
    `${item}/comments/attachments`,
    describeRoute({
      tags,
      summary: `List the files in ${a}'s comments`,
      operationId: `list${names.one}CommentAttachments`,
      responses: {
        '200': listResponse(
          CommentAttachment,
          z.object({ total: z.number().int() }),
        ),
        ...apiErrorResponses,
        '404': notFound,
      },
    }),
    apiValidator('param', RecordParams[entity]),
    async (c) => {
      const data = await service.commentFiles(
        c.get('actor'),
        entity,
        idOf(c.req.valid('param')),
      );
      return c.json({ data, meta: { total: data.length } });
    },
  );

  router.post(
    `${item}/comments`,
    describeRoute({
      tags,
      summary: `Comment on ${a}`,
      operationId: `create${names.one}Comment`,
      ...command(COMMENT_ACTION, { command: `${entity} comment` }),
      description: `Anyone who may read the ${one} may comment on it. The colleagues it mentions are told.`,
      responses: {
        '201': dataResponse(HistoryEntry, 'The comment.'),
        ...apiErrorResponses,
        '404': notFound,
      },
    }),
    apiValidator('param', RecordParams[entity]),
    apiValidator('json', CreateCommentInput),
    async (c) => {
      const body = c.req.valid('json');
      const comment = await service.addComment(
        c.get('actor'),
        entity,
        idOf(c.req.valid('param')),
        body.text,
        body.mentions,
        // A reply names the comment it answers.
        body.replyTo,
        body.attachments,
      );
      return c.json({ data: comment }, 201);
    },
  );

  router.get(
    item,
    describeRoute({
      tags,
      summary: `Get ${a}`,
      operationId: `get${names.one}`,
      ...command(view, { command: `${entity} get` }),
      description: `The ${one} with the first page of its history and of each related list, the names of everything they refer to, and what the reader may do with it.`,
      responses: {
        '200': dataResponse(Detail),
        ...apiErrorResponses,
        '404': notFound,
      },
    }),
    apiValidator('param', RecordParams[entity]),
    async (c) => {
      const actor = c.get('actor');
      const data = await service.detail(
        actor,
        entity,
        idOf(c.req.valid('param')),
      );
      // The record, everything related to it, and the ids its history
      // mentions (a changed owner or company) all get their names.
      const rows: Partial<Record<Entity, Row[]>> = {};
      for (const [name, list] of Object.entries(object(data.related ?? {})))
        rows[name as Entity] = array(list).map(object);
      rows[entity] = [
        ...(rows[entity] ?? []),
        object(data.record),
        ...array(data.history).map((event) =>
          object(object(event).changes ?? {}),
        ),
      ];
      return c.json({
        data: { ...data, ...(await resolveTitles(service, actor, rows)) },
      });
    },
  );

  router.patch(
    item,
    describeRoute({
      tags,
      summary: `Update ${a}`,
      operationId: `update${names.one}`,
      ...command(recordAction(entity, 'edit'), {
        command: `${entity} update`,
      }),
      description: 'Send only the fields that change.',
      responses: {
        '200': dataResponse(Record_, `The ${one} as saved.`),
        ...apiErrorResponses,
        '400': apiErrorResponse(
          400,
          `The ${one} cannot change this way now (for example a converted lead, a submitted approval, a contact still on a deal).`,
        ),
        '404': notFound,
      },
    }),
    apiValidator('param', RecordParams[entity]),
    apiValidator('json', InputSchemas[entity]),
    async (c) => {
      const actor = c.get('actor');
      const id = idOf(c.req.valid('param'));
      const before = await beforeUpdate(service, actor, entity, id);
      const record = await service.save(actor, entity, c.req.valid('json'), id);
      afterUpdate(service, actor, entity, id, before, record);
      return c.json({ data: record });
    },
  );

  router.delete(
    item,
    describeRoute({
      tags,
      summary: `Delete ${a}`,
      operationId: `delete${names.one}`,
      responses: {
        '204': emptyResponse(),
        ...apiErrorResponses,
        '400': apiErrorResponse(
          400,
          `Records still depend on the ${one} (\`RELATED_RECORDS\`).`,
        ),
        '404': notFound,
      },
    }),
    apiValidator('param', RecordParams[entity]),
    async (c) => {
      await service.remove(c.get('actor'), entity, idOf(c.req.valid('param')));
      return c.body(null, 204);
    },
  );
}
