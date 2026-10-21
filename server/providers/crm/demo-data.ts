import { driveManagerToken } from '@nocobase/app-server/drive';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { authorizationToken } from '@nocobase/app-plugin-authorization/server';
import {
  demoDataToken,
  demoConfigurationToken,
  type DemoDataset,
} from '@nocobase/app-plugin-demo-mode/server/tokens';
import type { Application } from '@nocobase/app-server/application';
import type { DatabaseManager } from '@nocobase/db';
import { databaseManagerToken } from '@nocobase/db';
import { ASSISTANT_MARKER } from '../crm-agents/assistant.js';
import { BACKGROUND_MARKER } from '../crm-agents/background.js';
import { WORK_AGENTS_MARKER } from '../crm-agents/work-agents.js';
import { demoAnswers } from './demo-answers.js';
import {
  clearDemo,
  demoAccountsIn,
  demoManifestOf,
  demoPassword,
  importDemo,
} from './demo.js';
import { demoServices } from './demo-services.js';
import { jsonValue } from './values.js';
import { whatsappToken } from './whatsapp/service.js';
import type { CrmService } from './service.js';

// The CRM's demo dataset as the demo mode plugin's (`@nocobase/app-plugin-
// demo-mode`): the plugin owns the lifecycle (the import's claim, progress,
// rollback, clearing and resetting, the demo accounts and the simulated
// model), the CRM what the data says (demo.ts) and how it is written and
// taken back. Registered once at boot, only when the plugin is.

import { CRM_DEMO } from './demo-scope.js';

// The CRM's own agents, by the markers that keep their ids: the assistant,
// each work's agent, and the Background AI an installation from before
// still has.
async function crmAgentIds(database: DatabaseManager): Promise<string[]> {
  const rows = await database
    .query()
    .selectFrom('crmSettings')
    .select(['id', 'value'])
    .where('id', 'in', [
      ASSISTANT_MARKER,
      WORK_AGENTS_MARKER,
      BACKGROUND_MARKER,
    ])
    .execute();
  const ids = new Set<string>();
  for (const row of rows) {
    const value = (jsonValue(row.value) ?? {}) as {
      agentId?: unknown;
      agentIds?: Record<string, unknown>;
    };
    for (const id of [value.agentId, ...Object.values(value.agentIds ?? {})])
      if (typeof id === 'string' && id) ids.add(id);
  }
  return [...ids];
}

type ModelEntry = { modelService: string; model: string };
// Bind CRM agents to the environment model at startup and after import.
export async function configureCrmDemoAgents(app: Application): Promise<void> {
  const container = app.container;
  if (
    !container.has(demoConfigurationToken) ||
    !container.resolve(demoConfigurationToken).enabled
  )
    return;
  const demo = container.resolve(demoDataToken);
  await demo.load();
  const service = demo.models.serviceName;
  if (!service)
    throw new Error('The CRM demo requires an initialized demo model.');
  const agents = container.resolve(agentsToken);
  const model = (await agents.online.services.list()).find(
    (item) => item.name === service,
  )?.models[0]?.value;
  if (!model) throw new Error('The CRM demo model is unavailable.');
  const set: ModelEntry[] = [{ modelService: service, model }];
  for (const id of await crmAgentIds(container.resolve(databaseManagerToken))) {
    const agent = await agents.agents.get(id);
    if (agent.archivedAt) continue;
    await agents.agents.update(id, null, {
      modelEntries: set,
      expectedRevision: agent.revision,
    });
  }
}

// The dataset, for the plugin's registry.
export function createCrmDemo(
  app: Application,
  crm: () => CrmService,
): DemoDataset {
  const container = app.container;
  const { demoMailboxes, demoChats, demoInbox } = demoServices(app);
  return {
    id: CRM_DEMO,
    languages: ['zh-CN', 'en-US'],
    timeZone: (language) =>
      language === 'en-US' ? 'America/New_York' : 'Asia/Shanghai',
    accounts: (language) =>
      demoAccountsIn(language === 'en-US' ? 'en-US' : 'zh-CN').map(
        ({ username, name, role }) => ({
          username,
          name,
          // Translated on the page from the CRM's role option.
          role,
          password: demoPassword(username),
        }),
      ),
    steps: () => [
      {
        // One step with its own checkpoints (demo.ts): the records are
        // written as one story whose later parts name the earlier ones.
        key: 'records',
        weight: 9,
        run: (context) =>
          importDemo(crm(), container.resolve(authorizationToken), context, {
            ...(demoMailboxes ? { mailboxes: demoMailboxes } : {}),
            ...(demoChats ? { chats: demoChats } : {}),
            whatsapp: container.resolve(whatsappToken),
          }),
      },
      {
        key: 'models',
        run: () => configureCrmDemoAgents(app),
      },
    ],
    clear: async (context) => {
      const query = container.resolve(databaseManagerToken).query();
      const files = await query
        .selectFrom('crmFiles')
        .select(['id', 'disk', 'key'])
        .execute();
      for (const file of files) {
        await container
          .resolve(driveManagerToken)
          .use(String(file.disk))
          .delete(String(file.key));
        await query
          .deleteFrom('crmFileUploads')
          .where('id', '=', file.id)
          .execute();
        await query.deleteFrom('crmFiles').where('id', '=', file.id).execute();
      }
      await clearDemo(crm(), context.actorId, context.data, {
        ...(demoMailboxes ? { mailboxes: demoMailboxes } : {}),
        ...(demoChats ? { chats: demoChats } : {}),
        ...(demoInbox ? { inbox: demoInbox } : {}),
      });
    },
    counts: async (context) => {
      const manifest = demoManifestOf(context.data);
      const counts: Record<string, number> = {};
      for (const record of manifest?.records ?? [])
        counts[record.entity] = (counts[record.entity] ?? 0) + 1;
      counts.accounts = context.records.filter(
        (record) => record.collection === '@user',
      ).length;
      counts.mailboxes = manifest?.mailAccounts?.length ?? 0;
      counts.chats = manifest?.chats?.length ?? 0;
      return counts;
    },
    answers: demoAnswers(),
  };
}
