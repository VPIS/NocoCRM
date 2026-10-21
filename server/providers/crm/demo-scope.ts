import type { DatabaseManager } from '@nocobase/db';
import { toText } from './schema.js';

export const CRM_DEMO = 'crm';

// Whether this CRM holds the demo dataset, or an import, a clear or a
// failure of one left it holding part of it: the plugin's dataset row, read
// from the database so every process sees another's import or clear. While
// it does, the CRM's own AI answers from the demo model and its automatic
// passes stand aside (ai-model.ts, index.ts): nothing about the demo reaches
// a real model or the web. Null when there is none, or the plugin is not
// registered (its table does not exist).
export async function crmDemoScope(
  database: DatabaseManager,
): Promise<{ language: string | null } | null> {
  try {
    const row = await database
      .query()
      .selectFrom('demoModeDatasets')
      .select(['state', 'language'])
      .where('id', '=', CRM_DEMO)
      .executeTakeFirst();
    return row
      ? { language: row.language == null ? null : toText(row.language) }
      : null;
  } catch {
    return null;
  }
}
