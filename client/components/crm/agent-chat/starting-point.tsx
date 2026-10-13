import type { ReactElement } from 'react';
import type { ResolvedPageContext } from '@nocobase/app-plugin-agents/shared/conversations';
import {
  Building2,
  Handshake,
  ListChecks,
  Radar,
  Sparkles,
  SquareCheckBig,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { sentence, toText, useCrmText, type Entity } from '../api.js';
import { useRecordLink } from '../record-drawer.js';

// What a conversation started from, a small note centred atop its thread:
// the records and the AI card its first message carried as page context
// (the dock's question on a record's page, a card's Discuss), each led by
// its kind and opening where it lives (a record in the page's drawer).
// Nothing for a conversation started from nowhere in particular.

const ICONS: Record<string, LucideIcon> = {
  leads: Radar,
  opportunities: Handshake,
  companies: Building2,
  contacts: UserRound,
  tasks: SquareCheckBig,
  approvals: ListChecks,
  'crm-evaluation': Sparkles,
};

export function StartingPoint({
  context,
}: {
  context: ResolvedPageContext | null | undefined;
}): ReactElement | null {
  const { text } = useCrmText();
  const items = (context?.items ?? []).filter((item) => ICONS[item.kind]);
  if (!items.length) return null;
  return (
    <div className='flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs'>
      <span className='shrink-0 text-muted-foreground'>
        {text('agentChat.startedFrom')}
      </span>
      <span className='flex min-w-0 flex-wrap items-center justify-center gap-1.5'>
        {items.map((item) => (
          <StartingItem
            key={`${item.kind}:${item.id}`}
            kind={item.kind}
            id={item.id}
            title={item.title}
            url={item.url}
          />
        ))}
      </span>
    </div>
  );
}

function StartingItem({
  kind,
  id,
  title,
  url,
}: {
  kind: string;
  id: string;
  title: string;
  url: string | null;
}): ReactElement {
  const { text } = useCrmText();
  const Icon = ICONS[kind] ?? Sparkles;
  const evaluation = kind === 'crm-evaluation';
  // A record opens in the drawer where there is one; a card, on its
  // record's page.
  const link = useRecordLink(kind as Entity, id);
  const label = evaluation
    ? text('agentChat.aiCard')
    : sentence(toText(text(`entity.${kind}`)));
  const body = (
    <>
      <Icon
        aria-hidden
        className={`size-3.5 shrink-0 ${evaluation ? 'text-primary' : 'text-muted-foreground'}`}
      />
      <span className='shrink-0 text-muted-foreground'>{label}</span>
      <span className='min-w-0 truncate font-medium text-foreground'>
        {title}
      </span>
    </>
  );
  const className =
    'inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 shadow-xs transition-colors hover:bg-hover';
  if (evaluation)
    return url ? (
      <a href={url} className={className} title={title}>
        {body}
      </a>
    ) : (
      <span className={className} title={title}>
        {body}
      </span>
    );
  return (
    <Link
      to={link.to}
      onClick={link.onClick}
      className={className}
      title={title}
    >
      {body}
    </Link>
  );
}
