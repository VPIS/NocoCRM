import type { ReactNode } from 'react';

// Mentions in a comment: which colleagues its text still names, and the text
// with them picked out, for a line or as Markdown (MentionTextarea writes
// them).

// The mentioned colleagues whose "@Name" the text still holds.
export function mentionsIn(
  text: string,
  mentions: readonly string[],
  users: readonly { id: string; name: string }[],
): string[] {
  return mentions.filter((id) => {
    const name = users.find((u) => u.id === id)?.name;
    return name ? text.includes(`@${name}`) : false;
  });
}

// How a mentioned colleague reads in a comment: in the primary purple, as a
// chat app marks an @, on no fill of its own.
export const MENTION_CLASS = 'font-medium text-primary';

// A comment's text with the colleagues it mentions picked out: each "@Name"
// as a mention, as the pieces of a line.
export function withMentions(
  text: string,
  mentions: unknown,
  users: readonly { id: string; name: string }[],
): ReactNode[] {
  const names = (Array.isArray(mentions) ? mentions : [])
    .map((id) => users.find((u) => u.id === String(id))?.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => b.length - a.length);
  if (!names.length) return [text];
  const pattern = new RegExp(
    `(${names.map((n) => `@${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).join('|')})`,
  );
  // Keyed by where each piece starts in the text.
  let offset = 0;
  return text.split(pattern).map((part, index) => {
    const start = offset;
    offset += part.length;
    return index % 2 ? (
      <span key={`m${String(start)}`} className={MENTION_CLASS}>
        {part}
      </span>
    ) : (
      part
    );
  });
}

// The same for a comment shown as Markdown: each "@Name" a link to #mention,
// which the CRM's Markdown draws as a mention rather than a link.
export function markdownMentions(
  text: string,
  mentions: unknown,
  users: readonly { id: string; name: string }[],
): string {
  let result = text;
  for (const id of Array.isArray(mentions) ? mentions : []) {
    const name = users.find((u) => u.id === String(id))?.name;
    if (name) result = result.split(`@${name}`).join(`[@${name}](#mention)`);
  }
  return result;
}
