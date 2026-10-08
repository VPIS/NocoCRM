import { useToaster } from '@nocobase/app-client';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import {
  useMailClient,
  type MailAccountView,
  type MailMessageSummary,
  type MailProviderView,
  type MailSubmissionLogView,
} from '@nocobase/app-plugin-mail/client';
import {
  EMPTY_MAIL_COMPOSER,
  MailWorkspaceComposer,
  type MailComposerRequest,
  type MailComposerState,
} from '@nocobase/app-plugin-mail/client/components';
import { useTranslation } from '@nocobase/i18n/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, type ReactNode } from 'react';
import {
  searchTerms,
  type MailTarget,
} from '../../../server/providers/crm/mail-target.js';
import { toText, useCrmApi, useCrmText, useRefresh, type Data } from './api.js';

// The Mail plugin as the CRM uses it: who has mail and their mailboxes, the
// plugin's composer opened over a page, the email task logged for what is
// sent from a record, and how a record's addresses are found. Raw mail stays
// in the plugin; nothing is sent but by the person pressing Send, and an AI
// draft only fills the composer. The record's Mail tab and the planned
// email's Send button are in record-mail.tsx.

const MAIL_WORKSPACE = {
  resource: { type: 'page', id: 'mail.workspace' },
  action: 'access',
} as const;

export function emailsOf(records: readonly Data[]): string[] {
  return records.map((record) => toText(record.email).trim()).filter(Boolean);
}

// Mail's own sendable accounts: connected, active and on a provider that sends.
function sendable(
  accounts: readonly MailAccountView[],
  providers: readonly MailProviderView[],
): MailAccountView[] {
  return accounts.filter(
    (account) =>
      account.status === 'active' &&
      providers.some(
        (provider) =>
          provider.type === account.provider.type &&
          provider.name === account.provider.name &&
          provider.capabilities.send === true,
      ),
  );
}

// Whether this user has mail at all, and their mailboxes. Undefined data while
// it loads; none for a user without the mail workspace.
export function useMailSetup(): {
  readonly can: boolean;
  readonly accounts: readonly MailAccountView[];
  readonly providers: readonly MailProviderView[];
  readonly senders: readonly MailAccountView[];
  readonly loading: boolean;
} {
  const { can } = useCan(MAIL_WORKSPACE);
  const mail = useMailClient();
  const { data, isLoading } = useQuery({
    queryKey: ['mail', 'setup'],
    queryFn: async () => {
      const [accounts, providers] = await Promise.all([
        mail.listAccounts(),
        mail.listProviders(),
      ]);
      return { accounts, providers };
    },
    enabled: can,
    staleTime: 30_000,
  });
  const accounts = data?.accounts ?? [];
  const providers = data?.providers ?? [];
  return {
    can,
    accounts,
    providers,
    senders: sendable(accounts, providers),
    loading: can && isLoading,
  };
}

function receivedOf(message: MailMessageSummary): number {
  return Date.parse(message.receivedAt ?? message.sentAt ?? '') || 0;
}

// One copy of each message. Over IMAP, Gmail shows a message in every folder
// its labels put it in (the inbox, All Mail, Important, Sent), and the plugin
// keeps each folder's copy as a message of its own; the copies share their
// Message-ID, which tells them apart from distinct messages.
export function uniqueMessages<T extends MailMessageSummary>(
  messages: readonly T[],
): T[] {
  const seen = new Map<string, T>();
  for (const message of messages) {
    const key = `${message.accountId}:${message.internetMessageId ?? message.id}`;
    if (!seen.has(key)) seen.set(key, message);
  }
  return [...seen.values()];
}

// A conversation on a record's Mail tab: its newest message stands for it,
// with how many of its messages concern the record and whether one is unread.
export interface MailThread {
  readonly key: string;
  readonly latest: MailMessageSummary;
  readonly count: number;
  readonly unread: boolean;
}

// Messages grouped into their conversations (the provider's thread, from
// Gmail's thread or the RFC references over IMAP; a message without one is
// its own), newest conversation first.
export function threadsOf(
  messages: readonly MailMessageSummary[],
): MailThread[] {
  const groups = new Map<string, MailMessageSummary[]>();
  for (const message of uniqueMessages(messages)) {
    const key = `${message.accountId}:${message.conversationId ?? message.id}`;
    const group = groups.get(key);
    if (group) group.push(message);
    else groups.set(key, [message]);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const sorted = [...group].sort((a, b) => receivedOf(b) - receivedOf(a));
      return {
        key,
        latest: sorted[0],
        count: sorted.length,
        unread: sorted.some((message) => !message.read),
      };
    })
    .sort((a, b) => receivedOf(b.latest) - receivedOf(a.latest));
}

// The conversations exchanged with a record, newest first: one search per
// address (and the domain), joined. The plugin's search covers subject,
// preview, sender and recipients, so a hit on the subject alone is possible
// but rare.
export function useRecordMessages(target: MailTarget, enabled: boolean) {
  const mail = useMailClient();
  const terms = searchTerms(target);
  return useQuery({
    queryKey: ['mail', 'record', terms],
    queryFn: async () => {
      const pages = await Promise.all(
        terms.map((q) => mail.listMessages({ q, pageSize: 100 })),
      );
      const byId = new Map<string, MailMessageSummary>();
      for (const page of pages)
        for (const message of page.items)
          if (!message.draft) byId.set(message.id, message);
      return threadsOf([...byId.values()]);
    },
    enabled: enabled && terms.length > 0,
    staleTime: 15_000,
  });
}

// The plugin's composer, opened over the page, and what to do once the
// provider has accepted a message: `onSent` gets the submission as the plugin
// recorded it (subject, recipients, text).
export function useMailComposer(): {
  readonly available: boolean;
  readonly compose: (
    value: Partial<MailComposerState>,
    onSent?: (sent: MailSubmissionLogView | undefined) => Promise<void> | void,
  ) => void;
  readonly composer: ReactNode;
} {
  const mail = useMailClient();
  const toaster = useToaster();
  const queryClient = useQueryClient();
  const { t } = useTranslation('@nocobase/app-plugin-mail');
  const { text } = useCrmText();
  const { accounts, providers, senders } = useMailSetup();
  const [open, setOpen] = useState<{
    request: MailComposerRequest;
    onSent?: (sent: MailSubmissionLogView | undefined) => Promise<void> | void;
  }>();
  const compose = useCallback(
    (
      value: Partial<MailComposerState>,
      onSent?: (
        sent: MailSubmissionLogView | undefined,
      ) => Promise<void> | void,
    ) => {
      const account = senders[0];
      if (!account) return;
      setOpen({
        request: {
          accountId: account.id,
          value: { ...EMPTY_MAIL_COMPOSER, ...value },
          attachments: [],
        },
        onSent,
      });
    },
    [senders],
  );
  const composer = open ? (
    <MailWorkspaceComposer
      request={open.request}
      accounts={accounts}
      providers={providers}
      onSelectAccount={(accountId) =>
        setOpen((current) =>
          current
            ? { ...current, request: { ...current.request, accountId } }
            : current,
        )
      }
      onClose={() => setOpen(undefined)}
      onComplete={(result, rejected) => {
        const onSent = open.onSent;
        setOpen(undefined);
        void queryClient.invalidateQueries({ queryKey: ['mail'] });
        if (result === 'accepted' || result === 'partial') {
          void (async () => {
            try {
              const latest = await mail.listSubmissionsPage({
                page: 1,
                pageSize: 1,
              });
              await onSent?.(latest.items[0]);
              toaster.show({
                type: result === 'partial' ? 'warning' : 'success',
                title: toText(text('mail.sent')),
                description:
                  result === 'partial'
                    ? toText(
                        text('mail.partial', {
                          recipients: (rejected ?? []).join(', '),
                        }),
                      )
                    : onSent
                      ? toText(text('mail.logged'))
                      : undefined,
              });
            } catch (cause) {
              toaster.show({
                type: 'error',
                title: toText(text('mail.sent')),
                description: toText(text('mail.logFailed')),
              });
              console.error(cause);
            }
          })();
        } else if (result === 'unknown' || result === 'failed')
          toaster.show({
            type: 'error',
            title: toText(text(`mail.${result}`)),
          });
        else if (result === 'draft')
          toaster.show({
            type: 'info',
            title: t('workspace.draftSaved', { defaultValue: 'Draft saved.' }),
          });
        else if (result === 'scheduled')
          toaster.show({
            type: 'info',
            title: t('workspace.scheduledSaved', {
              defaultValue: 'Scheduled.',
            }),
          });
      }}
    />
  ) : null;
  return { available: senders.length > 0, compose, composer };
}

// A message sent from a record: the record's timeline is brought up to date
// at once (the server's mail sync, which otherwise runs every minute), so
// the conversation shows there; nothing else is written for it.
export function useMailSent() {
  const api = useCrmApi();
  const refresh = useRefresh();
  return useCallback(
    async (sent: MailSubmissionLogView | undefined): Promise<void> => {
      if (!sent) return;
      await api('mail/sync', 'POST', {});
      await refresh();
    },
    [api, refresh],
  );
}
