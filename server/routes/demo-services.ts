import type { Application } from '@nocobase/app-server/application';
import { mailServiceToken } from '@nocobase/app-plugin-mail/server';
import { userManagementServiceToken } from '@nocobase/app-plugin-users/server/tokens';
import type {
  DemoAccountCreator,
  DemoMailboxes,
} from '../providers/crm/demo.js';
import {
  DEMO_MAIL_NAME,
  DEMO_MAIL_SECRET,
  DEMO_MAIL_TYPE,
} from '../providers/crm/demo-mail.js';
import { CrmError, toText } from '../providers/crm/schema.js';

// What the demo dataset's import and removal do through other plugins: its
// accounts through the users plugin, its mailboxes through the Mail plugin.
export function demoServices(app: Application): {
  demoAccounts: DemoAccountCreator;
  demoMailboxes: DemoMailboxes | undefined;
} {
  // The demo dataset's mailboxes, through the Mail plugin's service as the
  // user each belongs to (demo-mail.ts); none without the plugin.
  // A deployment that switched the demo provider off (enabled: false under
  // mail.providers) gets demo data without mail, as without the plugin.
  const demoProvider = app.config?.get<{
    providers?: Record<string, { enabled?: boolean }>;
  }>('mail')?.providers?.[DEMO_MAIL_NAME];
  const demoMailboxes: DemoMailboxes | undefined =
    app.container.has(mailServiceToken) && demoProvider?.enabled !== false
      ? {
          async connect(userId, mailbox) {
            const connect = () =>
              app.container.resolve(mailServiceToken).connectAccount(
                { actorId: userId },
                {
                  provider: { type: DEMO_MAIL_TYPE, name: DEMO_MAIL_NAME },
                  address: mailbox.address,
                  displayName: mailbox.name,
                  username: mailbox.address,
                  password: DEMO_MAIL_SECRET,
                  // Everything the import wrote: it is all from the last weeks.
                  initialSyncReceivedAfter: new Date(
                    Date.now() - 181 * 86_400_000,
                  ).toISOString(),
                },
              );
            // The plugin removes a mailbox in the background: an import
            // right after a removal waits for the old one to go, half a
            // minute at most.
            for (let attempt = 0; ; attempt += 1)
              try {
                return (await connect()).id;
              } catch (error) {
                const removing =
                  error instanceof Error && /remov/iu.test(error.message);
                if (!removing || attempt >= 15) throw error;
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
          },
          async remove(userId, accountId) {
            await app.container
              .resolve(mailServiceToken)
              .removeAccount({ actorId: userId }, accountId);
          },
        }
      : undefined;
  // The demo dataset creates its own accounts through the users plugin, so
  // they appear on the Users page like any account an administrator adds.
  const demoAccounts: DemoAccountCreator = {
    async create(input) {
      if (!app.container.has(userManagementServiceToken))
        throw new CrmError('demoAccounts', 500);
      try {
        const created = await app.container
          .resolve(userManagementServiceToken)
          .create({
            name: input.name,
            username: input.username,
            email: input.email,
            password: input.password,
            // The CRM's role scope is a multiple selection: the plugin
            // refuses a single value even for one role.
            roleScopes: { app: [input.role] },
          });
        return { id: created.id };
      } catch (error) {
        // The users plugin explains its refusal (a password rule, a taken
        // email); the notice shows that text under the CRM's own message.
        throw new CrmError(
          'demoAccounts',
          500,
          undefined,
          error instanceof Error ? error.message : undefined,
        );
      }
    },
    async resetPassword(id, password) {
      if (!app.container.has(userManagementServiceToken))
        throw new CrmError('demoAccounts', 500);
      try {
        await app.container
          .resolve(userManagementServiceToken)
          .resetPassword(id, password);
      } catch (error) {
        throw new CrmError(
          'demoAccounts',
          500,
          undefined,
          error instanceof Error ? error.message : toText(error),
        );
      }
    },
    async enable(id) {
      if (!app.container.has(userManagementServiceToken))
        throw new CrmError('demoAccounts', 500);
      try {
        await app.container.resolve(userManagementServiceToken).enable(id);
      } catch (error) {
        throw new CrmError(
          'demoAccounts',
          500,
          undefined,
          error instanceof Error ? error.message : toText(error),
        );
      }
    },
    async disable(id) {
      if (!app.container.has(userManagementServiceToken))
        throw new CrmError('demoAccounts', 500);
      try {
        await app.container.resolve(userManagementServiceToken).disable(id);
      } catch (error) {
        throw new CrmError(
          'demoAccounts',
          500,
          undefined,
          error instanceof Error ? error.message : toText(error),
        );
      }
    },
    async rename(id, name) {
      if (!app.container.has(userManagementServiceToken))
        throw new CrmError('demoAccounts', 500);
      try {
        await app.container
          .resolve(userManagementServiceToken)
          .update(id, { name });
      } catch (error) {
        throw new CrmError(
          'demoAccounts',
          500,
          undefined,
          error instanceof Error ? error.message : toText(error),
        );
      }
    },
  };
  return { demoAccounts, demoMailboxes };
}
