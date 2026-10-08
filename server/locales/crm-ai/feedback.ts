// The words of a task's result as the AI writes it up
// (server/providers/crm/feedback.ts): its conversation's title and the
// headings of the result, picked in the language it writes in.
import type { Pair, Pairs } from './index.js';

export const feedbackTitle: Pair = ['整理任务结果', 'Write up a task result'];

export const feedbackHeadings = {
  feedback: ['对方反馈', 'Their feedback'],
  facts: ['确认的事实', 'Facts confirmed'],
  agreed: ['约定', 'Agreed'],
  next: ['下一步', 'Next steps'],
} as const satisfies Pairs;
