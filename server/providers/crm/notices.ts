import type { Row } from '@nocobase/db';
import type { Actor } from './authorization.js';
import { asEntity, toText } from './schema.js';
import type { CrmService } from './service.js';
import { jsonValue } from './values.js';

// What the CRM knows about the in-app notifications it sent a reader, for the
// inbox's detail (the template's InboxSource `notices`): each by its
// notification's id, from the outbox row that sent it (CrmProvider records
// the id once delivered): what happened (the row's event), on which record,
// who did it and when, and, for a comment that mentioned the reader or a
// reply in a thread they wrote in, the comment itself and the comment its
// thread hangs from. A notification is the
// reader's alone, and the comment is given only while they may still read
// the record.

export interface CrmNotice {
  notificationId: string;
  source: 'crm';
  kind: 'info';
  type: string;
  subject: { type: string; id: string; label: null };
  decisionKey: null;
  data: Row;
  count: 1;
  resolvedAt: null;
  outcome: null;
}

// The comment a mention or a reply notification is about: the last part of
// its outbox row's id, the key it was queued under (CrmService.mentioned,
// addComment).
const COMMENT_EVENTS = new Set(['mentioned', 'replied']);

export async function noticesOf(
  service: CrmService,
  actor: Actor,
  notificationIds: readonly string[],
): Promise<CrmNotice[]> {
  const ids = [...new Set(notificationIds.filter(Boolean))].slice(0, 200);
  if (!ids.length) return [];
  const query = service.database.query();
  const rows = await query
    .selectFrom('crmOutbox')
    .selectAll()
    .where('recipientId', '=', actor.id)
    .where('notificationId', 'in', ids)
    .execute();
  const notices: CrmNotice[] = [];
  for (const row of rows) {
    const entity = toText(row.entity);
    const recordId = toText(row.recordId);
    const event = toText(row.event);
    let comment: Row | null = null;
    let actorId = row.actorId ? toText(row.actorId) : null;
    if (COMMENT_EVENTS.has(event)) {
      const commentId = toText(row.id).split(':').at(-1) ?? '';
      try {
        // Only while the reader may still read the record.
        await service.get(actor, asEntity(entity), recordId);
        const entry = await query
          .selectFrom('crmHistory')
          .select(['id', 'changes', 'actorId', 'createdAt', 'replyToId'])
          .where('id', '=', commentId)
          .where('recordId', '=', recordId)
          .where('action', '=', 'comment')
          .executeTakeFirst();
        const changes = (jsonValue(entry?.changes) ?? {}) as Row;
        // A row queued before the actor was kept: the comment's author.
        if (entry && !actorId) actorId = toText(entry.actorId);
        // The comment a reply's thread hangs from, which the timeline lists
        // (a reply may answer another reply).
        let thread = entry ? toText(entry.id) : '';
        let parent = entry?.replyToId ? toText(entry.replyToId) : '';
        for (let step = 0; parent && step < 20; step += 1) {
          thread = parent;
          const up = await query
            .selectFrom('crmHistory')
            .select(['replyToId'])
            .where('id', '=', parent)
            .executeTakeFirst();
          parent = up?.replyToId ? toText(up.replyToId) : '';
        }
        if (entry && !changes.deleted)
          comment = {
            id: toText(entry.id),
            thread,
            text: toText(changes.text ?? ''),
            files: Array.isArray(changes.attachments)
              ? changes.attachments.length
              : 0,
            reply: Boolean(entry.replyToId),
          };
      } catch {
        // A record the reader may no longer read: said without the comment.
      }
    }
    notices.push({
      notificationId: toText(row.notificationId),
      source: 'crm',
      kind: 'info',
      type: event,
      subject: { type: entity, id: recordId, label: null },
      decisionKey: null,
      data: {
        entity,
        recordId,
        actorId,
        at: toText(row.createdAt),
        comment,
      },
      count: 1,
      resolvedAt: null,
      outcome: null,
    });
  }
  // A notification the outbox no longer holds (sent before its id was
  // recorded, or its row removed with a demo dataset) is still the reader's
  // in-app item, whose route target names the record: known by that, with
  // nothing more to say of it.
  const known = new Set(notices.map((notice) => notice.notificationId));
  const rest = ids.filter((id) => !known.has(id));
  if (rest.length) {
    // Without the in-app plugin's table, they stay plain notifications.
    const items = await query
      .selectFrom('notificationInAppItems')
      .select(['notificationId', 'target', 'createdAt'])
      .where('userId', '=', actor.id)
      .where('notificationId', 'in', rest)
      .execute()
      .catch(() => []);
    for (const item of items) {
      const target = (jsonValue(item.target) ?? {}) as Row;
      const match = /^\/crm\/([a-z]+)\/([^/?#]+)/.exec(toText(target.path));
      if (!match || !CRM_ENTITIES.has(match[1] ?? '')) continue;
      notices.push({
        notificationId: toText(item.notificationId),
        source: 'crm',
        kind: 'info',
        type: '',
        subject: { type: match[1] ?? '', id: match[2] ?? '', label: null },
        decisionKey: null,
        data: {
          entity: match[1] ?? '',
          recordId: match[2] ?? '',
          actorId: null,
          at: toText(item.createdAt),
          comment: null,
        },
        count: 1,
        resolvedAt: null,
        outcome: null,
      });
    }
  }
  return notices;
}

const CRM_ENTITIES = new Set([
  'leads',
  'opportunities',
  'companies',
  'contacts',
  'tasks',
  'approvals',
]);
