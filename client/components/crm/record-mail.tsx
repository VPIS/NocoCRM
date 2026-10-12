import {
  mailErrorMessage,
  useMailClient,
  type MailMessage,
  type MailMessageSummary,
} from '@nocobase/app-plugin-mail/client';
import { MailConversationView } from '@nocobase/app-plugin-mail/client/components';
import { useTranslation } from '@nocobase/i18n/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToaster } from '@nocobase/app-client';
import { AtSign, Mail, Paperclip, PenLine } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import { Button } from '../ui/button.js';
import { flash } from './flash.js';
import {
  useColleaguesMail,
  type ColleagueConversation,
} from './colleagues-mail.js';
import {
  localDate,
  toText,
  useCrmText,
  useMetadata,
  type Entity,
} from './api.js';
import {
  uniqueMessages,
  useMailSent,
  useMailComposer,
  useMailSetup,
  useRecordMessages,
} from './mail.js';
import {
  searchTerms,
  type MailTarget,
} from '../../../server/providers/crm/mail-target.js';

// A record's mail on its page, built on the CRM's mail helpers (mail.tsx)
// and the Mail plugin's components.

function addressLine(message: MailMessageSummary, unknown: string): string {
  return message.from?.name || message.from?.address || unknown;
}

// How a record's Mail tab names whose mail it lists, when that is more than
// one address: a company by its name, its contacts and its domain; a deal
// by its contacts, or its company's while it names none. The addresses
// themselves show on hover. A lead or a contact is named by its address.
export type MailScope =
  | { readonly kind: 'company'; readonly name: string }
  | { readonly kind: 'opportunity'; readonly fromCompany: boolean };

// A record's Mail tab: the reader's own conversations with the record, newest
// first, each a row led by its latest message; one opens below its row as the
// whole conversation, with reply. Shown only to whoever has the mail
// workspace.
export function RecordMailPanel({
  target,
  scope,
  focus,
  record,
}: {
  readonly target: MailTarget;
  // The record whose tab this is: its timeline tells which of its
  // conversations sit in colleagues' mailboxes (ColleaguesMail).
  readonly record?: { entity: Entity; id: string };
  readonly scope?: MailScope;
  // A conversation to open, as a timeline mail entry names it
  // (`accountId:conversationId`, mail-timeline.ts).
  readonly focus?: string;
}): ReactElement {
  const { text } = useCrmText();
  const { t } = useTranslation('@nocobase/app-plugin-mail');
  const { data: meta } = useMetadata();
  const mail = useMailClient();
  const setup = useMailSetup();
  const terms = searchTerms(target);
  const connected = setup.accounts.length > 0;
  const {
    data: threads = [],
    isLoading,
    error,
  } = useRecordMessages(target, connected);
  const colleagues = useColleaguesMail(record);
  const { available, compose, composer } = useMailComposer();
  const log = useMailSent();
  const [selected, setSelected] = useState<string>();
  // The timeline's mail entry opened here: its conversation unfolded and in
  // view, once the list has it.
  const focused = focus
    ? threads.find(
        ({ key, latest }) =>
          key === focus ||
          `${latest.accountId}:${latest.internetMessageId}` === focus,
      )?.key
    : undefined;
  // Unfolded once when it arrives; the person may fold it again.
  const [arrived, setArrived] = useState<string>();
  if (focused && focused !== arrived) {
    setArrived(focused);
    setSelected(focused);
  }
  useEffect(() => {
    const node = focused && document.getElementById(`mail-${focused}`);
    if (!node) return;
    node.scrollIntoView({ block: 'nearest' });
    flash([node]);
  }, [focused]);
  const selectedMessage = threads.find(
    (thread) => thread.key === selected,
  )?.latest;
  const conversation = useQuery({
    queryKey: ['mail', 'conversation', selected],
    queryFn: async (): Promise<readonly MailMessage[]> => {
      if (!selectedMessage) return [];
      if (selectedMessage.conversationId) {
        const page = await mail.listConversationMessages(
          selectedMessage.accountId,
          selectedMessage.conversationId,
          { pageSize: 50 },
        );
        return uniqueMessages(page.items);
      }
      const message = await mail.getMessage(
        selectedMessage.accountId,
        selectedMessage.id,
      );
      return message ? [message] : [];
    },
    enabled: Boolean(selectedMessage),
  });
  // A change to one of the conversation's messages, as the Mail plugin's
  // workspace makes it: the message the API returns replaces the one shown
  // (a fetch right after can still read the mailbox as it was), and the
  // record's list, with its unread marks, is read again.
  const queryClient = useQueryClient();
  const toaster = useToaster();
  const refreshList = (): Promise<void> =>
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'mail' && query.queryKey[1] !== 'conversation',
    });
  const failed = (cause: unknown): void => {
    toaster.show({
      type: 'error',
      title: mailErrorMessage(
        cause,
        t('workspace.updateFailed', {
          defaultValue: 'Unable to update the message.',
        }),
      ),
    });
  };
  const replaced = (updated: MailMessage): void => {
    queryClient.setQueryData<readonly MailMessage[]>(
      ['mail', 'conversation', selected],
      (current) =>
        current?.map((message) =>
          message.id === updated.id ? updated : message,
        ),
    );
    void refreshList();
  };
  // Deleting moves a message to the mailbox's trash, where its provider can
  // move messages; it is never deleted outright from here.
  const canMove = (message: MailMessage): boolean => {
    const account = setup.accounts.find((a) => a.id === message.accountId);
    const provider = setup.providers.find(
      (p) => p.name === account?.provider.name,
    );
    return Boolean(
      !message.scheduledSend && provider?.capabilities.moveMessage,
    );
  };
  const timeZone = toText(meta?.settings.timeZone ?? 'UTC');
  const labels = useMemo(
    () => ({
      attachmentCount: (count: number) =>
        t('workspace.attachmentCount', {
          count,
          defaultValue: '{{count}} attachments',
        }),
      conversation: (count: number) =>
        t('workspace.conversation', {
          count,
          defaultValue: '{{count}} messages',
        }),
      loadMore: t('workspace.loadEarlier', { defaultValue: 'Load earlier' }),
      noSubject: t('workspace.noSubject', { defaultValue: '(No subject)' }),
      selectMessage: t('workspace.selectMessage', {
        defaultValue: 'Select a message',
      }),
      unknownSender: t('workspace.unknownSender', {
        defaultValue: 'Unknown sender',
      }),
      labels: t('workspace.labels', { defaultValue: 'Labels' }),
      note: t('workspace.note', { defaultValue: 'Note' }),
      notePlaceholder: t('workspace.notePlaceholder', {
        defaultValue: 'Add a note',
      }),
      saveNote: t('workspace.saveNote', { defaultValue: 'Save note' }),
      todo: t('workspace.todo', { defaultValue: 'To do' }),
      close: toText(text('close')),
    }),
    [t, text],
  );

  const count = target.addresses.length;
  const scopeLine = (): string => {
    if (scope?.kind === 'company' && scope.name) {
      const parts = [
        count ? toText(text('mail.scopeContacts', { count })) : '',
        target.domain
          ? toText(text('mail.scopeDomain', { domain: target.domain }))
          : '',
      ].filter(Boolean);
      return [
        toText(text('mail.scopeCompany', { name: scope.name })),
        parts.join(toText(text('mail.scopeAnd'))),
      ]
        .filter(Boolean)
        .join(' · ');
    }
    if (scope?.kind === 'opportunity')
      return toText(
        text(scope.fromCompany ? 'mail.scopeDealCompany' : 'mail.scopeDeal', {
          count,
        }),
      );
    return toText(text('mail.scope', { terms: terms.join(', ') }));
  };

  let body: ReactNode;
  if (!connected && !setup.loading)
    body = (
      <Empty icon={<AtSign />} title={toText(text('mail.noAccount'))}>
        <Button
          size='sm'
          variant='outline'
          render={<Link to='/crm/mail/accounts' />}
          nativeButton={false}
        >
          {toText(text('mail.connect'))}
        </Button>
      </Empty>
    );
  else if (terms.length === 0)
    body = <Empty icon={<Mail />} title={toText(text('mail.noAddress'))} />;
  else if (isLoading || setup.loading)
    body = (
      <p className='py-6 text-sm text-muted-foreground'>
        {toText(text('loading'))}
      </p>
    );
  else if (error)
    body = (
      <p className='py-6 text-sm text-destructive'>
        {mailErrorMessage(error, toText(text('mail.loadFailed')))}
      </p>
    );
  else if (threads.length === 0)
    body = <Empty icon={<Mail />} title={toText(text('mail.empty'))} />;
  else
    // A white card, as the Tasks tab's list is.
    body = (
      <ul className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs'>
        {threads.map(({ key, latest: message, unread }) => {
          const open = key === selected;
          return (
            <li key={key} id={`mail-${key}`}>
              <button
                type='button'
                aria-expanded={open}
                className={`flex w-full min-w-0 items-start gap-3 px-3 py-2.5 text-left ${open ? 'bg-muted' : 'hover:bg-muted/50'}`}
                onClick={() => setSelected(open ? undefined : key)}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? 'bg-primary' : 'bg-transparent'}`}
                />
                <span className='min-w-0 flex-1'>
                  <span className='flex items-baseline gap-2'>
                    <span
                      className={`truncate text-sm ${unread ? 'font-semibold' : ''}`}
                    >
                      {addressLine(message, labels.unknownSender)}
                    </span>
                    <span className='ml-auto shrink-0 text-xs text-muted-foreground'>
                      {localDate(
                        message.receivedAt ?? message.sentAt,
                        '',
                        timeZone,
                      )}
                    </span>
                  </span>
                  <span className='flex items-center gap-1.5 text-sm'>
                    <span className='truncate'>
                      {message.subject || labels.noSubject}
                    </span>
                    {message.hasAttachments && (
                      <Paperclip
                        aria-hidden
                        className='size-3.5 shrink-0 text-muted-foreground'
                      />
                    )}
                  </span>
                  {message.preview && (
                    <span className='block truncate text-xs text-muted-foreground'>
                      {message.preview}
                    </span>
                  )}
                </span>
              </button>
              {/* The open conversation on a tinted tray that carries on
                  from its row, the plugin's white conversation set on it as
                  a card, so it reads apart from the rows around it. */}
              {open && (
                <div className='bg-muted px-2 pb-2'>
                  <div className='overflow-hidden rounded-md border border-border shadow-sm'>
                    <MailConversationView
                      labels={labels}
                      loading={conversation.isLoading}
                      messages={conversation.data ?? []}
                      onLoadMore={() => undefined}
                      subject={message.subject}
                      actions={
                        available
                          ? {
                              reply: (source) =>
                                compose(
                                  {
                                    mode: 'reply',
                                    relatedMessageId: source.id,
                                    to: source.replyTo.length
                                      ? source.replyTo
                                          .map((address) => address.address)
                                          .join(', ')
                                      : (source.from?.address ?? ''),
                                    subject: /^re:/iu.test(source.subject)
                                      ? source.subject
                                      : `Re: ${source.subject}`,
                                  },
                                  log,
                                ),
                              delete: (source) =>
                                void mail
                                  .deleteMessage(
                                    source.accountId,
                                    source.id,
                                    false,
                                  )
                                  .then(() => {
                                    queryClient.setQueryData<
                                      readonly MailMessage[]
                                    >(
                                      ['mail', 'conversation', selected],
                                      (current) =>
                                        current?.filter(
                                          (m) => m.id !== source.id,
                                        ),
                                    );
                                    return refreshList();
                                  })
                                  .catch(failed),
                              canDelete: canMove,
                              toggleRead: (source) =>
                                void mail
                                  .updateMessage({
                                    accountId: source.accountId,
                                    messageId: source.id,
                                    read: !source.read,
                                  })
                                  .then(replaced)
                                  .catch(failed),
                              toggleStarred: (source) =>
                                void mail
                                  .updateMessage({
                                    accountId: source.accountId,
                                    messageId: source.id,
                                    starred: !source.starred,
                                  })
                                  .then(replaced)
                                  .catch(failed),
                            }
                          : undefined
                      }
                      actionLabels={{
                        archive: t('workspace.archive', {
                          defaultValue: 'Archive',
                        }),
                        delete: t('workspace.delete', {
                          defaultValue: 'Delete',
                        }),
                        download: t('workspace.download', {
                          defaultValue: 'Download',
                        }),
                        reply: t('workspace.reply', { defaultValue: 'Reply' }),
                        forward: t('workspace.forward', {
                          defaultValue: 'Forward',
                        }),
                        markRead: t('workspace.markRead', {
                          defaultValue: 'Mark as read',
                        }),
                        markUnread: t('workspace.markUnread', {
                          defaultValue: 'Mark as unread',
                        }),
                        star: t('workspace.star', { defaultValue: 'Star' }),
                        unstar: t('workspace.unstar', {
                          defaultValue: 'Remove star',
                        }),
                      }}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );

  // After what the reader's own mailboxes hold, the conversations with the
  // record that only colleagues' mailboxes hold; when those are all there
  // is, without the empty state of the reader's own.
  if (colleagues?.length) {
    if (threads.length === 0 && connected && terms.length > 0 && !error)
      body = null;
    body = (
      <>
        {body}
        <ColleaguesMail conversations={colleagues} timeZone={timeZone} />
      </>
    );
  }
  return (
    <div className='space-y-3'>
      {available && (
        <div className='flex items-center gap-2'>
          {/* Whose mail this is, only when the record has an address to
              name: the empty state below says when it has none. */}
          <p
            className='min-w-0 flex-1 truncate text-xs text-muted-foreground'
            title={terms.length > 0 ? terms.join(', ') : undefined}
          >
            {terms.length > 0 && scopeLine()}
          </p>
          <Button
            variant='outline'
            size='sm'
            onClick={() => compose({ to: target.addresses.join(', ') }, log)}
          >
            <PenLine />
            {toText(text('mail.write'))}
          </Button>
        </div>
      )}
      {body}
      {composer}
    </div>
  );
}

function Empty({
  icon,
  title,
  children,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly children?: ReactNode;
}): ReactElement {
  return (
    <div className='flex flex-col items-center gap-3 py-10 text-center'>
      <span className='text-muted-foreground [&_svg]:size-5'>{icon}</span>
      <p className='text-sm text-muted-foreground'>{title}</p>
      {children}
    </div>
  );
}

// Those conversations, after the reader's own: a heading saying whose they
// are, and a row each laid out as the reader's own rows (who wrote last and
// when, the subject, then how many messages and whose mailbox), not opened.
function ColleaguesMail({
  conversations,
  timeZone,
}: {
  conversations: readonly ColleagueConversation[];
  timeZone: string;
}): ReactElement | null {
  const { text } = useCrmText();
  if (!conversations.length) return null;
  return (
    <section className='space-y-2'>
      <p className='text-sm text-muted-foreground'>
        {text('mail.inColleagues', { count: conversations.length })}
      </p>
      <ul className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs'>
        {conversations.map((conversation) => (
          <li
            key={conversation.key}
            className='flex min-w-0 items-start gap-3 px-3 py-2.5'
          >
            <span aria-hidden className='mt-1.5 size-2 shrink-0' />
            <span className='min-w-0 flex-1'>
              <span className='flex items-baseline gap-2'>
                <span className='truncate text-sm'>
                  {conversation.lastFrom || conversation.owner}
                </span>
                <span className='ml-auto shrink-0 text-xs text-muted-foreground'>
                  {localDate(conversation.at, '', timeZone)}
                </span>
              </span>
              <span className='block truncate text-sm'>
                {conversation.subject || toText(text('feed.mail.noSubject'))}
              </span>
              <span className='block truncate text-xs text-muted-foreground'>
                {toText(
                  conversation.count === 1
                    ? text('feed.mail.countOne')
                    : text('feed.mail.count', { count: conversation.count }),
                )}
                {' · '}
                {text('mail.mailboxOf', { name: conversation.owner })}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
