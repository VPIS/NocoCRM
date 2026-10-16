import { useToaster } from '@nocobase/app-client';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#components/ui/empty';
import { LoadFailure } from '../../../pages/settings/shared.js';
import { toText, useCrmApi, useCrmScopeKey, useCrmText } from '../api.js';
import {
  TAB_POLL_MS,
  type RecordMessages,
  type WhatsAppMessage,
} from './api.js';
import { MessagesSkeleton, WhatsAppMessages } from './messages.js';

// A record's WhatsApp tab: the messages its people exchanged with the
// company's number — a lead's or a contact's own, a company's contacts', a
// deal's contacts' — read by whoever reads the record, asked again every
// half minute while it shows (R4). Read only in this phase.

export type WhatsAppEntity =
  'leads' | 'contacts' | 'companies' | 'opportunities';

export function RecordWhatsAppPanel({
  entity,
  id,
}: {
  entity: WhatsAppEntity;
  id: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const scopeKey = useCrmScopeKey();
  const path = `${entity}/${encodeURIComponent(id)}/whatsappMessages`;
  const query = useQuery({
    queryKey: [...scopeKey, path],
    queryFn: () => api<{ data: RecordMessages }>(path).then((r) => r.data),
    refetchInterval: TAB_POLL_MS,
  });
  const [earlier, setEarlier] = useState<{
    messages: WhatsAppMessage[];
    more: boolean;
  }>({ messages: [], more: true });
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  if (query.error && !query.data)
    return (
      <div className='p-4'>
        <LoadFailure
          error={query.error}
          what={toText(text('whatsapp.whatMessages'))}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  if (!query.data) return <MessagesSkeleton />;
  const { people } = query.data;
  if (!query.data.messages.length)
    return (
      <div className='p-4'>
        <Empty className='min-h-48 border border-dashed'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <MessageCircle />
            </EmptyMedia>
            <EmptyTitle>{text('whatsapp.tabEmptyTitle')}</EmptyTitle>
            <EmptyDescription>{text('whatsapp.tabEmptyBody')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  const latestIds = new Set(query.data.messages.map((m) => m.id));
  const messages = [
    ...earlier.messages.filter((m) => !latestIds.has(m.id)),
    ...query.data.messages,
  ];
  const more = earlier.messages.length ? earlier.more : query.data.more;
  const names = new Map(people.map((person) => [person.id, person.name]));
  const loadEarlier = () => {
    const before = messages[0]?.occurredAt;
    if (!before) return;
    setLoadingEarlier(true);
    api<{ data: RecordMessages }>(
      `${path}?before=${encodeURIComponent(before)}`,
    )
      .then(({ data }) =>
        setEarlier({
          messages: [...data.messages, ...earlier.messages],
          more: data.more,
        }),
      )
      .catch(() =>
        toaster.show({
          type: 'error',
          title: toText(text('whatsapp.loadEarlierFailed')),
        }),
      )
      .finally(() => setLoadingEarlier(false));
  };
  return (
    // On the card's white, as the Mail tab's list is.
    <div className='flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs'>
      <p className='px-4 pt-4 text-sm text-muted-foreground'>
        {text('whatsapp.tabPeople', {
          names: new Intl.ListFormat(language, {
            style: 'long',
            type: 'conjunction',
          }).format(people.map((person) => person.name)),
        })}
      </p>
      <WhatsAppMessages
        className='max-h-[70dvh]'
        messages={messages}
        more={more}
        loadingEarlier={loadingEarlier}
        onLoadEarlier={loadEarlier}
        senderOf={(message) =>
          names.get(toText(message.waContactId ?? '')) ?? ''
        }
        showSenders={people.length > 1}
      />
      <p className='px-4 pb-4 text-xs text-muted-foreground'>
        {text('whatsapp.readOnlyNote')}
      </p>
    </div>
  );
}
