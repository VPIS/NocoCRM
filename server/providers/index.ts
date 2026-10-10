import type { ApplicationServiceProviderConstructor } from '@nocobase/app-server/application';

import CrmProvider from './crm/index.js';
import CrmAgentsProvider from './crm-agents/index.js';

// Application change: the template's user-roles provider is replaced by the
// CRM's own role scope, registered by CrmProvider (server/providers/crm/user-roles.ts).
const serviceProviders: readonly ApplicationServiceProviderConstructor[] = [
  CrmProvider,
  CrmAgentsProvider,
];

export default serviceProviders;
