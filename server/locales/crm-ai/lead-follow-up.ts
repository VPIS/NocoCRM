// The words of the AI's lead follow-up (server/providers/crm/lead-evaluation.ts)
// that reach people or that the model is told to reuse in its output, in
// both languages: Chinese first, English second.

import type { Pair, Pairs } from './index.js';

// The name of the review task a nurtured lead gets, after the company name.
export const nurtureReviewName: Pair = ['培育复查', 'nurture review'];

// A task's name where the model left its reference (A1…) in a text;
// `%s` is the name. Chinese corner brackets, English quotation marks.
export const taskNameQuote: Pair = ['「%s」', '“%s”'];

// Words the verdict prompt hands the model to write in its output, in the
// output language.
export const followUpWords = {
  // What `changes` says when nothing changed.
  noChange: ['没有变化', 'No change'],
  // A side of a change that had or has no value.
  none: ['无', 'None'],
  // An example of an edition's name.
  editionExample: ['专业版', 'Professional'],
  // How a suggested value names the CRM material it came from.
  originalMessage: ['原始信息', 'original message'],
  comment: ['评论', 'comment'],
} as const satisfies Pairs;
