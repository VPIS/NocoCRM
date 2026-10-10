import type { ConversationRules } from '@nocobase/app-plugin-agents/server/tokens';
import { crmGuidance } from '../../ai/employees/crm-guidance.js';
import type { CrmSettings } from '../crm/schema.js';

// What every conversation with an agent on the CRM holds, whatever the
// agent's own instructions say (an administrator may change those): the
// deployment's business guidance (server/ai/employees/crm-guidance.ts, in
// the CRM's AI language, with the reminders' days from the settings) and the
// CRM's rules for how work is recorded. The plugin calls this inside the
// claim's transaction, so it reads nothing: the settings are the ones the
// provider holds, refreshed whenever they are saved.
export function crmConversationRules(
  settings: () => CrmSettings | null,
): ConversationRules {
  return () => {
    const current = settings();
    const guidance = crmGuidance(
      current
        ? {
            uncontacted: current.uncontactedDays,
            stale: current.leadStaleDays,
            closing: current.closeReminderDays,
          }
        : undefined,
      current?.aiLanguage,
    );
    return Promise.resolve({
      rules: [
        'Something that took place with a customer (a call, a meeting, a visit) is recorded as a comment on the record it concerns, or as the outcome of the open task that planned it, proposed in a plan like any change.',
        'Mail reaches the records by itself: never record an email as a comment or a task.',
        "A lead's original message is never changed.",
        "An item of kind crm-evaluation in the page context is an AI card (a lead's or a deal's follow-up, an approval's review, a task's preparation) in its record's history: read it with the record's history command and find the entry by its id before discussing it. To do something else than it proposes, propose a plan; never decide the card for the person.",
        "For a lead's or a deal's next step read the lead-follow-up or opportunity-follow-up skill, for judging an approval the approval-review skill, and for getting ready for a task the task-preparation skill, before advising.",
        'There is no web search: when a question needs information from outside the CRM, say so.',
        `Times the commands return are UTC; speak of them in the CRM's time zone, ${current?.timeZone ?? 'Asia/Shanghai'}.`,
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
