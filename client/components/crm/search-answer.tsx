import { useQuery } from '@tanstack/react-query';
import { MessageSquare, RotateCw, Sparkles, X } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '../ui/button.js';
import { Spinner } from '../ui/spinner.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.js';
import {
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  type ListData,
} from './api.js';
import type { SearchAnswer as Answer } from './global-search-state.js';
import { Markdown } from './markdown.js';
import { SearchRow } from './search-results.js';

// The AI answer in the global search: the question, its progress while
// Noco works, the answer, and the records it found, read back through the
// reader's own list (so only what they may read), the first five here and
// the rest on the list.

// The tools whose steps the card names; the page tools are one step.
const STEPS = new Set([
  'search_records',
  'summarize_records',
  'get_record',
  'list_users',
]);
const PAGE_TOOLS = new Set(['loadFrontendTool', 'executeFrontendTool']);
const PREVIEW = 5;

export function SearchAnswer({
  answer,
  onClose,
  onFollowUp,
  onRetry,
  onOpenConversation,
  onGo,
}: {
  answer: Answer;
  onClose: () => void;
  onFollowUp: () => void;
  onRetry: () => void;
  onOpenConversation: () => void;
  // Opens a page, closing the search.
  onGo: (path: string) => void;
}): ReactElement {
  const { text } = useCrmText();
  const step = answer.step
    ? PAGE_TOOLS.has(answer.step)
      ? 'globalSearch.steps.frontend'
      : STEPS.has(answer.step)
        ? `globalSearch.steps.${answer.step}`
        : 'globalSearch.working'
    : 'globalSearch.working';
  return (
    <section
      aria-label={toText(text('globalSearch.answerTitle'))}
      aria-busy={answer.working}
      className='flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs'
    >
      <header className='flex items-start gap-2'>
        <Sparkles className='mt-0.5 size-4 shrink-0 text-ai' />
        <p className='min-w-0 flex-1 text-sm font-medium'>{answer.question}</p>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant='ghost'
                size='icon-xs'
                aria-label={toText(text('globalSearch.closeAnswer'))}
                onClick={onClose}
              />
            }
          >
            <X />
          </TooltipTrigger>
          <TooltipContent>{text('globalSearch.closeAnswer')}</TooltipContent>
        </Tooltip>
      </header>
      {answer.working && (
        <p
          role='status'
          className='flex items-center gap-2 text-sm text-muted-foreground'
        >
          <Spinner className='size-3.5' />
          {text(step)}
        </p>
      )}
      {answer.text && <Markdown compact>{answer.text}</Markdown>}
      {answer.found && <FoundPreview found={answer.found} onGo={onGo} />}
      {answer.decision && (
        <p className='rounded-lg bg-muted p-3 text-sm'>
          {text('globalSearch.needsDecision')}
        </p>
      )}
      {answer.failed !== undefined && (
        <p role='alert' className='rounded-lg bg-muted p-3 text-sm'>
          {/* The chat's own error text is the provider's, untranslated and
              technical: the reader is told plainly, and may try again. */}
          {text('globalSearch.answerFailed')}
        </p>
      )}
      {!answer.working && (
        <div className='flex flex-wrap gap-2'>
          {answer.failed !== undefined && (
            <Button variant='outline' size='sm' onClick={onRetry}>
              <RotateCw />
              {text('globalSearch.retry')}
            </Button>
          )}
          {answer.conversationId ? (
            <Button variant='outline' size='sm' onClick={onOpenConversation}>
              <MessageSquare />
              {text('globalSearch.openConversation')}
            </Button>
          ) : (
            answer.failed === undefined && (
              <Button variant='outline' size='sm' onClick={onFollowUp}>
                <MessageSquare />
                {text('globalSearch.followUp')}
              </Button>
            )
          )}
        </div>
      )}
    </section>
  );
}

// The records the answer found: the first few, through the reader's list.
function FoundPreview({
  found,
  onGo,
}: {
  found: NonNullable<Answer['found']>;
  onGo: (path: string) => void;
}): ReactElement | null {
  const { text } = useCrmText();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const ids = found.ids.join(',');
  const path = `${found.entity}?ids=${ids}&pageSize=${String(PREVIEW)}`;
  const list = useQuery({
    queryKey: [...scopeKey, 'global-search-found', path],
    queryFn: () => api<ListData>(path),
  });
  if (!list.data) return null;
  const rows = list.data.data;
  const total = list.data.total;
  if (!total) return null;
  const all = new URLSearchParams({ ids, found: found.title });
  return (
    <div className='flex flex-col gap-1'>
      <p className='text-xs font-medium text-muted-foreground'>
        {text(`entities.${found.entity}`)} ·{' '}
        {text('globalSearch.foundTitle', { title: found.title, count: total })}
        {found.capped ? ` ${toText(text('globalSearch.firstOf'))}` : ''}
      </p>
      <ul className='-mx-2'>
        {rows.map((row) => (
          <li key={toText(row.id)}>
            <button
              type='button'
              className='flex w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none'
              onClick={() => onGo(`/crm/${found.entity}/${toText(row.id)}`)}
            >
              <SearchRow
                entity={found.entity}
                record={row}
                titles={list.data.titles ?? {}}
                words={[]}
              />
            </button>
          </li>
        ))}
      </ul>
      {total > rows.length && (
        <Button
          variant='link'
          size='sm'
          className='h-auto px-0'
          onClick={() => onGo(`/crm/${found.entity}?${all.toString()}`)}
        >
          {text('globalSearch.showAll', { count: total })}
        </Button>
      )}
    </div>
  );
}
