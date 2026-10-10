import { randomUUID } from 'node:crypto';
import type { Application } from '@nocobase/app-server/application';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { mailServiceToken } from '@nocobase/app-plugin-mail/server';
import { userManagementServiceToken } from '@nocobase/app-plugin-users/server/tokens';
import type {
  DemoAccountCreator,
  DemoChats,
  DemoMailboxes,
} from '../providers/crm/demo.js';
import { crmToken } from '../providers/crm/index.js';
import { NOCO_MARKER } from '../providers/crm-agents/noco.js';
import { jsonValue } from '../providers/crm/values.js';
import {
  DEMO_MAIL_NAME,
  DEMO_MAIL_SECRET,
  DEMO_MAIL_TYPE,
} from '../providers/crm/demo-mail.js';
import { CrmError, toText } from '../providers/crm/schema.js';

// What the demo dataset's import and removal do through other plugins: its
// accounts through the users plugin, its mailboxes through the Mail plugin,
// the importer's conversations through the Agents plugin.
export function demoServices(app: Application): {
  demoAccounts: DemoAccountCreator;
  demoMailboxes: DemoMailboxes | undefined;
  demoChats: DemoChats | undefined;
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
  // The importer's finished conversations with Noco, the CRM's assistant
  // (crm-agents/noco.ts): the plugin makes the conversation, the messages
  // are written into its table as its store writes them, since a
  // conversation can only grow by a run of its agent and the demo runs no
  // model. @temporary(nocobase-official): until the plugin can import a
  // finished conversation. None without the plugin or before Noco exists.
  const demoChats: DemoChats | undefined = app.container.has(agentsToken)
    ? {
        async create(userId, chat) {
          const database = app.container.resolve(crmToken).database;
          const query = database.query();
          const marker = await query
            .selectFrom('crmSettings')
            .select('value')
            .where('id', '=', NOCO_MARKER)
            .executeTakeFirst();
          const agentId = toText(
            (jsonValue(marker?.value) as { agentId?: unknown } | null)
              ?.agentId ?? '',
          );
          if (!agentId) return undefined;
          const conversation = await app.container
            .resolve(agentsToken)
            .conversations.create(userId, {
              agentId,
              title: chat.title,
              source: 'crm',
            });
          const first = chat.messages[0]?.at ?? new Date().toISOString();
          const last = chat.messages.at(-1)?.at ?? first;
          for (const [index, message] of chat.messages.entries())
            await query
              .insertInto('agConversationMessages')
              .values({
                id: randomUUID(),
                conversationId: conversation.id,
                seq: index + 1,
                role: message.role,
                content: JSON.stringify({
                  type: 'text',
                  content: message.text,
                }),
                searchText: message.text,
                toolCalls: null,
                attachments: null,
                workContext: null,
                metadata: JSON.stringify({}),
                runId: null,
                runEventSeq: null,
                createdAt: message.at,
                updatedAt: message.at,
              })
              .execute();
          await query
            .updateTable('agConversations')
            .set({
              lastSeq: chat.messages.length,
              lastMessageAt: last,
              createdAt: first,
              updatedAt: last,
            })
            .where('id', '=', conversation.id)
            .execute();
          return conversation.id;
        },
        async remove(ids) {
          if (!ids.length) return;
          const query = app.container.resolve(crmToken).database.query();
          await query
            .deleteFrom('agConversationMessages')
            .where('conversationId', 'in', [...ids])
            .execute();
          await query
            .deleteFrom('agConversations')
            .where('id', 'in', [...ids])
            .execute();
        },
      }
    : undefined;
  return { demoAccounts, demoMailboxes, demoChats };
}
