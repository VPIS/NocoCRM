import type { AppConfigFactory } from '@nocobase/app-server/config';
import {
  defineUsersConfig,
  type UsersConfig,
} from '@nocobase/app-plugin-users/server/config';

// The initial administrator comes from config.yml (users.initialAdmin) or INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_EMAIL
// and INITIAL_ADMIN_PASSWORD, read once while the user table is empty.
//
// Application change: the Users plugin would register its own permission-set
// role scope on the Users page; the CRM registers a replacement (one or more
// CRM roles per user, the last administrator protected) from CrmProvider, so
// the plugin's default scope is switched off here.
const users: AppConfigFactory<UsersConfig> = defineUsersConfig({
  defaults: { permissionSets: false },
});

export default users;
