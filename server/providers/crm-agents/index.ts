import { installDemoChat } from './demo-chat.js';
import { configureCrmDemoAgents } from '../crm/demo-data.js';
import { SEARCH_SOURCE } from './search-answers.js';
import type { Application } from '@nocobase/app-server/application';
import {
  agentsAccessToken,
  agentsToken,
} from '@nocobase/app-plugin-agents/server/tokens';
import { ServiceProvider } from '@nocobase/service-provider';
import { crmToken } from '../crm/index.js';
import { crmPlansToken } from '../crm/plans/engine.js';
import { deliverPlanOutcome } from './plan-news.js';
import { deliverAiWork } from './ai-work-news.js';
import { registerCrmSkill } from './skill.js';
import { provisionSkills } from './library.js';
import { SKILLS_DIR } from '../crm/ai-model.js';
import {
  nameWorkAgents,
  renameWorkAgents,
  provisionWorkAgents,
  retireBackgroundAgent,
} from './work-agents.js';
import { registerContextKinds } from './context.js';
import {
  nameAssistant,
  provisionAssistant,
  refreshAssistantInstructions,
  grantAssistantAction,
  renameAssistant,
} from './assistant.js';
import { crmConversationRules } from './rules.js';
import { databaseManagerToken } from '@nocobase/db';
import type { CrmSettings } from '../crm/schema.js';
import { provisionModelServices } from './model-services.js';
import {
  agentActionOptions,
  AI_WORK_ACTION,
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
// search, colleagues, comments, plans and setting the AI agents to work on
// a record (deleting and deciding approvals are
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
  AI_WORK_ACTION,
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
    // What the AI agents did on a conversation's asking goes back to it.
    service.aiFinished = deliverAiWork(agents, service);
    agents.conversations.sources.register({
      key: 'crm',
      title: { key: 'crm.agentConversationSource', ns: 'crm' },
    });
    // A question asked from the global search (search-answers.ts).
    agents.conversations.sources.register({
      key: SEARCH_SOURCE,
      title: { key: 'crm.agentSearchSource', ns: 'crm' },
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
    // Provision explicit deployment model services without enabling their use in demo chat.
    // The Demo chat policy still chooses the model and background AI stays simulated.
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
    await nameAssistant(this.app.container.resolve(databaseManagerToken));
    await refreshAssistantInstructions(
      agents,
      this.app.container.resolve(databaseManagerToken),
    );
    // The assistant made before it could set the agents to work.
    await grantAssistantAction(
      agents,
      this.app.container.resolve(databaseManagerToken),
      AI_WORK_ACTION,
      'crm-ai-work-action-v1',
    );
    await provisionSkills(
      agents,
      this.app.container.resolve(databaseManagerToken),
      // Beside the compiled server, as the background runs read them: a
      // host may start the application from another root (NocoBase Studio).
      SKILLS_DIR,
    );
    // After the skills, which each is given its own of.
    await provisionWorkAgents(
      agents,
      this.app.container.resolve(databaseManagerToken),
    );
    // Those made before their names were translated.
    await renameWorkAgents(
      agents,
      this.app.container.resolve(databaseManagerToken),
    );
    await nameWorkAgents(this.app.container.resolve(databaseManagerToken));
    // The Background AI they replaced, gone with its recorded use.
    await retireBackgroundAgent(
      agents,
      this.app.container.resolve(databaseManagerToken),
    );
  }

  public override async ready(): Promise<void> {
    installDemoChat(this.app);
    await configureCrmDemoAgents(this.app);
  }
}
