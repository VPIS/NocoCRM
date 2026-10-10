import { toText } from '../providers/crm/schema.js';
import { searchPlaces, subdivisions } from '../providers/crm/geography.js';
import { Readable } from 'node:stream';
import { authenticationToken } from '@nocobase/app-plugin-authentication';
import {
  authorizationToken,
  type AuthorizationEnv,
} from '@nocobase/app-plugin-authorization';
import { serverFileRepositoryManagerToken } from '@nocobase/app-plugin-file/server';
import { driveManagerToken } from '@nocobase/app-server/drive';
import type { Application } from '@nocobase/app-server/application';
import {
  ApiError,
  apiErrorHandler,
  defineApiRoutes,
  type AppApiRouteContribution,
} from '@nocobase/app-server/router';
import { CRM_ERROR_DOMAIN, toApiError } from './errors.js';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { crmToken } from '../providers/crm/index.js';
import { mailTimelineToken } from '../providers/crm/mail-timeline.js';
import { mailServiceToken } from '@nocobase/app-plugin-mail/server';
import { pendingDecisions } from '../providers/crm/lead-evaluation.js';
import { screenProposal } from '../ai/screen.js';
import {
  capability,
  conditions,
  outputFields,
  type Actor,
} from '../providers/crm/authorization.js';
import {
  asEntity,
  CrmError,
  definitions,
  probabilities,
  entities,
  object,
  type Entity,
} from '../providers/crm/schema.js';
import { array } from '../providers/crm/service.js';
import {
  demoPresent,
  demoStatus,
  populateDemo,
  resetDemo,
  type DemoAccountCreator,
  type DemoMailboxes,
} from '../providers/crm/demo.js';
import {
  demoLanguages,
  type DemoLanguage,
} from '../providers/crm/demo-content/index.js';
import { userManagementServiceToken } from '@nocobase/app-plugin-users/server/tokens';
import {
  AGENDA_PAGE,
  agenda,
  agendaNames,
  dashboard,
  type AgendaName,
} from '../providers/crm/dashboard.js';
import {
  agentOverview,
  agentSwitches,
  runningAgents,
  saveAgentSwitch,
} from '../providers/crm/agents.js';
import { resolveTitles } from '../providers/crm/titles.js';
import { searchAll } from '../providers/crm/search.js';
import {
  DEMO_MAIL_NAME,
  DEMO_MAIL_SECRET,
  DEMO_MAIL_TYPE,
} from '../providers/crm/demo-mail.js';
import type { Row } from '@nocobase/db';

type CrmEnv = { Variables: AuthorizationEnv['Variables'] & { actor: Actor } };
export const crmRoutes: AppApiRouteContribution<Application> = defineApiRoutes(
  (app) => {
    const router = new Hono();
    const routes = new Hono<CrmEnv>();
    const service = app.container.resolve(crmToken);
    routes.use(
      '*',
      app.container.resolve(authenticationToken).required(),
      app.container.resolve(authorizationToken).middleware(),
    );
    routes.use(
      '*',
      bodyLimit({
        maxSize: 21 * 1024 * 1024,
        onError: (c) =>
          apiErrorHandler(
            new ApiError({
              status: 'INVALID_ARGUMENT',
              reason: 'FILE_TOO_LARGE',
              domain: CRM_ERROR_DOMAIN,
              message: 'The request body exceeds 21 MiB.',
              httpStatus: 413,
            }),
            c,
          ),
      }),
    );
    routes.use('*', async (c, next) => {
      const scope = c.get('authz');
      const id = scope.identity.principal?.id;
      if (!id) throw new CrmError('unauthorized', 401);
      c.set('actor', {
        id,
        scope,
        locale: c.req.header('accept-language')?.startsWith('zh')
          ? 'zh-CN'
          : 'en-US',
      });
      await next();
    });
    // The CRM's errors in the standard body (errors.ts); anything else is
    // the application's to answer.
    routes.onError((error, c) => apiErrorHandler(toApiError(error), c));
    routes.get('/metadata', async (c) => {
      const actor = c.get('actor');
      await service.rememberLocale(actor);
      const permissions: Record<string, unknown> = {};
      for (const entity of entities) {
        const actions: Record<string, unknown> = {};
        for (const action of ['read', 'create', 'update', 'delete']) {
          try {
            const access = await conditions(actor, entity, action);
            actions[action] = {
              fields:
                action === 'read'
                  ? outputFields(entity, access)
                  : access.fields,
              // Whether the action reaches every record or only a scope
              // (one's own): the pages use it to offer a change on a
              // record the user does not own only to someone who may make
              // it, without a parallel notion of "manager".
              all: access.scope === true,
            };
          } catch {
            actions[action] = false;
          }
        }
        permissions[entity] = actions;
      }
      await conditions(actor, 'leads', 'read');
      const publicSettings = await service.settings();
      const settingsAccess = await capability(actor, 'manage', 'settings');
      return c.json({
        data: {
          definitions,
          // Stage → win probability, so the stage stepper can show the odds
          // each step carries.
          probabilities,
          permissions,
          settings: publicSettings,
          userId: actor.id,
          users: await service.users(actor),
          export: await capability(actor, 'export'),
          assign: await capability(actor, 'assign'),
          approve: await capability(actor, 'approve'),
          settingsAccess,
          // For whoever may import it: whether a demo dataset is imported,
          // so the pages can offer one until it is (DemoBanner).
          ...(settingsAccess
            ? { demoPresent: await demoPresent(service) }
            : {}),
          // Whether the pages offer the assistant at all.
          assistant: await service.assistantEnabled(),
          // Which of the agents' triggers are on, so a form offers "AI
          // follows up at once" only while that would happen (agents.ts).
          agents: await agentSwitches(service),
        },
      });
    });
    // How many runs each agent has under way, for the menu's badges.
    routes.get('/agents/running', async (c) =>
      c.json({ data: await runningAgents(service, c.get('actor')) }),
    );
    // The Agents section: one agent's switches, figures and runs, and an
    // administrator's change to its switches.
    routes.get('/agents/:agent', async (c) =>
      c.json({
        data: await agentOverview(
          service,
          c.get('actor'),
          c.req.param('agent'),
          {
            page: Number(c.req.query('page') ?? 1) || 1,
            pageSize: Number(c.req.query('pageSize') ?? 20) || 20,
            trigger: c.req.query('trigger') || undefined,
            status: c.req.query('status') || undefined,
          },
        ),
      }),
    );
    routes.put('/agents/:agent', async (c) =>
      c.json({
        data: await saveAgentSwitch(
          service,
          c.get('actor'),
          c.req.param('agent'),
          object(await c.req.json()) as never,
        ),
      }),
    );
    // A record's region, searched by a province's or a country's name.
    routes.get('/geography/search', (c) =>
      c.json({
        data: searchPlaces(
          toText(c.req.query('q')),
          c.get('actor').locale.startsWith('zh'),
        ),
      }),
    );
    routes.get('/geography', (c) => {
      const chinese = c.get('actor').locale.startsWith('zh');
      return c.json({
        data: {
          subdivisions: subdivisions(toText(c.req.query('country'))).map(
            (s) => ({
              value: s.code,
              label: chinese ? (s.chineseName ?? s.name) : s.name,
            }),
          ),
        },
      });
    });
    routes.get('/dashboard', async (c) => {
      const data = await dashboard(service, c.get('actor'), c.req.query());
      const rows = (list: unknown): Row[] =>
        array(object(list).data).map(object);
      return c.json({
        data: {
          ...data,
          ...(await resolveTitles(service, c.get('actor'), {
            tasks: [...rows(data.today), ...rows(data.overdue)],
            approvals: rows(data.approvals),
          })),
        },
      });
    });
    // The next page of one workspace list, for its card's "load more".
    routes.get('/dashboard/:list', async (c) => {
      const name = c.req.param('list');
      if (!agendaNames.includes(name as AgendaName))
        throw new CrmError('notFound', 404);
      const page = Number(c.req.query('page') ?? 1);
      const pageSize = Number(c.req.query('pageSize') ?? AGENDA_PAGE);
      if (
        ![page, pageSize].every((n) => Number.isSafeInteger(n) && n > 0) ||
        pageSize > 100
      )
        throw new CrmError('invalidInput');
      const result = await agenda(service, c.get('actor'), name as AgendaName, {
        scope: c.req.query('scope'),
        page,
        pageSize,
      });
      const entity: Entity = name === 'approvals' ? 'approvals' : 'tasks';
      return c.json({
        ...result,
        ...(await resolveTitles(service, c.get('actor'), {
          [entity]: result.data,
        })),
      });
    });
    routes.get('/settings', async (c) => {
      if (!(await capability(c.get('actor'), 'manage', 'settings')))
        throw new CrmError('forbidden', 403);
      return c.json({
        data: {
          settings: await service.settings(),
          users: await service.users(c.get('actor')),
          demo: await demoStatus(service, c.get('actor')),
        },
      });
    });
    // The demo dataset's mailboxes, through the Mail plugin's service as the
    // user each belongs to (demo-mail.ts); none without the plugin.
    // A deployment that switched the demo provider off (enabled: false under
    // mail.providers) gets demo data without mail, as without the plugin.
    const demoProvider = app.config?.get<{
      providers?: Record<string, { enabled?: boolean }>;
    }>('mail')?.providers?.[DEMO_MAIL_NAME];
    const demoMailboxes: DemoMailboxes | undefined =
      app.container.has(mailServiceToken) && demoProvider?.enabled !== false
        ? {
            async connect(userId, mailbox) {
              const connect = () =>
                app.container.resolve(mailServiceToken).connectAccount(
                  { actorId: userId },
                  {
                    provider: { type: DEMO_MAIL_TYPE, name: DEMO_MAIL_NAME },
                    address: mailbox.address,
                    displayName: mailbox.name,
                    username: mailbox.address,
                    password: DEMO_MAIL_SECRET,
                    // Everything the import wrote: it is all from the last weeks.
                    initialSyncReceivedAfter: new Date(
                      Date.now() - 181 * 86_400_000,
                    ).toISOString(),
                  },
                );
              // The plugin removes a mailbox in the background: an import
              // right after a removal waits for the old one to go, half a
              // minute at most.
              for (let attempt = 0; ; attempt += 1)
                try {
                  return (await connect()).id;
                } catch (error) {
                  const removing =
                    error instanceof Error && /remov/iu.test(error.message);
                  if (!removing || attempt >= 15) throw error;
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            },
            async remove(userId, accountId) {
              await app.container
                .resolve(mailServiceToken)
                .removeAccount({ actorId: userId }, accountId);
            },
          }
        : undefined;
    // The demo dataset creates its own accounts through the users plugin, so
    // they appear on the Users page like any account an administrator adds.
    const demoAccounts: DemoAccountCreator = {
      async create(input) {
        if (!app.container.has(userManagementServiceToken))
          throw new CrmError('demoAccounts', 500);
        try {
          const created = await app.container
            .resolve(userManagementServiceToken)
            .create({
              name: input.name,
              username: input.username,
              email: input.email,
              password: input.password,
              // The CRM's role scope is a multiple selection: the plugin
              // refuses a single value even for one role.
              roleScopes: { app: [input.role] },
            });
          return { id: created.id };
        } catch (error) {
          // The users plugin explains its refusal (a password rule, a taken
          // email); the notice shows that text under the CRM's own message.
          throw new CrmError(
            'demoAccounts',
            500,
            undefined,
            error instanceof Error ? error.message : undefined,
          );
        }
      },
      async resetPassword(id, password) {
        if (!app.container.has(userManagementServiceToken))
          throw new CrmError('demoAccounts', 500);
        try {
          await app.container
            .resolve(userManagementServiceToken)
            .resetPassword(id, password);
        } catch (error) {
          throw new CrmError(
            'demoAccounts',
            500,
            undefined,
            error instanceof Error ? error.message : toText(error),
          );
        }
      },
      async enable(id) {
        if (!app.container.has(userManagementServiceToken))
          throw new CrmError('demoAccounts', 500);
        try {
          await app.container.resolve(userManagementServiceToken).enable(id);
        } catch (error) {
          throw new CrmError(
            'demoAccounts',
            500,
            undefined,
            error instanceof Error ? error.message : toText(error),
          );
        }
      },
      async disable(id) {
        if (!app.container.has(userManagementServiceToken))
          throw new CrmError('demoAccounts', 500);
        try {
          await app.container.resolve(userManagementServiceToken).disable(id);
        } catch (error) {
          throw new CrmError(
            'demoAccounts',
            500,
            undefined,
            error instanceof Error ? error.message : toText(error),
          );
        }
      },
      async rename(id, name) {
        if (!app.container.has(userManagementServiceToken))
          throw new CrmError('demoAccounts', 500);
        try {
          await app.container
            .resolve(userManagementServiceToken)
            .update(id, { name });
        } catch (error) {
          throw new CrmError(
            'demoAccounts',
            500,
            undefined,
            error instanceof Error ? error.message : toText(error),
          );
        }
      },
    };
    routes.post('/demo/populate', async (c) => {
      // The language the dataset is written in, Chinese unless asked.
      const body = object(await c.req.json().catch(() => ({})));
      const language = body.language ?? 'zh-CN';
      if (!demoLanguages.includes(language as DemoLanguage))
        throw new CrmError('invalidInput', 400, 'language');
      return c.json({
        data: await populateDemo(
          service,
          service.authz,
          c.get('actor'),
          demoAccounts,
          language as DemoLanguage,
          demoMailboxes,
        ),
      });
    });
    routes.post('/demo/reset', async (c) =>
      c.json({
        data: await resetDemo(
          service,
          c.get('actor'),
          demoAccounts,
          demoMailboxes,
        ),
      }),
    );
    routes.put('/settings', async (c) =>
      c.json({
        data: await service.saveSettings(c.get('actor'), await c.req.json()),
      }),
    );
    // Whether the signed-in user could carry out a write the AI employee
    // proposed: the confirmation card asks before offering to confirm.
    routes.post('/ai/screen', async (c) => {
      const body = object(await c.req.json());
      return c.json({
        data: await screenProposal(
          service,
          c.get('actor'),
          toText(body.tool),
          body.input,
        ),
      });
    });
    routes.post('/files', async (c) => {
      const actor = c.get('actor');
      const entity = asEntity(c.req.query('entity') ?? 'leads');
      // A comment's files: whoever may read the record may comment on it,
      // and so attach to what they write.
      const recordId = c.req.query('recordId');
      if (recordId) await service.get(actor, entity, recordId);
      else await conditions(actor, entity, 'create');
      const body = await c.req.parseBody({ all: true });
      const files = Array.isArray(body.file) ? body.file : [body.file];
      if (
        !files.length ||
        files.some(
          (file) => !(file instanceof File) || file.size > 20 * 1024 * 1024,
        )
      )
        throw new CrmError('invalidInput');
      const repository = app.container
        .resolve(serverFileRepositoryManagerToken)
        .repository('crmFiles', {
          connection: 'main',
          disk: 'local',
          accessPath: '/crm/files',
          // Only the upload path binds this; access was already checked
          // above against the CRM's own permissions, and reads go through
          // the CRM's file route rather than the plugin's.
          policy: { read: true, create: true, update: false, delete: false },
        });
      const uploaded = await repository.uploadMany({ files: files as File[] });
      for (const file of uploaded.records)
        await service.database
          .query()
          .insertInto('crmFileUploads')
          .values({ id: file.id, ownerId: actor.id })
          .execute();
      return c.json({
        data: uploaded.records.map((f) => ({
          id: f.id,
          filename: f.filename,
          contentUrl: `${toText(app.publicBasePath)}/api/crm/files/${toText(f.id)}`,
        })),
      });
    });
    // The stored type of a file, when it is one the browser may render on
    // its own from "?inline=1" (images, PDF, plain text, Markdown as text).
    // The preview dialog is the file plugin's, which decides what it can
    // show from the stored type and the extension and fetches the bytes
    // itself for Office documents, so the list carries the stored type.
    const previewType = (file: { mimeType?: unknown }): string | null => {
      const type = toText(file.mimeType ?? '').toLowerCase();
      return /^image\/(png|jpeg|gif|webp|svg\+xml|bmp|avif)$/.test(type) ||
        type === 'application/pdf' ||
        type === 'text/plain' ||
        type === 'text/markdown' ||
        type === 'text/x-markdown'
        ? type
        : null;
    };
    // Attachments are stored as bare ids; a list needs their names in one call
    // rather than a request per file.
    routes.get('/files', async (c) => {
      const actor = c.get('actor');
      const ids = toText(c.req.query('ids'))
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 100);
      if (!ids.length) return c.json({ data: [] });
      const files = await service.database
        .query()
        .selectFrom('crmFiles')
        .select(['id', 'filename', 'createdAt', 'mimeType', 'size'])
        .where('id', 'in', ids)
        .execute();
      const readable = [];
      for (const file of files)
        if (await service.canReadFile(actor, toText(file.id)))
          readable.push({
            id: toText(file.id),
            filename: toText(file.filename),
            createdAt: toText(file.createdAt),
            mimeType: file.mimeType == null ? null : toText(file.mimeType),
            size: file.size == null ? null : Number(file.size),
            url: `${toText(app.publicBasePath)}/api/crm/files/${toText(encodeURIComponent(toText(file.id)))}`,
          });
      return c.json({ data: readable });
    });
    routes.get('/files/:id/link', (c) =>
      c.json({
        data: {
          url: `${app.publicBasePath}/api/crm/files/${encodeURIComponent(c.req.param('id'))}`,
        },
      }),
    );
    routes.get('/files/:id', async (c) => {
      const actor = c.get('actor');
      const id = c.req.param('id');
      if (!(await service.canReadFile(actor, id)))
        throw new CrmError('notFound', 404);
      const file = await service.database
        .query()
        .selectFrom('crmFiles')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      if (!file) throw new CrmError('notFound', 404);
      const stream = await app.container
        .resolve(driveManagerToken)
        .use(toText(file.disk))
        .getStream(toText(file.key));
      // "?inline=1" shows the file in the browser, for the preview dialog,
      // and only for types a browser renders safely on its own (images,
      // PDF, plain text); everything else stays a download whatever the
      // stored type says.
      const inline = c.req.query('inline') === '1' ? previewType(file) : null;
      const name = toText(encodeURIComponent(toText(file.filename)));
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        headers: {
          'Content-Type': inline ?? 'application/octet-stream',
          'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, no-store',
        },
      });
    });
    // How many suggestions wait on the reader, for the menu's badge and the
    // browser tab.
    // And how many are still being worked on, so the badge can look again
    // soon rather than in half a minute.
    // The signed-in user's mail brought into the timeline now rather than at
    // the next minute's pass: the browser asks after sending, and on the Mail
    // plugin's `mail.changed` for its user (mail-timeline.ts). Only the
    // user's own mailboxes are read.
    routes.post('/mail/sync', async (c) => {
      const timeline = app.container.resolve(mailTimelineToken);
      const written = await timeline.syncUser(c.get('actor').id);
      return c.json({ data: { written } });
    });
    // The global search: the typed text in every kind of record the reader
    // may read, grouped by kind (server/providers/crm/search.ts).
    routes.get('/search', async (c) => {
      const text = (c.req.query('q') ?? '').trim();
      if (!text || text.length > 100) throw new CrmError('invalidInput');
      return c.json({ data: await searchAll(service, c.get('actor'), text) });
    });
    routes.get('/decisions/count', async (c) => {
      const decisions = await pendingDecisions(service, c.get('actor'), {
        pageSize: 1000,
      });
      return c.json({
        data: {
          count: decisions.pending,
          running: decisions.data.filter((entry) => entry.status === 'running')
            .length,
        },
      });
    });
    routes.get('/decisions', async (c) =>
      c.json(
        await pendingDecisions(service, c.get('actor'), {
          scope: c.req.query('scope'),
          state: c.req.query('state'),
          page: Number(c.req.query('page') ?? 1) || 1,
          pageSize: Number(c.req.query('pageSize') ?? 20) || 20,
        }),
      ),
    );
    router.route('/crm', routes);
    return router;
  },
);
