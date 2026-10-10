import {
  defineClientReactProviders,
  type AppClientReactProviderDefinition,
} from '@nocobase/app-client/plugins';

import { Toaster } from '#components/ui/toast';

import { AppThemeProvider } from './theme/theme-provider.js';
import { CrmAgentChatProvider } from './components/crm/agent-chat/panel.js';
import { GlobalSearchProvider } from './components/crm/global-search.js';
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
    // Pages must not mount another. It comes before the assistant so its
    // chat can raise toasts.
    {
      component: Toaster,
      layer: 'application',
      name: 'toaster',
    },
    // The assistant's chat on the Agents plugin and its panel, around the global
    // search, whose Ask AI opens the panel on the question.
    {
      component: CrmAgentChatProvider,
      layer: 'application',
      name: 'crm-agent-chat',
    },
    {
      component: GlobalSearchProvider,
      layer: 'application',
      name: 'crm-global-search',
    },
  ]);

export default reactProviders;
