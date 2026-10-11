import type { ConversationRules } from '@nocobase/app-plugin-agents/server/tokens';
import { settingsGuidance } from '../crm/guidance.js';
import type { CrmSettings } from '../crm/schema.js';
import { DEFAULT_TIME_ZONE } from '../crm/zone-time.js';

// What every conversation with an agent on the CRM holds, whatever the
// agent's own instructions say (an administrator may change those): the
// deployment's business guidance (server/providers/crm/guidance.ts, in
// the CRM's AI language, with the reminders' days from the settings) and the
// CRM's rules for how work is recorded. The plugin calls this inside the
// claim's transaction, so it reads nothing: the settings are the ones the
// provider holds, refreshed whenever they are saved.
export function crmConversationRules(
  settings: () => CrmSettings | null,
): ConversationRules {
  return () => {
    const current = settings();
    const guidance = settingsGuidance(current);
    return Promise.resolve({
      rules: [
        'Something that took place with a customer (a call, a meeting, a visit) is recorded as a comment on the record it concerns, or as the outcome of the open task that planned it, proposed in a plan like any change.',
        'Mail reaches the records by itself: never record an email as a comment or a task.',
        "A lead's original message is never changed.",
        "A lead or an opportunity a plan creates is followed up by the AI as soon as it exists, and that follow-up plans its next step (the first contact, as a task or an email): do not add a task or another follow-up step for it to the same plan unless the person asked for that task. Write what you learned about when or how to reach the customer into the record (a lead's message, a deal's description), where the follow-up reads it.",
        "An item of kind crm-evaluation in the page context is an AI card (a lead's or a deal's follow-up, an approval's review, a task's preparation) in its record's history: read it with the record's history command and find the entry by its id before discussing it. To do something else than it proposes, propose a plan; never decide the card for the person.",
        "Asked about one lead's or one deal's next step, read the lead-follow-up or opportunity-follow-up skill; about judging one approval, the approval-review skill; about getting ready for one task, the task-preparation skill. Do not read them for questions across the pipeline.",
        // How to read the CRM in few steps: every model call between two
        // commands costs seconds, and a run that first explored the help
        // and the JSON's shape took a minute to answer.
        "For what to do today, what needs attention or how the business is going, start with `crm dashboard` (the person's own records; `--scope team` for the team's): one call returns today's and the overdue tasks, the approvals waiting, the attention counts, this month's business and the reports (funnel, forecast, lost reasons, stage times, sources, each seller's activity). Do not rebuild them from lists. Its attention counts (stale, closingSoon, overdueOpportunities, uncontacted…) name their records in `crm <area> statistics` as `.result.data.members.<count>` (ids); read those at once with `crm <area> list --ids <id,id,…>`.",
        'The commands are `crm <area> list | get | history | summary | statistics` for leads, companies, contacts, opportunities, tasks and approvals, `crm search`, `crm colleagues list`, `crm dashboard` and `crm plan`. Do not run `--help` to find them; run `crm docs <command>` only before writing a plan step for it.',
        "Every command prints `{ ok, result: { data, meta } }`. A list's records are `.result.data[]`, with `.result.meta.total` and `.result.meta.names` (id → name); a get's record is `.result.data.record`, with the first page of `.result.data.history`; a history's entries are `.result.data[]`. Main fields: ownerId, companyId, leadId, opportunityId; an opportunity's stage, amount, currency, expectedCloseAt; a task's status (open, completed, cancelled) and dueAt; an approval's status, topic and approverId.",
        'Put commands that do not depend on each other in one shell call. Cut output with jq or `head -n`, never `head -c`, which splits Chinese characters into unreadable bytes.',
        'There is no web search: when a question needs information from outside the CRM, say so.',
        `Times the commands return are UTC; speak of them in the CRM's time zone, ${current?.timeZone ?? DEFAULT_TIME_ZONE}.`,
      ],
      sections: guidanceSections(guidance),
    });
  };
}

// The guidance's Markdown as the plugin's sections: each heading with the
// lines under it.
function guidanceSections(markdown: string): string[][] {
  const sections: string[][] = [];
  for (const line of markdown.split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('#') || !sections.length) sections.push([line]);
    else sections[sections.length - 1].push(line);
  }
  return sections;
}
