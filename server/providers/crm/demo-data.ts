import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { authorizationToken } from '@nocobase/app-plugin-authorization/server';
import {
  demoDataToken,
  type DemoDataService,
  type DemoDataset,
  type DemoImportContext,
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
interface AgentModels {
  id: string;
  previous: unknown[];
  set: ModelEntry[];
}

// The CRM's agents answer from the demo model while the demo is there: each
// lists the model service the plugin added, alone, so neither a conversation
// nor a work can pick a real model. What each listed before is recorded, to
// be put back on clear.
async function useDemoModel(
  agents: Agents,
  database: DatabaseManager,
  demoData: DemoDataService,
  context: DemoImportContext,
): Promise<void> {
  const service = demoData.models.serviceName;
  if (!service) return;
  const model = (await agents.online.services.list()).find(
    (item) => item.name === service,
  )?.models[0]?.value;
  if (!model) return;
  const set: ModelEntry[] = [{ modelService: service, model }];
  const changed: AgentModels[] = [];
  for (const id of await crmAgentIds(database)) {
    const agent = await agents.agents.get(id).catch(() => null);
    if (!agent || agent.archivedAt) continue;
    await agents.agents.update(id, null, {
      modelEntries: set,
      expectedRevision: agent.revision,
    });
    changed.push({ id, previous: [...agent.modelEntries], set });
    await context.setData({ agentModels: changed });
  }
}

// Puts back the models the import replaced, on an agent still listing only
// the demo's: one an administrator changed since keeps their choice.
async function restoreModels(
  agents: Agents,
  data: Readonly<Record<string, unknown>>,
): Promise<void> {
  const changed = (data.agentModels ?? []) as AgentModels[];
  for (const { id, previous, set } of changed) {
    const agent = await agents.agents.get(id).catch(() => null);
    if (!agent) continue;
    // Compared by service and model: the plugin adds fields of its own.
    const listed = agent.modelEntries.map((entry) =>
      'modelService' in entry ? `${entry.modelService}/${entry.model}` : '',
    );
    if (
      listed.join('\n') !==
      set.map((entry) => `${entry.modelService}/${entry.model}`).join('\n')
    )
      continue;
    await agents.agents
      .update(id, null, {
        // Never a demo model service, which goes with the demo.
        modelEntries: previous.filter(
          (entry) =>
            !set.some(
              (demo) =>
                (entry as Partial<ModelEntry>).modelService ===
                demo.modelService,
            ),
        ) as typeof agent.modelEntries,
        expectedRevision: agent.revision,
      })
      .catch(() => undefined);
  }
}

// The dataset, for the plugin's registry.
export function createCrmDemo(
  app: Application,
  crm: () => CrmService,
): DemoDataset {
  const container = app.container;
  const database = () => container.resolve(databaseManagerToken);
  const agents = () =>
    container.has(agentsToken) ? container.resolve(agentsToken) : undefined;
  const { demoMailboxes, demoChats, demoInbox } = demoServices(app);
  return {
    id: CRM_DEMO,
    languages: ['zh-CN', 'en-US'],
    // The users plugin keeps a deleted account's username and email, so the
    // demo's accounts are disabled on clear and enabled again on import.
    keepAccounts: true,
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
        run: async (context) => {
          const plugin = agents();
          if (plugin)
            await useDemoModel(
              plugin,
              database(),
              container.resolve(demoDataToken),
              context,
            );
        },
      },
    ],
    clear: async (context) => {
      const plugin = agents();
      if (plugin) await restoreModels(plugin, context.data);
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
