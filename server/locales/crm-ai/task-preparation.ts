// The words the AI's preparation of a task puts before the model and the
// owner (server/providers/crm/task-preparation.ts), picked in the language
// it writes in.
import type { Pair } from './index.js';

// The conversation the run takes place in, among the owner's sub-agent runs.
export const prepTitle: Pair = ['任务准备', 'Task preparation'];

// What the web search answers when it finds nothing.
export const prepNotFound: Pair = ['未查到相关信息', 'Nothing found'];
