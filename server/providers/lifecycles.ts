import type { Application } from '@nocobase/app-server/application';
import { loggingToken } from '@nocobase/app-server/logging';
import { databaseManagerToken, type DatabaseManager } from '@nocobase/db';
import {
  createRepositoryLifecycleStore,
  LifecycleRuntime,
  StoredLifecycleParameters,
  type LifecycleLogger,
  type LifecycleParameterStore,
} from '@nocobase/lifecycle';
import {
  createServiceToken,
  ServiceProvider,
  type ServiceToken,
} from '@nocobase/service-provider';

import { approvalLifecycle } from '../lifecycles/approvals.js';

// The application's one lifecycle runtime (`@nocobase/lifecycle`), which
// every record lifecycle registers on: the approvals' for now
// (server/lifecycles/approvals.ts). It keeps no state of its own; the
// records, their transition log and their effect runs are in the database
// (202610130001_crm_approval_lifecycle), and so are the versions of the
// parameters an administrator sets, such as the approver rule, with the
// version each transition ran under (202610140001_crm_lifecycle_parameters).
// No lifecycle declares an effect or
// a trigger yet, so it runs without the jobs dispatcher and its sweep;
// add `createLifecycleJobs()` from `@nocobase/lifecycle/jobs` here, started
// in `start()`, with the first one.

export const lifecycleRuntimeToken: ServiceToken<LifecycleRuntime> =
  createServiceToken<LifecycleRuntime>('crm/lifecycle-runtime');

// The one scope the CRM keeps its lifecycle parameters under: the whole
// installation. Never rename it, or the stored versions are no longer found.
export const LIFECYCLE_PARAMETER_SCOPE = 'crm';

// The administrator-set parameters' versions, in the database. It keeps no
// state of its own, so CrmService, which reads and saves them, and the
// runtime, which reads them on each transition, each build one.
export function lifecycleParameterStore(
  database: DatabaseManager,
): LifecycleParameterStore {
  return new StoredLifecycleParameters(
    createRepositoryLifecycleStore(database),
  );
}

// A runtime over the database with every lifecycle registered; tests build
// one the same way.
export function createLifecycleRuntime(
  database: DatabaseManager,
  logger?: LifecycleLogger,
): LifecycleRuntime {
  const runtime = new LifecycleRuntime({
    store: createRepositoryLifecycleStore(database),
    ...(logger ? { logger } : {}),
  });
  runtime.register(approvalLifecycle, {
    parameterConfiguration: {
      store: lifecycleParameterStore(database),
      scope: () => LIFECYCLE_PARAMETER_SCOPE,
    },
  });
  return runtime;
}

export default class LifecycleProvider extends ServiceProvider<Application> {
  public readonly name: string = 'crm/lifecycle-provider';
  private runtime: LifecycleRuntime | undefined;

  public override register(): void {
    this.app.container.singleton(lifecycleRuntimeToken, () => {
      if (this.runtime) return this.runtime;
      const log = this.app.container
        .resolve(loggingToken)
        .getLogger('lifecycle');
      this.runtime = createLifecycleRuntime(
        this.app.container.resolve(databaseManagerToken),
        {
          warn: (message, details) => log.warn({ details }, message),
          error: (message, details) => log.error({ details }, message),
        },
      );
      return this.runtime;
    });
  }
}
