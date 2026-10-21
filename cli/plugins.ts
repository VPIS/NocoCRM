import {
  defineCliPlugin,
  defineCliPlugins,
  type AppCliPlugins,
} from '@nocobase/app-cli';
import scheduler from '@nocobase/app-plugin-scheduler/cli';
import agents from '@nocobase/app-plugin-agents/cli';
import demoMode from '@nocobase/app-plugin-demo-mode/cli';

// Array order is command registration order. A plugin contributes its commands
// by appearing in this list; removing its entry and its import removes them.
// Application change: the application's own build step, declared as a plugin
// entry since build hooks are contributed only by plugins. It copies the CRM's
// method skills into dist (scripts/utils/copy-skills.mjs), which the AI
// Employee plugin's hook did until the plugin was removed.
const crmBuild = defineCliPlugin({
  packageName: '@nococrm/crm-cli',
  buildHooks: {
    afterServerBuild: [
      {
        command: ['node', 'scripts/utils/copy-skills.mjs'],
        label: "Copy the CRM's skills",
      },
      {
        // The demo mode plugin is vendored until it is published
        // (app-plugins/demo-mode, linked from package.json).
        command: ['node', 'scripts/utils/copy-demo-mode-plugin.mjs'],
        label: 'Include the demo mode plugin',
      },
    ],
  },
});

const cliPlugins: AppCliPlugins = defineCliPlugins([
  scheduler,
  agents,
  demoMode,
  crmBuild,
]);

export default cliPlugins;
