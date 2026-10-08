import {
  ConditionInstruction,
  defineWorkflow,
  RunInstruction,
  TerminateInstruction,
  type WorkflowSourceAst,
} from '@nocobase/app-plugin-workflow';

// The reminder a task sends shortly before it starts, to its owner
// and each internal participant. The CRM's scheduled scan finds the
// tasks due and starts one run per recipient, keyed by the task,
// its start and the recipient, so a later scan of the same task starts
// nothing new; the workflow is the only sender.
const workflow: WorkflowSourceAst = defineWorkflow({
  title: 'Task reminder',
  description:
    'Reminds the owner and the internal participants that a task is about to start; how far ahead follows the "Task reminder" system setting. Administrators can switch reminders off in the parameters.',
  inputSchema: {
    type: 'object',
    required: ['taskId', 'recipientId', 'dueAt'],
    properties: {
      taskId: { type: 'string', minLength: 1 },
      recipientId: { type: 'string', minLength: 1 },
      dueAt: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
  parameters: {
    notify: {
      type: 'boolean',
      title: 'Send reminders',
      description: 'When off, no in-app reminder is sent before a task starts.',
      default: true,
    },
  },
  nodes: [
    ConditionInstruction.create({
      key: 'shouldNotify',
      title: 'Reminders on?',
      description:
        'Whether to send task reminders, as the administrator parameter says.',
      config: { module: './server/notify-enabled' },
    }).branch({
      yes: [],
      no: [
        TerminateInstruction.create({
          key: 'skipReminder',
          title: 'No reminder',
          description:
            'Reminders are off: this run sends nothing and ends normally.',
          config: { outcome: 'success' },
        }),
      ],
    }),
    RunInstruction.create({
      key: 'remind',
      title: 'Send the task reminder',
      description:
        'Sends the recipient "Upcoming task" through the CRM notification queue.',
      config: {
        module: './server/remind',
        args: {
          recordId: '{{$input.taskId}}',
          recipientId: '{{$input.recipientId}}',
          actorId: 'system',
          event: 'starting',
          at: '{{$input.dueAt}}',
        },
      },
      result: {
        type: 'object',
        required: ['queued'],
        properties: { queued: { type: 'boolean' } },
        additionalProperties: false,
      },
    }),
  ],
});

export default workflow;
