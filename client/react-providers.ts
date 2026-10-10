import {
  defineClientReactProviders,
  type AppClientReactProviderDefinition,
} from '@nocobase/app-client/plugins';

import { Toaster } from '#components/ui/toast';

import { AppThemeProvider } from './theme/theme-provider.js';
import { CrmAssistantProvider } from './components/crm/ai-chat.js';
import { CrmAgentChatProvider } from './components/crm/agent-chat/panel.js';
import { CrmQueryProvider } from './components/crm/query-provider.js';

export const reactProviders: readonly AppClientReactProviderDefinition[] =
  defineClientReactProviders([
    {
      component: CrmQueryProvider,
      layer: 'root',
      name: 'crm-query',
    },
    {
      component: AppThemeProvider,
      layer: 'root',
      name: 'theme',
    },
    // The one toast host. It renders what plugins and pages report through
    // `useToaster()`, which `client/service-provider.ts` connects to it.
    // Pages must not mount another. It comes before the assistant so the AI
    // plugin's chat can raise toasts.
    {
      component: Toaster,
      layer: 'application',
      name: 'toaster',
    },
    // Noco's chat on the Agents plugin and its panel (migration step 3),
    // around the AI Employee's provider, whose panel (still opened by the
    // reports page and the global search) closes it when it opens.
    {
      component: CrmAgentChatProvider,
      layer: 'application',
      name: 'crm-agent-chat',
    },
    {
      component: CrmAssistantProvider,
      layer: 'application',
      name: 'crm-assistant',
    },
  ]);

export default reactProviders;
