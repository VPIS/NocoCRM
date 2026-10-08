import type {
  WorkflowRunFunction,
  WorkflowRunJsonValue,
} from '@nocobase/app-plugin-workflow';
import { messageArgs, queueMessage } from './queue.js';

// Queues one reminder; the key names the task, its start and the
// recipient (the same key the scan used before), so a rerun of the node,
// or a later scan of the same task, never queues it twice.
export const run: WorkflowRunFunction = async (
  rawArgs: unknown,
  options,
): Promise<WorkflowRunJsonValue> => {
  options.signal.throwIfAborted();
  const message = messageArgs(
    rawArgs,
    ['starting'],
    (args) => `task:${args.recordId}:${args.at}:${args.recipientId}`,
    'tasks',
  );
  return { queued: await queueMessage(options, message) };
};
