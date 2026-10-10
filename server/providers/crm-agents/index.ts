import type { Application } from '@nocobase/app-server/application';
import {
  agentsAccessToken,
  agentsToken,
} from '@nocobase/app-plugin-agents/server/tokens';
import { ServiceProvider } from '@nocobase/service-provider';
import { crmToken } from '../crm/index.js';
import { crmPlansToken } from '../crm/plans/engine.js';
import { deliverPlanOutcome } from './plan-news.js';
import { registerCrmSkill } from './skill.js';
import { provisionSkills } from './library.js';
import { provisionBackgroundAgent } from './background.js';
import { registerContextKinds } from './context.js';
import { provisionAssistant, renameAssistant } from './assistant.js';
import { crmConversationRules } from './rules.js';
import { databaseManagerToken } from '@nocobase/db';
import type { CrmSettings } from '../crm/schema.js';
import { provisionModelServices } from './model-services.js';
import {
  agentActionOptions,
  COLLEAGUES_ACTION,
  COMMENT_ACTION,
  PLAN_ACTION,
  recordAction,
  SEARCH_ACTION,
} from './actions.js';
import { crmActionGate, crmAgentsAccess } from './gate.js';
import { CRM_ASSISTANT_INSTRUCTIONS } from './preset.js';
import { entities } from '../crm/schema.js';

// The actions a CRM agent starts from: view, create and edit on each object,
// search, colleagues, comments and plans (deleting and deciding approvals are
// never granted, actions.ts).
const PRESET_ACTIONS: readonly string[] = [
  ...entities.flatMap((entity) => [
    recordAction(entity, 'view'),
    recordAction(entity, 'create'),
    recordAction(entity, 'edit'),
  ]),
  SEARCH_ACTION,
  COLLEAGUES_ACTION,
  COMMENT_ACTION,
  PLAN_ACTION,
];

// The CRM on the Agents plugin: the business actions an agent may be given
// and who holds them, the preset a CRM agent starts from and the assistant
// made from it (assistant.ts), the rules and skills every conversation gets,
// what a page context may name, and where conversations start. The CRM's
// commands are its own API routes (`cliRoute` on server/routes); writes a
// run asks for become plans a person confirms (server/providers/crm/plans).
// The CRM's background AI (follow-ups, reviews, captures) asks the plugin's
// model gateway (server/providers/crm/ai-model.ts).
export default class CrmAgentsProvider extends ServiceProvider<Application> {
  readonly name = 'crm-agents';
  // The settings the conversation rules read, which run where nothing may
  // be read; kept current as they are saved.
  private settings: CrmSettings | null = null;

  public override register(): void {
    // Resolved on each request, after every provider has registered.
    this.app.container.singleton(agentsAccessToken, () =>
      crmAgentsAccess(this.app.container.resolve(crmToken)),
    );
  }

  public override async boot(): Promise<void> {
    if (!this.app.container.has(agentsToken)) return;
    const agents = this.app.container.resolve(agentsToken);
    const service = this.app.container.resolve(crmToken);
    agents.actions.provide(agentActionOptions);
    agents.gate.set(crmActionGate(service));
    // Every online run gets how to use the CRM's commands and plans.
    registerCrmSkill(agents);
    agents.presets.register({
      key: 'crm-assistant',
      name: 'CRM assistant',
      description:
        'Looks records up across the CRM and proposes changes as plans the person confirms.',
      nameText: { key: 'crm.agentPreset.name', ns: 'crm' },
      descriptionText: { key: 'crm.agentPreset.description', ns: 'crm' },
      instructions: CRM_ASSISTANT_INSTRUCTIONS,
      type: 'online',
      actions: [...PRESET_ACTIONS],
    });
    agents.conversations.rules.provide(
      crmConversationRules(() => this.settings),
    );
    registerContextKinds(
      agents,
      service,
      this.app.publicBasePath.replace(/\/+$/, ''),
    );
    // What became of a plan goes back to the conversation that proposed it.
    this.app.container.resolve(crmPlansToken).onDecided = deliverPlanOutcome(
      agents,
      service,
    );
    agents.conversations.sources.register({
      key: 'crm',
      title: { key: 'crm.agentConversationSource', ns: 'crm' },
    });
  }

  public override async start(): Promise<void> {
    if (!this.app.container.has(agentsToken)) return;
    const agents = this.app.container.resolve(agentsToken);
    const service = this.app.container.resolve(crmToken);
    this.settings = await service.settings();
    const saved = service.settingsSaved;
    service.settingsSaved = (settings) => {
      this.settings = settings;
      saved?.(settings);
    };
    await provisionModelServices(this.app, agents);
    await provisionAssistant(
      agents,
      this.app.container.resolve(databaseManagerToken),
      PRESET_ACTIONS,
    );
    await renameAssistant(
      agents,
      this.app.container.resolve(databaseManagerToken),
    );
    await provisionSkills(
      agents,
      this.app.container.resolve(databaseManagerToken),
      this.app.paths.root('ai/skills'),
    );
    await provisionBackgroundAgent(
      agents,
      this.app.container.resolve(databaseManagerToken),
    );
  }
}
