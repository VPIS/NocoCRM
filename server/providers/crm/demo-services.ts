import { randomUUID } from 'node:crypto';
import type { Application } from '@nocobase/app-server/application';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { mailServiceToken } from '@nocobase/app-plugin-mail/server';
import { inAppNotificationStoreToken } from '@nocobase/app-plugin-notification-in-app/server';
import { databaseManagerToken } from '@nocobase/db';
import type { DemoChats, DemoInbox, DemoMailboxes } from './demo.js';
import { ASSISTANT_MARKER } from '../crm-agents/assistant.js';
import { jsonValue } from './values.js';
import {
  DEMO_MAIL_NAME,
  DEMO_MAIL_SECRET,
  DEMO_MAIL_TYPE,
} from './demo-mail.js';
import { toText } from './schema.js';

// What the demo dataset's import and clearing do through other plugins
// (its accounts are the demo mode plugin's): its mailboxes through the Mail plugin,
// the importer's conversations through the Agents plugin, and the
// notifications about its records through the in-app notification plugin.
// The CRM's table for each kind a notification's route names; companies
// were accounts until 202610100001_crm_companies, ids unchanged.
const RECORD_TABLES: Record<string, string> = {
  leads: 'crmLeads',
  opportunities: 'crmOpportunities',
  companies: 'crmCompanies',
  accounts: 'crmCompanies',
  contacts: 'crmContacts',
  tasks: 'crmTasks',
  approvals: 'crmApprovals',
};

export function demoServices(app: Application): {
  demoMailboxes: DemoMailboxes | undefined;
  demoChats: DemoChats | undefined;
  demoInbox: DemoInbox | undefined;
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
  // The importer's finished conversations with the CRM's assistant
  // (crm-agents/assistant.ts): the plugin makes the conversation, the messages
  // are written into its table as its store writes them, since a
  // conversation can only grow by a run of its agent and the demo runs no
  // model. @temporary(nocobase-official): until the plugin can import a
  // finished conversation. None without the plugin or before the assistant
  // exists.
  const demoChats: DemoChats | undefined = app.container.has(agentsToken)
    ? {
        async create(userId, chat) {
          const database = app.container.resolve(databaseManagerToken);
          const query = database.query();
          const marker = await query
            .selectFrom('crmSettings')
            .select('value')
            .where('id', '=', ASSISTANT_MARKER)
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
                // The first question carries the record it was asked
                // from, resolved as the plugin stores a page context.
                workContext:
                  index === 0 && chat.context
                    ? JSON.stringify({
                        route: chat.context.path,
                        items: [
                          {
                            kind: chat.context.kind,
                            id: chat.context.id,
                            title: chat.context.title,
                            key: null,
                            url: `${toText(app.publicBasePath)}${chat.context.path}`,
                          },
                        ],
                        dropped: 0,
                      })
                    : null,
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
          const query = app.container.resolve(databaseManagerToken).query();
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
  // Everyone's in-app notifications whose route target names a CRM record
  // that no longer exists: the demo's, once its records are deleted, and any
  // left by an earlier removal or a deleted record, which would only open a
  // record that is gone. Found by reading the plugin's items and the CRM's
  // tables, deleted through its store, as a person deleting one from their
  // inbox would.
  const demoInbox: DemoInbox | undefined = app.container.has(
    inAppNotificationStoreToken,
  )
    ? {
        async removeOrphans() {
          const store = app.container.resolve(inAppNotificationStoreToken);
          const query = app.container.resolve(databaseManagerToken).query();
          const items = await query
            .selectFrom('notificationInAppItems')
            .select(['id', 'userId', 'target'])
            // A record's page, /<entity>/<id>, or under /crm as a notice
            // sent before 2026-10-19 names it.
            .where((eb) =>
              eb.or(
                Object.keys(RECORD_TABLES).map((entity) =>
                  eb('target', 'like', `%/${entity}/%`),
                ),
              ),
            )
            .execute();
          const byTable = new Map<string, Set<string>>();
          const targets = items.flatMap((item) => {
            const target = (jsonValue(item.target) ?? {}) as {
              path?: unknown;
            };
            const match = /^(?:\/crm)?\/([a-z]+)\/([^/?#]+)/.exec(
              toText(target.path),
            );
            const table = match ? RECORD_TABLES[match[1] ?? ''] : undefined;
            if (!match || !table) return [];
            const id = match[2] ?? '';
            byTable.set(table, (byTable.get(table) ?? new Set()).add(id));
            return [{ item, table, id }];
          });
          const present = new Set<string>();
          for (const [table, ids] of byTable)
            for (let at = 0; at < ids.size; at += 500) {
              const rows = await query
                .selectFrom(table)
                .select('id')
                .where('id', 'in', [...ids].slice(at, at + 500))
                .execute();
              for (const row of rows) present.add(`${table}:${toText(row.id)}`);
            }
          for (const { item, table, id } of targets)
            if (!present.has(`${table}:${id}`))
              await store.update({
                id: toText(item.id),
                userId: toText(item.userId),
                action: 'delete',
              });
        },
      }
    : undefined;
  return { demoMailboxes, demoChats, demoInbox };
}
