import { encodeAuthorizationTitle } from '@nocobase/authorization/core';
import { defineSeed, type SeedDefinition } from '@nocobase/db';
import { crmPermissionSet } from '../../../server/providers/crm/resources.js';
import { roles } from '../../../server/providers/crm/roles.js';

// The CRM's two sales roles as the authorization plugin's permission sets,
// written once when the application is installed. They are ordinary
// configuration from then on: administrators edit them on the Permission
// Sets page, and a set they delete stays deleted. The administrator is the
// plugin's own root set, which its seed creates. A set already present is
// left as it is, so on an installation that had its sets before this seed
// existed it changes nothing. Later changes to the sets are one-time data
// changes in `provisionCrm`, never edits to this seed.
const seed: SeedDefinition = defineSeed({
  name: '202610040001_crm_sales_permission_sets',
  transaction: true,
  async run({ query }) {
    const now = new Date();
    for (const role of roles) {
      if (role === 'system-administrator') continue;
      const set = crmPermissionSet(role);
      const existing = await query
        .selectFrom('authorizationPermissionSets')
        .select('key')
        .where('key', '=', set.key)
        .executeTakeFirst();
      if (existing) continue;
      await query
        .insertInto('authorizationPermissionSets')
        .values({
          id: crypto.randomUUID(),
          key: set.key,
          title: encodeAuthorizationTitle(set.title),
          grants: JSON.stringify(set.grants),
          createdAt: now,
          updatedAt: now,
        })
        .execute();
    }
  },
});

export default seed;
