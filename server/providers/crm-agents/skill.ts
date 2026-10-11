import { createHash } from 'node:crypto';
import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';

// The skill every online run gets on the CRM: how its commands are found and
// how a change is proposed as a plan. Prompt text, in English like the
// CRM's other prompts. The command help (`crm docs <command>`) states every
// field; this says what the help cannot: the plan's shape and its rules.
export const CRM_PLANS_SKILL = `---
name: crm-plans
description: How to look records up in the CRM with its commands, and how to propose changes to them as one plan the person confirms.
---

# Working in the CRM

## Looking things up

- The commands: leads, companies, contacts, opportunities, tasks and approvals each have \`list\`, \`get\`, \`history\`, \`summary\` and \`statistics\`; besides them \`search\`, \`colleagues list\`, \`dashboard\` and \`plan\`.
- \`crm dashboard\` (\`--scope team\` for the team's) gives today's and the overdue tasks, the approvals waiting, what needs attention, this month's business and the reports in one call.
- \`crm <area> list --q <words>\` finds records; \`crm <area> get <id>\` reads one with its first page of history and related records; \`crm <area> summary\` counts and totals, grouped by a field or a period.
- \`crm search --q <words>\` looks in every kind of record at once.
- \`crm colleagues list\` turns a person's name into the id \`ownerId\`, \`approverId\` and \`internalParticipants\` take.
- \`crm docs <command>\` shows a command's fields, their types and allowed values. Read it before writing a step for that command.

## Changing things: one plan

You never change a record directly. Every write command answers PLAN_REQUIRED. Put the whole change the person asked for into **one** plan, write it to a file and run:

\`\`\`
crm plan create --file /tmp/plan.json
\`\`\`

\`\`\`json
{
  "title": "Add Acme and its buyer, and plan the first call",
  "summary": "Met Jane Doe at the fair; she asked for a quote.",
  "steps": [
    { "op": "record.create", "ref": "acme",
      "params": { "entity": "companies", "values": { "name": "Acme", "source": "exhibition" } } },
    { "op": "record.create",
      "params": { "entity": "contacts", "values": { "name": "Jane Doe", "companyId": "$acme" } } },
    { "op": "record.create",
      "params": { "entity": "tasks", "values": { "name": "Call Jane about the quote", "companyId": "$acme" } } }
  ]
}
\`\`\`

Steps (\`op\` and its \`params\`):

| op | params |
| --- | --- |
| \`record.create\` | \`entity\`, \`values\` (the fields of \`crm <entity> create\`), optional \`followUp\` |
| \`record.update\` | \`entity\`, \`id\`, \`values\`: only the fields that change |
| \`lead.convert\` | \`leadId\`, \`conversion\` (the fields of \`crm leads convert\`) |
| \`comment.create\` | \`entity\`, \`id\`, \`text\` (Markdown), optional \`mentions\` (user ids) |
| \`task.recordOutcome\` | \`taskId\`, optional \`outcome\` |
| \`approval.submit\`, \`approval.withdraw\` | \`approvalId\`, optional \`comment\` |

- A step names a record an earlier step creates by its \`ref\` (\`$acme\`) or its place (\`$1\`), wherever an id goes.
- Use only the fields \`crm docs <command>\` lists for the command a step stands for: a field that is not there, or a value of the wrong type, refuses the whole plan (INVALID_INPUT); check each step's fields against the help again before retrying.
- The plan is rehearsed when you create it: if a step would be refused, the answer names it (\`steps.2\`) and why (\`required: name\`). Fix that step and create the plan again.
- Then tell the person in one line what the plan does and that it waits for them to confirm it. Do not say it is done.
- When the person decides, you are told: carried out, declined, failed at a step, or stale because a record changed meanwhile. Report it briefly; propose a new plan only if they still want the change.
- Deleting records and deciding approvals are never part of a plan.
`;

export function registerCrmSkill(agents: Agents): () => void {
  return agents.online.skills.register({
    slug: 'crm-plans',
    name: 'crm-plans',
    description:
      'How to look records up in the CRM with its commands, and how to propose changes to them as one plan the person confirms.',
    hash: createHash('sha256').update(CRM_PLANS_SKILL).digest('hex'),
    markdown: CRM_PLANS_SKILL,
    files: [],
  });
}

// The CRM's method skills (ai/skills: lead follow-up, opportunity
// follow-up, approval review, task preparation): the background runs' method
// (readSkill in crm/ai-model.ts), and skills of the Agents plugin's library
// attached to the assistant (library.ts), so a question in the chat about a
// lead's or a deal's next step, or an approval, is answered by the same
// method.
export const METHOD_SKILLS = [
  'lead-follow-up',
  'opportunity-follow-up',
  'approval-review',
  'task-preparation',
] as const;
