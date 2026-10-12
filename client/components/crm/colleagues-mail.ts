import {
  toText,
  useCrmQuery,
  useMetadata,
  type Data,
  type Entity,
} from './api.js';

// The record's conversations that sit in colleagues' mailboxes, from its
// timeline: mail-timeline.ts writes one entry per conversation and mailbox,
// the mailbox's owner its actor, with a summary everyone who reads the
// record may see. The tab lists the reader's own mail, which they open; a
// record whose mail is all a colleague's read 0 there while its timeline
// told of it, so these are listed and counted beside it, by their summary
// alone, since a mailbox's messages are its owner's.
export interface ColleagueConversation {
  readonly key: string;
  readonly subject: string;
  readonly count: number;
  readonly lastFrom: string;
  readonly owner: string;
  readonly at: string;
}

export function useColleaguesMail(record?: {
  entity: Entity;
  id: string;
}): readonly ColleagueConversation[] | undefined {
  const { data: meta } = useMetadata();
  const { data } = useCrmQuery<Data[]>(
    record
      ? `${record.entity}/${encodeURIComponent(record.id)}/history?source=mail&pageSize=100`
      : '',
    Boolean(record),
  );
  if (!record || !meta || !data) return undefined;
  const conversations = new Map<string, ColleagueConversation>();
  for (const entry of data) {
    if (toText(entry.action) !== 'mail') continue;
    const owner = toText(entry.actorId);
    if (!owner || owner === meta.userId) continue;
    const key = toText(entry.sourceKey) || toText(entry.id);
    const mail = (entry.changes ?? {}) as Data;
    const at = toText(entry.occurredAt) || toText(entry.createdAt);
    const known = conversations.get(key);
    if (known && known.at >= at) continue;
    conversations.set(key, {
      key,
      subject: toText(mail.subject),
      count: Number(mail.count) || 1,
      lastFrom: toText(mail.lastFromName) || toText(mail.lastFrom),
      owner:
        toText(meta.users.find((user) => toText(user.id) === owner)?.name) ||
        owner,
      at,
    });
  }
  return [...conversations.values()].sort((a, b) => b.at.localeCompare(a.at));
}
