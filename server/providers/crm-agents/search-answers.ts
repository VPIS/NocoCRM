import { toText } from '../crm/schema.js';
import type { CrmService } from '../crm/service.js';
import { encodeRow, jsonValue } from '../crm/values.js';

// The global search's AI answers (search-dialog.tsx): a question asked from
// the search is a conversation of its own, source SEARCH_SOURCE, answered
// in the dialog; it stays only when the person goes on asking in it (kept),
// and is otherwise deleted when they leave the answer. The Agents plugin
// has no way to delete a conversation, so its rows are deleted here, as the
// demo's conversations are. @temporary(nocobase-official): until the plugin
// can delete a conversation, or answer once without one.

export const SEARCH_SOURCE = 'crm-search';
// The ids kept: the CRM settings' row.
const KEPT_ROW = 'search-answers';
// One left behind (the window closed on it) is swept after this long.
const STALE_MS = 60 * 60 * 1000;

async function keptIds(service: CrmService): Promise<string[]> {
  const row = await service.database
    .query()
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', KEPT_ROW)
    .executeTakeFirst();
  const value = jsonValue(row?.value);
  return Array.isArray(value) ? value.map(toText) : [];
}

async function deleteConversations(
  service: CrmService,
  ids: readonly string[],
): Promise<void> {
  if (!ids.length) return;
  const query = service.database.query();
  await query
    .deleteFrom('agConversationMessages')
    .where('conversationId', 'in', [...ids])
    .execute();
  await query
    .deleteFrom('agConversations')
    .where('id', 'in', [...ids])
    .execute();
}

// The person goes on asking: the conversation stays theirs.
export async function keepSearchAnswer(
  service: CrmService,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const query = service.database.query();
  const conversation = await query
    .selectFrom('agConversations')
    .select('id')
    .where('id', '=', conversationId)
    .where('userId', '=', userId)
    .where('source', '=', SEARCH_SOURCE)
    .executeTakeFirst();
  if (!conversation) return false;
  const kept = await keptIds(service);
  if (kept.includes(conversationId)) return true;
  const value = [...kept, conversationId];
  const now = new Date();
  const updated = await query
    .updateTable('crmSettings')
    .set(encodeRow({ value, updatedAt: now }))
    .where('id', '=', KEPT_ROW)
    .execute();
  if (!updated.updatedCount)
    await query
      .insertInto('crmSettings')
      .values(encodeRow({ id: KEPT_ROW, value, updatedAt: now }))
      .execute();
  return true;
}

// The person leaves the answer: the conversation goes, with any of theirs
// left behind an hour or more that they did not keep.
export async function discardSearchAnswer(
  service: CrmService,
  userId: string,
  conversationId: string,
  now = new Date(),
): Promise<void> {
  const kept = new Set(await keptIds(service));
  const theirs = await service.database
    .query()
    .selectFrom('agConversations')
    .select(['id', 'createdAt'])
    .where('userId', '=', userId)
    .where('source', '=', SEARCH_SOURCE)
    .execute();
  await deleteConversations(
    service,
    theirs
      .filter((conversation) => {
        const id = toText(conversation.id);
        if (kept.has(id)) return false;
        if (id === conversationId) return true;
        const at = Date.parse(toText(conversation.createdAt));
        return !Number.isNaN(at) && now.getTime() - at >= STALE_MS;
      })
      .map((conversation) => toText(conversation.id)),
  );
}
