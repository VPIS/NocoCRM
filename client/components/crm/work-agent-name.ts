import { useAgentText } from '@nocobase/app-plugin-agents/client/chat';
import { useCallback } from 'react';
import { toText, useCrmText, useMetadata } from './api.js';

export type Work =
  'leads' | 'opportunities' | 'approvals' | 'tasks' | 'signals';

// The agent doing a dialog's AI work (crm-agents/work-agents.ts), named in
// the viewer's language as the Agents page names it: a lead's capture and
// merge by the lead follow-up, a deal's capture by the opportunity
// follow-up, a task's outcome write-up by the task assistant. Null while
// that agent is archived or gone, the work then following another agent's
// model.
export function useWorkAgentName(work: Work): string | null {
  return useWorkAgentNames()(work);
}

// The same for any work, for a page naming several (the Auto follow-up
// page's tabs).
export function useWorkAgentNames(): (work: Work) => string | null {
  const agentText = useAgentText();
  const names = useMetadata().data?.workAgentNames;
  return useCallback(
    (work) => {
      const agent = names?.[work];
      return agent
        ? agentText.name({ name: agent.name, nameText: agent.nameText })
        : null;
    },
    [names, agentText],
  );
}

// Words naming a work's agent (`agentWork.words.<key>`, its name in place
// of {{agent}}): a record's AI buttons, chips, cards and their progress, as
// "运行 线索跟进". The AI's own words (`fallback`) while the work has no agent
// of its own.
export function useAgentWords(): (
  work: Work,
  key: string,
  fallback: string,
) => string {
  const { text } = useCrmText();
  const agentText = useAgentText();
  const names = useMetadata().data?.workAgentNames;
  return useCallback(
    (work, key, fallback) => {
      const agent = names?.[work];
      return toText(
        agent
          ? text(`agentWork.words.${key}`, {
              agent: agentText.name({
                name: agent.name,
                nameText: agent.nameText,
              }),
            })
          : text(fallback),
      );
    },
    [names, text, agentText],
  );
}
