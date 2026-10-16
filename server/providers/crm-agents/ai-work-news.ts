import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import { readEntry } from '../crm/ai-entries.js';
import { takeAiWatch } from '../crm/ai-watches.js';
import { definitions, toText, type Entity } from '../crm/schema.js';
import type { CrmService } from '../crm/service.js';

// How AI work an agent asked for from a conversation (`crm leads
// request-follow-up` and its kin) reaches that conversation once its run
// finishes: a notice the person sees, and an input that wakes the agent
// with what the work came to, so it tells the person and proposes acting on
// it. Work nobody asked for from a conversation has no watch and tells no
// one here.

const WORK: Record<string, { agent: string; read: string; act: string }> = {
  leads: {
    agent: 'Lead follow-up',
    read: 'crm leads follow-up',
    act: 'propose acting on it in a plan (`suggestion.decide`, or the steps it implies)',
  },
  opportunities: {
    agent: 'Opportunity follow-up',
    read: 'crm opportunities follow-up',
    act: 'propose acting on it in a plan (`suggestion.decide`, or the steps it implies)',
  },
  approvals: {
    agent: 'Approval review',
    read: 'crm approvals review',
    act: 'propose deciding the approval in a plan (`approval.decide`) if the person agrees with it',
  },
  tasks: {
    agent: 'Task assistant',
    read: 'crm tasks preparation',
    act: 'propose writing it into the task in a plan (`suggestion.decide`) if it fits',
  },
};

// What the agent reads of the result, inline, so it need not look it up.
const RESULT_LIMIT = 6000;

export function deliverAiWork(
  agents: Agents,
  service: CrmService,
): (entryId: string) => Promise<void> {
  return async (entryId) => {
    const watch = await takeAiWatch(service.database, entryId);
    const work = watch ? WORK[watch.entity] : undefined;
    if (!watch || !work) return;
    const query = service.database.query();
    const row = await query
      .selectFrom('crmHistory')
      .selectAll()
      .where('id', '=', entryId)
      .executeTakeFirst();
    if (!row) return;
    const entry = readEntry<Record<string, unknown>>(row);
    const record = await query
      .selectFrom(definitions[watch.entity as Entity].table)
      .select(['name'])
      .where('id', '=', watch.recordId)
      .executeTakeFirst();
    const name = toText(record?.name ?? '');
    const ready = entry.status === 'pending' && Boolean(entry.ai.result);
    const about = `${watch.entity.replace(/s$/u, '').replace(/ie$/u, 'y')} "${name}" (${watch.recordId})`;
    const text = ready
      ? `The ${work.agent} agent finished the work you asked for on ${about}. Its suggestion (entry ${entryId}) now waits on the person, in their inbox and on the record. What it suggests:\n${JSON.stringify(entry.ai.result).slice(0, RESULT_LIMIT)}\nTell the person in a few lines what it suggests and why, in their language, and ${work.act}. \`${work.read} ${watch.recordId}\` reads it again.`
      : `The ${work.agent} agent could not finish the work you asked for on ${about}${entry.ai.error ? ` (${toText((entry.ai.error as { code?: unknown }).code ?? 'failed')})` : ''}. Nothing changed; tell the person briefly.`;
    await agents.tx.run((tx) =>
      agents.conversations.deliver(tx, watch.conversationId, {
        notice: {
          code: 'news',
          type: 'aiWork',
          title: name,
          params: {
            entity: watch.entity,
            recordId: watch.recordId,
            entryId,
            outcome: ready ? 'ready' : 'failed',
          },
        },
        input: {
          type: 'signal',
          actor: { kind: 'system', id: 'crm-ai-work', name: work.agent },
          text,
          payload: {
            entity: watch.entity,
            recordId: watch.recordId,
            entryId,
            outcome: ready ? 'ready' : 'failed',
          },
        },
      }),
    );
  };
}

// A company's signals check an agent asked for (`crm companies
// check-signals`), told to its conversation once the web search is done:
// what it found, or that it failed.
export async function deliverSignalCheck(
  agents: Agents,
  service: CrmService,
  watch: { conversationId: string; companyId: string },
  outcome:
    | {
        found: readonly {
          title: string;
          summary: string;
          type: string;
          occurredOn: string;
          sources?: unknown;
        }[];
      }
    | { error: unknown },
): Promise<void> {
  const company = await service.database
    .query()
    .selectFrom(definitions.companies.table)
    .select(['name'])
    .where('id', '=', watch.companyId)
    .executeTakeFirst();
  const name = toText(company?.name ?? '');
  const about = `company "${name}" (${watch.companyId})`;
  const ok = 'found' in outcome;
  const text = ok
    ? outcome.found.length
      ? `The Company signals agent searched the web for ${about} and found ${toText(outcome.found.length)} new signal(s), now on the company's Signals tab:\n${JSON.stringify(outcome.found).slice(0, RESULT_LIMIT)}\nTell the person in a few lines what they mean for the business, in their language, and propose what to do about them in a plan if anything should be done.`
      : `The Company signals agent searched the web for ${about} and found nothing new. Tell the person briefly.`
    : `The Company signals agent could not search the web for ${about} (${outcome.error instanceof Error ? outcome.error.message : 'failed'}). Nothing changed; tell the person briefly.`;
  await agents.tx.run((tx) =>
    agents.conversations.deliver(tx, watch.conversationId, {
      notice: {
        code: 'news',
        type: 'aiWork',
        title: name,
        params: {
          entity: 'companies',
          recordId: watch.companyId,
          outcome: ok ? 'ready' : 'failed',
        },
      },
      input: {
        type: 'signal',
        actor: { kind: 'system', id: 'crm-ai-work', name: 'Company signals' },
        text,
        payload: {
          entity: 'companies',
          recordId: watch.companyId,
          outcome: ok ? 'ready' : 'failed',
        },
      },
    }),
  );
}
