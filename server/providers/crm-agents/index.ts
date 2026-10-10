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

// The CRM on the Agents plugin (migration step 2): the business actions an
// agent may be given and who holds them, the preset a CRM agent starts from,
// and where its conversations start. The CRM's commands are its own API
// routes (`cliRoute` on server/routes); writes a run asks for become plans a
// person confirms (server/providers/crm/plans). The AI Employee plugin keeps
// running the CRM's present assistant meanwhile.
export default class CrmAgentsProvider extends ServiceProvider<Application> {
  readonly name = 'crm-agents';

  public override register(): void {
    // Resolved on each request, after every provider has registered.
    this.app.container.singleton(agentsAccessToken, () =>
      crmAgentsAccess(this.app.container.resolve(crmToken)),
    );
  }

  public override boot(): Promise<void> {
    if (!this.app.container.has(agentsToken)) return Promise.resolve();
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
      actions: [
        ...entities.flatMap((entity) => [
          recordAction(entity, 'view'),
          recordAction(entity, 'create'),
          recordAction(entity, 'edit'),
        ]),
        SEARCH_ACTION,
        COLLEAGUES_ACTION,
        COMMENT_ACTION,
        PLAN_ACTION,
      ],
    });
    // What became of a plan goes back to the conversation that proposed it.
    this.app.container.resolve(crmPlansToken).onDecided = deliverPlanOutcome(
      agents,
      service,
    );
    agents.conversations.sources.register({
      key: 'crm',
      title: { key: 'crm.agentConversationSource', ns: 'crm' },
    });
    return Promise.resolve();
  }

  public override async start(): Promise<void> {
    if (!this.app.container.has(agentsToken)) return;
    await provisionModelServices(
      this.app,
      this.app.container.resolve(agentsToken),
    );
  }
}
