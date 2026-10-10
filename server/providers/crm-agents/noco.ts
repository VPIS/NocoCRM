import { MAX_MODEL_ENTRIES } from '@nocobase/app-plugin-agents/shared/agents';
import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import type { DatabaseManager } from '@nocobase/db';
import { listUsers } from '../crm/authorization.js';
import { CRM_ASSISTANT_INSTRUCTIONS } from './preset.js';

// @temporary(nocobase-official): an agent the application ships is created
// from code once, at start, because the Agents plugin has no way to ship one
// (migration plan, question 7). Replace with the plugin's own mechanism when
// it has one.
//
// Noco, the CRM's assistant, as an online agent of the Agents plugin: made
// once from the CRM assistant preset's instructions and actions, open to
// everyone, listing every chat model of the enabled services in their order
// (the first its default, the rest what a conversation may pick, as the
// assistant's model picker offered before), and made the
// system default chat agent when none is set. The marker keeps its id, so an
// agent an administrator changed, archived or deleted stays as they left it:
// it is never recreated or rewritten. Its name is Noco in every language
// (the plugin translates only an application agent's description).

export const NOCO_MARKER = 'agents-noco-v1';

export async function provisionNoco(
  agents: Agents,
  database: DatabaseManager,
  actions: readonly string[],
): Promise<void> {
  const query = database.query();
  const done = await query
    .selectFrom('crmSettings')
    .select('id')
    .where('id', '=', NOCO_MARKER)
    .executeTakeFirst();
  if (done) return;
  // Created as the installation's first account, its initial administrator.
  const [creator] = await listUsers(database);
  if (!creator) return;
  // The marker first: an instance starting beside this one finds it (the
  // insert of the second fails on the key) and creates nothing, and a crash
  // before the agent exists leaves none rather than a second one later.
  try {
    await query
      .insertInto('crmSettings')
      .values({
        id: NOCO_MARKER,
        value: JSON.stringify({ version: 1, agentId: null }),
        updatedAt: new Date(),
      })
      .execute();
  } catch {
    return;
  }
  const modelEntries = (await agents.online.services.list())
    .filter((service) => service.enabled)
    .flatMap((service) =>
      service.models
        .filter((model) => model.kind === 'chat')
        .map((model) => ({ modelService: service.name, model: model.value })),
    )
    // The most an agent's list holds.
    .slice(0, MAX_MODEL_ENTRIES);
  const noco = await agents.agents.create(creator.id, {
    name: 'Noco',
    type: 'online',
    description: 'CRM assistant',
    descriptionText: { key: 'crm.agentPreset.description', ns: 'crm' },
    instructions: CRM_ASSISTANT_INSTRUCTIONS,
    actions: [...actions],
    access: 'everyone',
    ...(modelEntries.length ? { modelEntries } : {}),
  });
  const settings = await agents.chat.settings();
  if (!settings.defaultAgentId)
    await agents.chat.updateSettings(creator.id, { defaultAgentId: noco.id });
  await query
    .updateTable('crmSettings')
    .set({
      value: JSON.stringify({ version: 1, agentId: noco.id }),
      updatedAt: new Date(),
    })
    .where('id', '=', NOCO_MARKER)
    .execute();
}
