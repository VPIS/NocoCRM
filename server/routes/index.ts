import type { Application } from '@nocobase/app-server/application';
import type { AppRouteContribution } from '@nocobase/app-server/router';
import { crmRoutes } from './crm.js';
import { objectRoutes } from './objects.js';

const routes: readonly AppRouteContribution<Application>[] = [
  objectRoutes,
  crmRoutes,
];

export default routes;
