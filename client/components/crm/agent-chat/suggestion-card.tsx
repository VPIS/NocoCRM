import { Skeleton } from '#components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';
import { toText, useCrmQuery, useCrmText, type Detail } from '../api.js';
import { ReviewPanel, type ReviewEntry } from '../approval-review.js';
import { RecordLink } from '../common.js';
import { recordTitle } from '../lookups.js';
import { VerdictPanel, type EvaluationEntry } from '../lead-evaluation.js';
import { PrepPanel, type PrepEntry } from '../task-preparation.js';

// An AI agent's suggestion shown in a conversation, where its `aiWork`
// notice names it (server/providers/crm-agents/ai-work-news.ts): the very
// card its record's timeline and the inbox show, decided here as there, so
// what the conversation says and what the inbox holds are one suggestion.
// A card redone from here stays shown; one replaced otherwise says so.

type Suggested = 'leads' | 'opportunities' | 'approvals' | 'tasks';

const LATEST: Record<Suggested, (id: string) => string> = {
  leads: (id) => `leads/${id}/evaluations/latest`,
  opportunities: (id) => `opportunities/${id}/evaluations/latest`,
  approvals: (id) => `approvals/${id}/reviews/latest`,
  tasks: (id) => `tasks/${id}/preparations/latest`,
};

type AnyEntry = {
  id: string;
  recordId?: string;
  status: string;
  createdAt: string;
  ai: { revises?: string } & Record<string, unknown>;
};

export function SuggestionCard({
  entity,
  recordId,
  entryId,
}: {
  entity: Suggested;
  recordId: string;
  entryId: string;
}): ReactElement | null {
  const { text } = useCrmText();
  const client = useQueryClient();
  const path = `${entity}/${encodeURIComponent(recordId)}`;
  const detail = useCrmQuery<Detail>(path);
  const latest = useCrmQuery<AnyEntry | null>(
    LATEST[entity](encodeURIComponent(recordId)),
  );
  // The card shown, and those it became when the person had it redone here.
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set([entryId]));
  const refresh = () => client.invalidateQueries({ queryKey: ['crm'] });
  if (detail.isLoading || latest.isLoading)
    return <Skeleton className='h-24 w-full rounded-lg' />;
  const record = detail.data?.record;
  if (!record) return null;
  // Named as everywhere a record is linked: a lead "name / company", a
  // deal "company / deal" (lookups.ts).
  const name =
    recordTitle(entity, record, detail.data?.titles) || toText(record.name);
  const link = <RecordLink entity={entity} record={{ id: recordId, name }} />;
  const entry = latest.data;
  const current =
    entry &&
    (ids.has(entry.id) || (entry.ai.revises && ids.has(entry.ai.revises)))
      ? entry
      : null;
  if (entry && current && !ids.has(entry.id))
    setIds(new Set([...ids, entry.id]));
  if (!current)
    return (
      <p className='text-center text-xs text-muted-foreground'>
        {text('aiWork.replaced', { title: name })}
      </p>
    );
  const revised = (next: { id: string }) => {
    setIds(new Set([...ids, next.id]));
  };
  return (
    <div className='flex flex-col gap-1.5' data-ai-card>
      {entity === 'leads' || entity === 'opportunities' ? (
        <VerdictPanel
          entity={entity}
          entry={current as unknown as EvaluationEntry}
          recordId={recordId}
          recordName={name}
          editable={detail.data?.permissions.edit ?? false}
          onChanged={refresh}
          onRevised={revised}
          heading={link}
        />
      ) : (
        <>
          <div className='px-1 text-sm'>{link}</div>
          {entity === 'tasks' ? (
            <PrepPanel
              entry={current as unknown as PrepEntry}
              task={record}
              onChanged={refresh}
            />
          ) : (
            <ReviewPanel
              entry={current as unknown as ReviewEntry}
              approvalId={recordId}
              approvalName={name}
              onChanged={refresh}
              onRevised={revised}
            />
          )}
        </>
      )}
    </div>
  );
}
