import { z } from 'zod';
import type {
  PlanStepView,
  PlanView,
} from '../../providers/crm/plans/engine.js';
import { PLAN_STATUSES } from '../../providers/crm/plans/engine.js';
import { entities } from '../../providers/crm/schema.js';
import { JsonObject, PageQuery } from './common.js';
import { ConvertLeadInput } from './operations.js';
import { InputSchemas } from './records.js';

// Plans an agent proposes and a person confirms (plans/engine.ts). A step's
// parameters are those of the command it stands for, so the fields an agent
// reads in a command's help are the ones it writes into a plan.

const ref = z.string().max(40).optional().meta({
  description:
    "A name later steps use in place of the id of the record this step creates; `$1`, `$2` … (the step's place) work too.",
});
const id = (what: string) =>
  z.string().meta({
    description: `The ${what}'s id, or \`$n\` for one an earlier step creates.`,
  });
const followUp = z.boolean().optional().meta({
  description:
    'Whether the AI follows the record up once the step is carried out; true by default.',
});
const entity = z.enum(entities);

const createStep = z.strictObject({
  op: z.literal('record.create'),
  ref,
  params: z.union(
    entities.map((name) =>
      z.strictObject({
        entity: z.literal(name),
        values: InputSchemas[name],
        followUp,
      }),
    ) as unknown as [z.ZodObject, z.ZodObject, ...z.ZodObject[]],
  ),
});
const updateStep = z.strictObject({
  op: z.literal('record.update'),
  ref,
  params: z.union(
    entities.map((name) =>
      z.strictObject({
        entity: z.literal(name),
        id: id('record'),
        values: InputSchemas[name],
      }),
    ) as unknown as [z.ZodObject, z.ZodObject, ...z.ZodObject[]],
  ),
});
const convertStep = z.strictObject({
  op: z.literal('lead.convert'),
  ref,
  params: z.strictObject({
    leadId: id('lead'),
    conversion: ConvertLeadInput.omit({ followUp: true }),
    followUp,
  }),
});
const commentStep = z.strictObject({
  op: z.literal('comment.create'),
  ref,
  params: z.strictObject({
    entity,
    id: id('record'),
    text: z.string().min(1).meta({ description: 'The comment, in Markdown.' }),
    mentions: z
      .array(z.string())
      .optional()
      .meta({ description: 'User ids the comment @-mentions.' }),
  }),
});
const outcomeStep = z.strictObject({
  op: z.literal('task.recordOutcome'),
  ref,
  params: z.strictObject({
    taskId: id('task'),
    outcome: z.string().optional().meta({ description: 'What came of it.' }),
    followUp,
  }),
});
const approvalStep = (op: 'approval.submit' | 'approval.withdraw') =>
  z.strictObject({
    op: z.literal(op),
    ref,
    params: z.strictObject({
      approvalId: id('approval'),
      comment: z.string().optional(),
    }),
  });

export const PlanStepInput = z
  .discriminatedUnion('op', [
    createStep,
    updateStep,
    convertStep,
    commentStep,
    outcomeStep,
    approvalStep('approval.submit'),
    approvalStep('approval.withdraw'),
  ])
  .meta({ ref: 'CrmPlanStepInput' });

export const CreatePlanInput = z.strictObject({
  title: z.string().trim().min(1).max(255).meta({
    description: 'What the plan does, in a line the person reads on its card.',
  }),
  summary: z.string().max(5000).optional().meta({
    description: 'Why, in a few sentences, with what it is based on.',
  }),
  steps: z.array(PlanStepInput).min(1).max(50).meta({
    description: 'Carried out in this order, all or none.',
  }),
});

export const PlanParams = z.object({ planId: z.string() });

export const PlansQuery = z.object({
  ...PageQuery.shape,
  status: z.enum(PLAN_STATUSES).optional(),
  target: z.string().optional().meta({
    description: 'Only plans touching this record, as `<object>:<id>`.',
  }),
  conversationId: z.string().optional(),
});

export const DecidePlanInput = z.strictObject({
  revision: z.number().int().meta({
    description: 'The revision decided on, as last read.',
  }),
  skip: z.array(z.number().int().min(1)).optional().meta({
    description: 'Steps, by their place, the person left out.',
  }),
});

export const VoidPlanInput = z.strictObject({
  revision: z.number().int(),
});

export const RevisePlanStepParams = z.object({
  planId: z.string(),
  position: z.coerce.number().int().min(1),
});

export const RevisePlanStepInput = z.strictObject({
  revision: z.number().int().meta({
    description: 'The revision changed, as last read.',
  }),
  values: JsonObject.meta({
    description:
      'The fields of the record the step creates or updates to change, laid over the values it holds.',
  }),
});

const StepView: z.ZodType<PlanStepView> = z.object({
  id: z.string(),
  position: z.number().int(),
  op: z.string(),
  ref: z.string().nullable(),
  params: JsonObject,
  check: z
    .object({
      entity: z.string(),
      id: z.string().nullable(),
      name: z.string(),
      changes: z.array(
        z.object({ field: z.string(), from: z.unknown(), to: z.unknown() }),
      ),
      updatedAt: z.string().nullable().optional(),
    })
    .nullable()
    .meta({ description: 'What the rehearsal found the step would do.' }),
  status: z.enum(['pending', 'done', 'failed', 'removed']),
  result: JsonObject.nullable(),
}) as unknown as z.ZodType<PlanStepView>;

export const PlanSchema: z.ZodType<PlanView> = z
  .object({
    id: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    status: z.enum(PLAN_STATUSES),
    revision: z.number().int(),
    proposerUserId: z.string(),
    agentId: z.string().nullable(),
    agentName: z.string().nullable(),
    runId: z.string().nullable(),
    conversationId: z.string().nullable(),
    deciderUserId: z.string().nullable(),
    decidedAt: z.string().nullable(),
    failure: JsonObject.nullable(),
    expiresAt: z.string(),
    createdAt: z.string(),
    steps: z.array(StepView),
  })
  .meta({ ref: 'CrmPlan' });
