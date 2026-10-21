import {
  demoConfigurationToken,
  type DemoConfigurationService,
} from '@nocobase/app-plugin-demo-mode/server/tokens';
import type { Application } from '@nocobase/app-server/application';
import { databaseManagerToken, type DatabaseManager } from '@nocobase/db';
import { CRM_DEMO } from './demo-scope.js';
import { definitions, type Entity } from './schema.js';

// What visitors of a read-only demo may still change, once an administrator
// allows it on the demo page: each a write capability of the demo mode
// plugin, scoped to the demo's own records, and wrapped around exactly the
// business operation it serves (`demoWrite`), after that operation's own
// authentication and authorization. Rules start empty: nothing is open
// until an administrator enables one.

// Asking the AI about a record (a lead's or a deal's follow-up, an
// approval's review, a task's preparation) writes the AI's card in the
// history; the work itself runs in the background, answered by the demo
// model.
export const DEMO_AI_WORK = 'crm.aiWork';

// Whether the record is one the demo's import created: tracked by the demo
// mode plugin for the CRM's dataset, which therefore is there.
async function isDemoRecord(
  database: DatabaseManager,
  entity: Entity,
  recordId: string,
): Promise<boolean> {
  const row = await database
    .query()
    .selectFrom('demoModeRecords')
    .select('recordId')
    .where('datasetId', '=', CRM_DEMO)
    .where('collection', '=', definitions[entity].table)
    .where('recordId', '=', recordId)
    .executeTakeFirst()
    .catch(() => undefined);
  return Boolean(row);
}

export function registerCrmDemoWrites(
  app: Application,
  configuration: DemoConfigurationService,
): void {
  configuration.registerWrite({
    id: DEMO_AI_WORK,
    title: 'Ask the AI about a demo record',
    table: 'crm_history',
    operations: ['insert', 'update'],
    scopes: [{ id: 'demo-records', title: 'The demo dataset’s records' }],
    async checkScope(scope, input) {
      const { entity, recordId } = input as {
        entity?: Entity;
        recordId?: string;
      };
      return (
        scope === 'demo-records' &&
        Boolean(entity && recordId && entity in definitions) &&
        (await isDemoRecord(
          app.container.resolve(databaseManagerToken),
          entity!,
          recordId!,
        ))
      );
    },
  });
}

// Runs an operation on a record that a read-only demo may allow (its
// capability's rule, in the record's scope); as it is without the plugin.
export function demoWrite<T>(
  app: Application,
  capability: typeof DEMO_AI_WORK,
  record: { entity: Entity; recordId: string },
  run: () => Promise<T>,
): Promise<T> {
  if (!app.container.has(demoConfigurationToken)) return run();
  return app.container.resolve(demoConfigurationToken).runWrites(
    [
      [capability, 'insert'],
      [capability, 'update'],
    ],
    record,
    run,
  );
}
