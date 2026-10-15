import { useState, type ReactElement } from 'react';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Switch } from '../ui/switch.js';
import { BLACK_SWITCH } from './black-switch.js';
import { ErrorNotice, Loading } from './common.js';
import {
  localDate,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
} from './api.js';
import { DEFAULT_TIME_ZONE } from '../../../server/providers/crm/zone-time.js';

// A company's Signals tab: what the AI found on the web that happened to
// it (GET /api/companies/:id/signals; server/providers/crm/company-signals.ts),
// newest first, each with the pages that say so. Whoever may edit the
// company switches its daily check on, has it checked now, and marks a
// signal seen or dismisses it; a dismissed event is not proposed again.

export interface CompanySignal {
  id: string;
  type: string;
  title: string;
  summary: string;
  occurredOn: string;
  sources: { title: string; url: string; site: string }[];
  status: 'new' | 'seen' | 'dismissed';
  createdAt: string;
}

export interface CompanySignalsData {
  available: boolean;
  watched: boolean;
  inDailyCheck: boolean;
  checkedAt: string | null;
  canEdit: boolean;
  signals: CompanySignal[];
}

export function CompanySignals({
  companyId,
}: {
  companyId: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const client = useQueryClient();
  const scopeKey = useCrmScopeKey();
  const path = `companies/${companyId}/signals`;
  const query = useCrmQuery<CompanySignalsData>(path);
  const timeZone = useMetadata().data?.settings.timeZone ?? DEFAULT_TIME_ZONE;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>();
  const [checked, setChecked] = useState<number | null>(null);
  if (query.isLoading) return <Loading />;
  const data = query.data;
  if (!data) return <ErrorNotice error={query.error} />;
  const reload = () =>
    client.invalidateQueries({ queryKey: [...scopeKey, path] });
  const run = async (key: string, work: () => Promise<unknown>) => {
    setBusy(key);
    setError(undefined);
    try {
      await work();
      await reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(null);
    }
  };
  const watch = (watched: boolean) =>
    run('watch', () => api(`${path}/watch`, 'PUT', { watched }));
  const checkNow = () =>
    run('check', async () => {
      const result = await api<{ data: { found: unknown[] } }>(
        `${path}/check`,
        'POST',
      );
      setChecked(result.data.found.length);
    });
  const decide = (signal: CompanySignal, status: 'seen' | 'dismissed') =>
    run(signal.id, () => api(`signals/${signal.id}`, 'PATCH', { status }));
  // Dismissed ones last, faded: kept so the same event is not proposed again.
  const signals = [
    ...data.signals.filter((s) => s.status !== 'dismissed'),
    ...data.signals.filter((s) => s.status === 'dismissed'),
  ];
  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
        <p className='min-w-0 flex-1 text-xs text-muted-foreground'>
          {text(
            data.inDailyCheck
              ? data.watched
                ? 'signals.watchedScope'
                : 'signals.dealScope'
              : 'signals.offScope',
          )}
          {data.checkedAt
            ? ` ${toText(
                text('signals.checkedAt', {
                  time: localDate(data.checkedAt, language, timeZone),
                }),
              )}`
            : ''}
        </p>
        {data.canEdit && (
          <label className='flex items-center gap-2 text-sm'>
            <Switch
              className={BLACK_SWITCH}
              checked={data.watched}
              disabled={busy !== null}
              onCheckedChange={(on) => void watch(on)}
              aria-label={toText(text('signals.watch'))}
            />
            {text('signals.watch')}
          </label>
        )}
        {data.canEdit && data.available && (
          <Button
            size='sm'
            variant='outline'
            disabled={busy !== null}
            onClick={() => void checkNow()}
          >
            {busy === 'check' ? (
              <Loader2 className='animate-spin' />
            ) : (
              <RefreshCw />
            )}
            {text(busy === 'check' ? 'signals.checking' : 'signals.checkNow')}
          </Button>
        )}
      </div>
      {!data.available && (
        <p className='rounded-lg bg-muted p-3 text-sm text-muted-foreground'>
          {text('signals.unavailable')}
        </p>
      )}
      <ErrorNotice error={error} />
      {checked !== null && busy === null && (
        <p role='status' className='text-sm text-muted-foreground'>
          {checked
            ? text('signals.foundSome', { count: checked })
            : text('signals.foundNone')}
        </p>
      )}
      {signals.length ? (
        <ul className='space-y-2'>
          {signals.map((signal) => (
            <li
              key={signal.id}
              className={`grid gap-1.5 rounded-xl border border-border bg-card p-3 text-sm ${
                signal.status === 'dismissed' ? 'opacity-60' : ''
              }`}
            >
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='secondary'>
                  {text(`signals.types.${signal.type}`, {
                    defaultValue: signal.type,
                  })}
                </Badge>
                <span className='text-xs text-muted-foreground'>
                  {signal.occurredOn}
                </span>
                {signal.status === 'new' && (
                  <Badge>{text('signals.new')}</Badge>
                )}
                {signal.status === 'dismissed' && (
                  <span className='text-xs text-muted-foreground'>
                    {text('signals.dismissed')}
                  </span>
                )}
                <span className='flex-1' />
                {data.canEdit && signal.status === 'new' && (
                  <>
                    <Button
                      size='sm'
                      variant='ghost'
                      disabled={busy !== null}
                      onClick={() => void decide(signal, 'dismissed')}
                    >
                      {text('signals.dismiss')}
                    </Button>
                    <Button
                      size='sm'
                      variant='contrast'
                      disabled={busy !== null}
                      onClick={() => void decide(signal, 'seen')}
                    >
                      {text('signals.seen')}
                    </Button>
                  </>
                )}
              </div>
              <p className='font-medium'>{signal.title}</p>
              {signal.summary && (
                <p className='text-muted-foreground'>{signal.summary}</p>
              )}
              <ul className='flex flex-wrap gap-x-3 gap-y-1'>
                {signal.sources.map((source) => (
                  <li key={source.url} className='min-w-0'>
                    <a
                      href={source.url}
                      target='_blank'
                      rel='noreferrer noopener'
                      title={source.title}
                      className='inline-flex max-w-72 items-center gap-1 text-xs text-muted-foreground hover:underline'
                    >
                      <ExternalLink className='size-3 shrink-0' />
                      <span className='truncate'>
                        {source.site || source.title}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className='py-6 text-center text-sm text-muted-foreground'>
          {text('signals.empty')}
        </p>
      )}
    </div>
  );
}
