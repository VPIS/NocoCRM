import {
  defineAppConfig,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import type { DemoModeConfig } from '@nocobase/app-plugin-demo-mode/server';

/**
 * The demo mode plugin's section. Off unless a deployment turns it on
 * (NOCOBASE_DEMO_MODE=read-only or observe): the demo data page and its
 * lifecycle exist only in a demo deployment, never in a production CRM.
 */
const demoMode: AppConfigFactory<DemoModeConfig> = defineAppConfig({
  defaults: { mode: 'off', allowTables: [], data: { models: true } },
});

export default demoMode;
