import {
  ConditionInstruction,
  defineWorkflow,
  RunInstruction,
  TerminateInstruction,
  type WorkflowSourceAst,
} from '@nocobase/app-plugin-workflow';

// The message a record change sends: to the new owner when a record
// changes hands, to a task's internal participants when they are invited,
// removed, rescheduled or told of a cancellation, and to a colleague a note
// on the record @-mentions. The CRM service
// commits the change and starts this workflow with the event and its
// recipient; the workflow is the only sender.
const notify = (key: string, title: string, description: string) =>
  RunInstruction.create({
    key,
    title,
    description,
    config: {
      module: './server/notify',
      args: {
        entity: '{{$input.entity}}',
        recordId: '{{$input.recordId}}',
        recipientId: '{{$input.recipientId}}',
        actorId: '{{$input.actorId}}',
        event: '{{$input.event}}',
        at: '{{$input.at}}',
      },
    },
    result: {
      type: 'object',
      required: ['queued'],
      properties: { queued: { type: 'boolean' } },
      additionalProperties: false,
    },
  });

const workflow: WorkflowSourceAst = defineWorkflow({
  title: 'Record change notifications',
  description:
    "Notifies the new owner when a record changes hands, a task's internal participants when they are invited or removed, or the task is rescheduled or cancelled, and a colleague a note mentions. Administrators can switch notifications off in the parameters.",
  inputSchema: {
    type: 'object',
    required: ['entity', 'recordId', 'recipientId', 'actorId', 'event', 'at'],
    properties: {
      entity: {
        type: 'string',
        enum: [
          'leads',
          'companies',
          'contacts',
          'opportunities',
          'tasks',
          'approvals',
        ],
      },
      recordId: { type: 'string', minLength: 1 },
      recipientId: { type: 'string', minLength: 1 },
      actorId: { type: 'string', minLength: 1 },
      event: {
        type: 'string',
        enum: [
          'assigned',
          'invited',
          'removed',
          'rescheduled',
          'cancelled',
          'mentioned',
        ],
      },
      at: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
  parameters: {
    notify: {
      type: 'boolean',
      title: 'Send notifications',
      description:
        "When off, no in-app notification is sent for a change of owner, of a task's participants, or for a mention in a note.",
      default: true,
    },
  },
  nodes: [
    ConditionInstruction.create({
      key: 'shouldNotify',
      title: 'Notifications on?',
      description:
        'Whether to send any record change notification, as the administrator parameter says.',
      config: { module: './server/notify-enabled' },
    }).branch({
      yes: [],
      no: [
        TerminateInstruction.create({
          key: 'skipNotification',
          title: 'No notification',
          description:
            'Notifications are off: this run sends nothing and ends normally.',
          config: { outcome: 'success' },
        }),
      ],
    }),
    ConditionInstruction.create({
      key: 'handoff',
      title: 'A change of owner?',
      description:
        "A change of owner goes to the new owner; every other event goes to the colleague it concerns: a task's participant, or the one a note mentions.",
      config: { module: './server/is-handoff' },
    }).branch({
      yes: [
        notify(
          'notifyOwner',
          'Tell the new owner',
          'Sends the new owner "Assigned to you" through the CRM notification queue.',
        ),
      ],
      no: [
        notify(
          'notifyParticipant',
          'Tell the colleague concerned',
          "Sends a task's participant an invitation, removal, rescheduling or cancellation message, or a mentioned colleague a mention, through the CRM notification queue.",
        ),
      ],
    }),
  ],
});

export default workflow;
