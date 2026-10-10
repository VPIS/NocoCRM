import { z } from 'zod';

// Comments in a record's activity feed (CrmService.addComment): a comment's
// body is its text, the colleagues it @-mentions and its files.

const text = z.string().meta({
  description:
    'The comment, in Markdown; may be empty when files are attached.',
});
const mentions = z
  .array(z.string())
  .meta({ description: 'The user ids it @-mentions; each is told once.' });
const attachments = z
  .array(z.string())
  .nullable()
  .meta({ description: 'Attachment ids uploaded for it.' });

export const CreateCommentInput = z.strictObject({
  text: text.optional(),
  mentions: mentions.optional(),
  replyTo: z.string().nullable().optional().meta({
    description: 'The comment of the same record it answers.',
  }),
  attachments: attachments.optional(),
});

export const UpdateCommentInput = z.strictObject({
  text: text.optional(),
  mentions: mentions.optional(),
  attachments: attachments.optional().meta({
    description: 'Its files as they now stand; left out, they stay.',
  }),
});

export const CommentParams = z.object({ commentId: z.string() });

// A file attached to one of a record's comments.
export const CommentAttachment = z
  .object({
    fileId: z.string(),
    commentId: z.string(),
    actorId: z.string().meta({ description: 'Who attached it.' }),
  })
  .meta({ ref: 'CrmCommentAttachment' });
