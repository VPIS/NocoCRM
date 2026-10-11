import {
  defineAppConfig,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import type { AgentsConfig } from '@nocobase/app-plugin-agents/server/tokens';

/**
 * The Agents plugin's section (online agents, migration step 2). Agents call
 * the CRM through its command line, named `crm` here rather than after the
 * application's mount path, so the commands they run, its skill
 * (server/providers/crm-agents/skill.ts) and their help read alike.
 */
const agents: AppConfigFactory<AgentsConfig> = defineAppConfig({
  defaults: {
    cli: { name: 'crm' },
    app: { id: 'nococrm', name: 'NocoCRM' },
    // Model calls an online run may make before it gives up (the plugin's
    // 16 by default): a question across the pipeline, such as the reports
    // page's analysis, reads statistics, lists and several deals' histories
    // before answering, and stopped at 16 with nothing said.
    server: { maxSteps: 40 },
  },
});

export default agents;
