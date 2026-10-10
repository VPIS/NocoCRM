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
// The CRM's assistant, named Sales Expert, as an online agent of the Agents plugin: made
// once from the CRM assistant preset's instructions and actions, open to
// everyone, listing every chat model of the enabled services in their order
// (DeepSeek's first, the default, the rest what a conversation may pick, as the
// assistant's model picker offered before), and made the
// system default chat agent when none is set. The marker keeps its id, so an
// agent an administrator changed, archived or deleted stays as they left it:
// it is never recreated or rewritten. Its name is Sales Expert in every language
// (the plugin translates only an application agent's description).

// The stored marker keeps the assistant's first name, the assistant.
export const ASSISTANT_MARKER = 'agents-noco-v1';
const ASSISTANT_NAME = 'Sales Expert';

export async function provisionAssistant(
  agents: Agents,
  database: DatabaseManager,
  actions: readonly string[],
): Promise<void> {
  const query = database.query();
  const done = await query
    .selectFrom('crmSettings')
    .select('id')
    .where('id', '=', ASSISTANT_MARKER)
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
        id: ASSISTANT_MARKER,
        value: JSON.stringify({ version: 1, agentId: null }),
        updatedAt: new Date(),
      })
      .execute();
  } catch {
    return;
  }
  // The assistant converses on DeepSeek by default.
  const modelEntries = await chatModelEntries(agents, 'deepseek');
  const assistant = await agents.agents.create(creator.id, {
    name: ASSISTANT_NAME,
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
    await agents.chat.updateSettings(creator.id, {
      defaultAgentId: assistant.id,
    });
  await query
    .updateTable('crmSettings')
    .set({
      value: JSON.stringify({ version: 1, agentId: assistant.id }),
      updatedAt: new Date(),
    })
    .where('id', '=', ASSISTANT_MARKER)
    .execute();
}

// Every chat model of the enabled services, in their order, as an agent's
// model entries (the first its default): what an agent the CRM creates
// lists. Those of the `preferred` provider's services come first, so they
// are its default while the provider is offered.
export async function chatModelEntries(
  agents: Agents,
  preferred?: string,
): Promise<{ modelService: string; model: string }[]> {
  const services = (await agents.online.services.list()).filter(
    (service) => service.enabled,
  );
  return (
    [
      ...services.filter((service) => service.provider === preferred),
      ...services.filter((service) => service.provider !== preferred),
    ]
      .flatMap((service) =>
        service.models
          .filter((model) => model.kind === 'chat')
          .map((model) => ({
            modelService: service.name,
            model: model.value,
          })),
      )
      // The most an agent's list holds.
      .slice(0, MAX_MODEL_ENTRIES)
  );
}

// The assistant was first created as Noco; renamed Sales Expert once,
// unless an administrator has already named it otherwise.
const RENAMED_MARKER = 'agents-assistant-name-v1';

export async function renameAssistant(
  agents: Agents,
  database: DatabaseManager,
): Promise<void> {
  const query = database.query();
  const [created, renamed] = await Promise.all(
    [ASSISTANT_MARKER, RENAMED_MARKER].map((id) =>
      query
        .selectFrom('crmSettings')
        .select('value')
        .where('id', '=', id)
        .executeTakeFirst(),
    ),
  );
  if (!created || renamed) return;
  // The marker first, as provisioning's: one instance renames.
  try {
    await query
      .insertInto('crmSettings')
      .values({
        id: RENAMED_MARKER,
        value: JSON.stringify({ version: 1 }),
        updatedAt: new Date(),
      })
      .execute();
  } catch {
    return;
  }
  let agentId: unknown;
  try {
    agentId = (JSON.parse(String(created.value)) as { agentId?: unknown })
      .agentId;
  } catch {
    return;
  }
  if (typeof agentId !== 'string' || !agentId) return;
  const agent = await agents.agents.get(agentId).catch(() => null);
  if (agent?.name === 'Noco')
    await agents.agents.update(agentId, null, {
      name: ASSISTANT_NAME,
      expectedRevision: agent.revision,
    });
}
