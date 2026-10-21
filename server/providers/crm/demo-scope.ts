import { demoConfigurationToken } from '@nocobase/app-plugin-demo-mode/server/tokens';
import { databaseManagerToken } from '@nocobase/db';
import type { ServiceResolver } from '@nocobase/service-provider';
import { toText } from './schema.js';

export const CRM_DEMO = 'crm';

// Environment policy applies before import and survives clearing the dataset.
export async function crmDemoScope(
  container: ServiceResolver,
): Promise<{ language: string | null } | null> {
  if (
    !container.has(demoConfigurationToken) ||
    !container.resolve(demoConfigurationToken).enabled
  )
    return null;
  const row = await container
    .resolve(databaseManagerToken)
    .query()
    .selectFrom('demoModeDatasets')
    .select('language')
    .where('id', '=', CRM_DEMO)
    .executeTakeFirst();
  return { language: row?.language == null ? null : toText(row.language) };
}
