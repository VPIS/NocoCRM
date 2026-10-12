import { toText } from '../crm/schema.js';
import type { CrmService } from '../crm/service.js';
import { jsonValue } from '../crm/values.js';

// The global search's AI answers (search-dialog.tsx): a question asked from
// the search is a conversation of its own, source SEARCH_SOURCE, answered
// in the dialog and listed nowhere (the conversation lists leave the source
// out). It stays only when the person goes on asking in it, which makes it
// an ordinary conversation of the source `crm`; otherwise it is deleted
// when they leave the answer, and one left behind (a window closed on it)
// by the daily sweep. The Agents plugin has no way to delete a
// conversation, or to change its source, so its rows are written here, as
// the demo's conversations are. @temporary(nocobase-official): until the
// plugin can delete a conversation, or answer once without one.

export const SEARCH_SOURCE = 'crm-search';
// What a kept one becomes: the CRM's own conversations.
const KEPT_SOURCE = 'crm';
// One left behind is swept once it is this old.
const STALE_MS = 60 * 60 * 1000;
// Where answers kept before they changed source were listed.
const LEGACY_KEPT_ROW = 'search-answers';

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

// The person goes on asking: the conversation stays theirs, as one of the
// CRM's.
export async function keepSearchAnswer(
  service: CrmService,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const query = service.database.query();
  const conversation = await query
    .selectFrom('agConversations')
    .select('source')
    .where('id', '=', conversationId)
    .where('userId', '=', userId)
    .executeTakeFirst();
  if (!conversation) return false;
  if (toText(conversation.source) === SEARCH_SOURCE)
    await query
      .updateTable('agConversations')
      .set({ source: KEPT_SOURCE })
      .where('id', '=', conversationId)
      .execute();
  return true;
}

// The person leaves the answer: the conversation goes.
export async function discardSearchAnswer(
  service: CrmService,
  userId: string,
  conversationId: string,
): Promise<void> {
  const conversation = await service.database
    .query()
    .selectFrom('agConversations')
    .select('id')
    .where('id', '=', conversationId)
    .where('userId', '=', userId)
    .where('source', '=', SEARCH_SOURCE)
    .executeTakeFirst();
  if (conversation) await deleteConversations(service, [conversationId]);
}

// The daily sweep: every answer nobody kept, left an hour or more.
export async function sweepSearchAnswers(
  service: CrmService,
  now = new Date(),
): Promise<{ deleted: number }> {
  const query = service.database.query();
  // Answers kept while they kept their source, listed in a settings row,
  // become the CRM's conversations first.
  const legacy = await query
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', LEGACY_KEPT_ROW)
    .executeTakeFirst();
  if (legacy) {
    const value = jsonValue(legacy.value);
    const kept = Array.isArray(value) ? value.map(toText) : [];
    if (kept.length)
      await query
        .updateTable('agConversations')
        .set({ source: KEPT_SOURCE })
        .where('id', 'in', kept)
        .where('source', '=', SEARCH_SOURCE)
        .execute();
    await query
      .deleteFrom('crmSettings')
      .where('id', '=', LEGACY_KEPT_ROW)
      .execute();
  }
  const left = await query
    .selectFrom('agConversations')
    .select(['id', 'createdAt'])
    .where('source', '=', SEARCH_SOURCE)
    .execute();
  const stale = left
    .filter((conversation) => {
      const at = Date.parse(toText(conversation.createdAt));
      return !Number.isNaN(at) && now.getTime() - at >= STALE_MS;
    })
    .map((conversation) => toText(conversation.id));
  await deleteConversations(service, stale);
  return { deleted: stale.length };
}
