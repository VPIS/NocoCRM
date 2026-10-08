import {
  mailErrorMessage,
  plainTextToMailHtml,
  useMailClient,
  type MailMessage,
  type MailMessageSummary,
} from '@nocobase/app-plugin-mail/client';
import { MailConversationView } from '@nocobase/app-plugin-mail/client/components';
import { useTranslation } from '@nocobase/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { AtSign, Mail, Paperclip, PenLine, Send } from 'lucide-react';
import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '../ui/button.js';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';
import {
  localDate,
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  type Data,
} from './api.js';
import {
  emailDraftOf,
  emailsOf,
  uniqueMessages,
  useLogSentMail,
  useMailComposer,
  useMailSetup,
  useRecordMessages,
  type MailLink,
} from './mail.js';
import {
  searchTerms,
  type MailTarget,
} from '../../../server/providers/crm/mail-target.js';

// A record's mail on its page and a planned email sent from its activity,
// built on the CRM's mail helpers (mail.tsx) and the Mail plugin's components.

// "Send email" on a planned email activity: the composer, addressed to its
// customer participants (and its lead), holding the draft a follow-up wrote
// into it, or the activity's name as the subject. Once the provider accepts
// the message, the activity's outcome is recorded as sent, with the text that
// went; the AI follows up when the reply comes, not now.
export function SendPlannedEmailButton({
  activity,
}: {
  readonly activity: Data;
}): ReactElement | null {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const { available, compose, composer } = useMailComposer();
  const [busy, setBusy] = useState(false);
  if (!available) return null;
  const open = async (): Promise<void> => {
    setBusy(true);
    try {
      const reads = [
        ...arrayOf(activity.externalParticipants).map((contactId) =>
          api<{ data: { record: Data } }>(`contacts/${contactId}`),
        ),
        ...(activity.leadId
          ? [
              api<{ data: { record: Data } }>(
                `leads/${toText(activity.leadId)}`,
              ),
            ]
          : []),
      ];
      const people = await Promise.allSettled(reads);
      const to = emailsOf(
        people.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value.data.record] : [],
        ),
      );
      const draft = emailDraftOf(activity.description);
      const body = draft?.body ?? '';
      compose(
        {
          to: [...new Set(to)].join(', '),
          subject: draft?.subject ?? toText(activity.name),
          text: body,
          html: body ? plainTextToMailHtml(body) : '',
        },
        async (sent) => {
          const recipients = (sent?.recipients ?? [])
            .map((address) => address.address)
            .join(', ');
          await api(`activities/${toText(activity.id)}/outcome`, 'POST', {
            outcome: [
              toText(
                text('mail.outcomeSent', {
                  to: recipients,
                  subject: sent?.subject ?? '',
                }),
              ),
              sent?.text?.trim() ?? '',
            ]
              .filter(Boolean)
              .join('\n\n')
              .slice(0, LONG_TEXT_LIMIT),
            followUp: false,
          });
          await refresh();
        },
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button size='sm' disabled={busy} onClick={() => void open()}>
        <Send />
        {toText(text('mail.send'))}
      </Button>
      {composer}
    </>
  );
}

function arrayOf(value: unknown): string[] {
  return Array.isArray(value) ? value.map(toText).filter(Boolean) : [];
}

function addressLine(message: MailMessageSummary, unknown: string): string {
  return message.from?.name || message.from?.address || unknown;
}

// A record's Mail tab: the reader's own conversations with the record, newest
// first, each a row led by its latest message; one opens below its row as the
// whole conversation, with reply. Shown only to whoever has the mail
// workspace.
export function RecordMailPanel({
  target,
  link,
}: {
  readonly target: MailTarget;
  readonly link: MailLink;
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
  const { available, compose, composer } = useMailComposer();
  const log = useLogSentMail(link);
  const [selected, setSelected] = useState<string>();
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
    body = (
      <ul className='divide-y divide-border rounded-lg border border-border'>
        {threads.map(({ key, latest: message, unread }) => {
          const open = key === selected;
          return (
            <li key={key}>
              <button
                type='button'
                aria-expanded={open}
                className='flex w-full min-w-0 items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/50'
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
              {open && (
                <div className='border-t border-border bg-muted/20'>
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
                            delete: () => undefined,
                            canDelete: () => false,
                            toggleRead: (source) =>
                              void mail
                                .updateMessage({
                                  accountId: source.accountId,
                                  messageId: source.id,
                                  read: !source.read,
                                })
                                .then(() => conversation.refetch()),
                            toggleStarred: (source) =>
                              void mail
                                .updateMessage({
                                  accountId: source.accountId,
                                  messageId: source.id,
                                  starred: !source.starred,
                                })
                                .then(() => conversation.refetch()),
                          }
                        : undefined
                    }
                    actionLabels={{
                      archive: t('workspace.archive', {
                        defaultValue: 'Archive',
                      }),
                      delete: t('workspace.delete', { defaultValue: 'Delete' }),
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
              )}
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className='space-y-3'>
      {available && (
        <div className='flex items-center gap-2'>
          <p className='min-w-0 flex-1 truncate text-xs text-muted-foreground'>
            {toText(text('mail.scope', { terms: terms.join(', ') }))}
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
