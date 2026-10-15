import { useEffect, useRef, useState, type ReactElement } from 'react';
import { takeSignalFocus } from './signal-focus.js';
import { ChevronRight, ExternalLink, Sparkles, Star } from 'lucide-react';
import { Spinner } from '../ui/spinner.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.js';
import { AutoLoadMore } from './auto-load.js';
import { SignalTypeTag } from './signal-type-tag.js';
import { AgentWords } from './work-agent.js';
import { useQueryClient } from '@tanstack/react-query';

import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { InfoGroup, InfoRow } from '../../pages/crm-detail.js';
import { ErrorNotice, Loading } from './common.js';
import {
  localDate,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
} from './api.js';
import { DEFAULT_TIME_ZONE } from '../../../server/providers/crm/zone-time.js';

// What the AI found on the web that happened to a company (GET
// /api/companies/:id/signals; server/providers/crm/company-signals.ts),
// newest first, each with the pages that say so: a card in the company
// page's side column (SignalsCard) with the latest few, a row of a deal's
// company card (LatestSignalRow) with the latest one, and the whole list
// (CompanySignals) in a dialog either opens. Whoever may edit the company
// switches its daily check on, has it checked now, and dismisses a signal
// that is wrong or of no concern, which is not proposed again. A signal is
// new for a week after it was found (isNew), for everyone alike.

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
  // All of them, those not dismissed, and those new, whatever the page.
  total: number;
  open: number;
  fresh: number;
  page: number;
  pageSize: number;
  // A page: those not dismissed first, the newest events first.
  signals: CompanySignal[];
}

// A page of the company's signals, `size` of them (the card three, the
// chip and the deal's row one, the list a page at a time).
function signalsPath(companyId: string, size: number, until?: string): string {
  return `companies/${companyId}/signals?pageSize=${String(size)}${
    until ? `&until=${encodeURIComponent(until)}` : ''
  }`;
}
// Every query of the company's signals read again, whatever its page.
function useRefreshSignals(companyId: string): () => Promise<void> {
  const client = useQueryClient();
  const prefix = `companies/${companyId}/signals`;
  return () =>
    client.invalidateQueries({
      predicate: (q) =>
        q.queryKey.some(
          (part) => typeof part === 'string' && part.startsWith(prefix),
        ),
    });
}
// The list's page.
const LIST_PAGE = 20;

// How long a signal reads as new after it was found.
const NEW_FOR_DAYS = 7;
// Whether it reads as new: found in the last week and not dismissed.
function isNew(signal: CompanySignal, now = Date.now()): boolean {
  return (
    signal.status !== 'dismissed' &&
    now - Date.parse(signal.createdAt) < NEW_FOR_DAYS * 86_400_000
  );
}

export function CompanySignals({
  companyId,
}: {
  companyId: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refreshSignals = useRefreshSignals(companyId);
  const path = `companies/${companyId}/signals`;
  // The signal a timeline line asked to see: the first page reaches it,
  // and it is scrolled to and lit up a while.
  const [until] = useState(takeSignalFocus);
  const [focused, setFocused] = useState(until);
  const query = useCrmQuery<CompanySignalsData>(
    signalsPath(companyId, LIST_PAGE, until ?? undefined),
  );
  // The pages loaded after the first, as the list scrolls to its end.
  const [more, setMore] = useState<{ pages: number; rows: CompanySignal[] }>({
    pages: 1,
    rows: [],
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const timeZone = useMetadata().data?.settings.timeZone ?? DEFAULT_TIME_ZONE;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>();
  const [checked, setChecked] = useState<number | null>(null);
  const focusRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!focused) return;
    focusRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const timer = setTimeout(() => setFocused(null), 2500);
    return () => clearTimeout(timer);
  }, [focused, query.data]);
  if (query.isLoading) return <Loading />;
  const data = query.data;
  if (!data) return <ErrorNotice error={query.error} />;
  // After a change, the first page again and nothing after it.
  const reload = async () => {
    setMore({ pages: 1, rows: [] });
    await refreshSignals();
  };
  const loadMore = async (): Promise<void> => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await api<{ data: CompanySignalsData }>(
        `${path}?page=${String(more.pages + 1)}&pageSize=${String(data.pageSize)}`,
      );
      setMore({
        pages: more.pages + 1,
        rows: [...more.rows, ...next.data.signals],
      });
    } catch (cause) {
      setError(cause);
    } finally {
      setLoadingMore(false);
    }
  };
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
  // Checked now from the list too, as from the chip under the title.
  const checkNow = () =>
    run('check', async () => {
      const result = await api<{ data: { found: unknown[] } }>(
        `${path}/check`,
        'POST',
      );
      setChecked(result.data.found.length);
    });
  // Dismissed, or that undone.
  const decide = (signal: CompanySignal, status: 'dismissed' | 'new') =>
    run(signal.id, () => api(`signals/${signal.id}`, 'PATCH', { status }));
  // Dismissed ones last, faded, as the server orders them: kept so the
  // same event is not proposed again.
  const signals = [...data.signals, ...more.rows];
  return (
    <div className='space-y-3'>
      {/* Where its check stands, and Check now; its Watch is under the
          company's title (WatchButton). */}
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
        {data.canEdit && data.available && (
          // Drawn as the AI's buttons are (a task's AI 整理): on the AI's
          // tint, without a border, led by its mark.
          <Button
            size='sm'
            variant='ghost'
            className='h-7 gap-1.5 rounded-lg bg-primary/10 px-2.5 font-medium text-primary hover:bg-primary/15 hover:text-primary dark:bg-primary/20'
            disabled={busy !== null}
            onClick={() => void checkNow()}
          >
            {busy === 'check' ? <Spinner /> : <Sparkles />}
            {text(busy === 'check' ? 'signals.checking' : 'signals.checkNow')}
          </Button>
        )}
      </div>
      {checked !== null && busy === null && (
        <p role='status' className='text-sm text-muted-foreground'>
          {checked
            ? text('signals.foundSome', { count: checked })
            : text('signals.foundNone')}
        </p>
      )}
      {!data.available && (
        <p className='rounded-lg bg-muted p-3 text-sm text-muted-foreground'>
          {text('signals.unavailable')}
        </p>
      )}
      <ErrorNotice error={error} />
      {signals.length ? (
        <ul className='space-y-2'>
          {signals.map((signal) => (
            <li
              key={signal.id}
              ref={signal.id === focused ? focusRef : undefined}
              className={`grid gap-1.5 rounded-xl border bg-card p-3 text-sm transition-colors duration-700 ${
                signal.id === focused
                  ? 'border-primary bg-primary/10'
                  : 'border-border'
              } ${signal.status === 'dismissed' ? 'opacity-60' : ''}`}
            >
              <div className='flex flex-wrap items-center gap-2'>
                <SignalTypeTag type={signal.type} />
                <span className='text-xs text-muted-foreground'>
                  {signal.occurredOn}
                </span>
                {isNew(signal) && <Badge>{text('signals.new')}</Badge>}
                {signal.status === 'dismissed' && (
                  <span className='text-xs text-muted-foreground'>
                    {text('signals.dismissed')}
                  </span>
                )}
                <span className='flex-1' />
                {data.canEdit && (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='text-muted-foreground'
                    disabled={busy !== null}
                    onClick={() =>
                      void decide(
                        signal,
                        signal.status === 'dismissed' ? 'new' : 'dismissed',
                      )
                    }
                  >
                    {text(
                      signal.status === 'dismissed'
                        ? 'signals.restore'
                        : 'signals.dismiss',
                    )}
                  </Button>
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
      <AutoLoadMore
        hasMore={signals.length < data.total}
        loading={loadingMore}
        onLoad={() => void loadMore()}
      />
    </div>
  );
}

// How many it shows on the company's card before "All signals".
const ON_CARD = 3;

// The latest of the company's signals not dismissed (a page of `size`) and
// how many there are.
function useLatest(
  companyId: string,
  size = 1,
): {
  data: CompanySignalsData | undefined;
  open: CompanySignal[];
} {
  const query = useCrmQuery<CompanySignalsData>(signalsPath(companyId, size));
  return {
    data: query.data,
    open: (query.data?.signals ?? []).filter((s) => s.status !== 'dismissed'),
  };
}

// The whole list, its controls and sources, in a dialog.
function SignalsDialog({
  companyId,
  companyName,
  open,
  onOpenChange,
}: {
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[85svh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {text('signals.dialogTitle', { name: companyName })}
          </DialogTitle>
        </DialogHeader>
        <CompanySignals companyId={companyId} />
      </DialogContent>
    </Dialog>
  );
}

// The company page's Signals card, under its profile: where its check
// stands, the latest few signals, each to dismiss, and the whole
// list in a dialog (open on arrival from a signal's notice, `openAll`).
export function SignalsCard({
  companyId,
  companyName,
  openAll = false,
  onCloseAll,
}: {
  companyId: string;
  companyName: string;
  openAll?: boolean;
  // Leaves the address that opened it (a notice's, a timeline line's).
  onCloseAll?: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refreshSignals = useRefreshSignals(companyId);
  const { data, open } = useLatest(companyId, ON_CARD);
  // Open while asked here, or while the address asks (a notice, a timeline
  // line), which closing leaves.
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>();
  const decide = async (signal: CompanySignal): Promise<void> => {
    setBusy(signal.id);
    setError(undefined);
    try {
      await api(`signals/${signal.id}`, 'PATCH', { status: 'dismissed' });
      await refreshSignals();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(null);
    }
  };
  return (
    <InfoGroup title={text('signals.tab')}>
      <div className='space-y-2 px-2 pb-0.5'>
        <ErrorNotice error={error} />
        {!data ? (
          <Loading />
        ) : open.length ? (
          // As the column's rows read: no box of their own, a rule between
          // them, the kind and day above the title with the actions at
          // their end.
          <ul className='divide-y divide-border'>
            {open.slice(0, ON_CARD).map((signal) => (
              <li key={signal.id} className='space-y-1 py-2 first:pt-0'>
                <div className='flex min-h-6 items-center gap-1.5 text-xs text-muted-foreground'>
                  <SignalTypeTag type={signal.type} />
                  <span className='tabular-nums'>{signal.occurredOn}</span>
                  {isNew(signal) && (
                    <span
                      className='size-1.5 rounded-full bg-primary'
                      title={toText(text('signals.new'))}
                      aria-label={toText(text('signals.new'))}
                    />
                  )}
                  {data.canEdit && (
                    <Button
                      size='xs'
                      variant='ghost'
                      className='ml-auto text-muted-foreground'
                      disabled={busy !== null}
                      onClick={() => void decide(signal)}
                    >
                      {text('signals.dismiss')}
                    </Button>
                  )}
                </div>
                <p className='line-clamp-3 text-sm leading-relaxed'>
                  {signal.title}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-muted-foreground'>
            {text('signals.none')}
          </p>
        )}
        {/* The whole list, with its sources, the check's switch and
            "Check now": a quiet link under the rows. */}
        <button
          type='button'
          onClick={() => setDialog(true)}
          className='flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground'
        >
          {text('signals.viewAll', { count: data?.total ?? 0 })}
          <ChevronRight className='size-3.5' />
        </button>
      </div>
      <SignalsDialog
        companyId={companyId}
        companyName={companyName}
        open={dialog || openAll}
        onOpenChange={(open) => {
          setDialog(open);
          if (!open && openAll) onCloseAll?.();
        }}
      />
    </InfoGroup>
  );
}

// A deal's company card's row: the company's latest signal and how many it
// has, opening the whole list.
export function LatestSignalRow({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}): ReactElement {
  const { text } = useCrmText();
  const { data, open } = useLatest(companyId);
  const [dialog, setDialog] = useState(false);
  const latest = open[0];
  return (
    <InfoRow field='signals' label={text('signals.latest')}>
      {latest ? (
        <button
          type='button'
          onClick={() => setDialog(true)}
          className='block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover'
        >
          <span className='line-clamp-2'>{latest.title}</span>
          <span className='text-xs text-muted-foreground'>
            {text('signals.inAll', { count: data?.open ?? open.length })}
          </span>
        </button>
      ) : (
        <div className='px-2 py-1.5 text-sm text-muted-foreground'>
          {data ? text('signals.none') : '…'}
        </div>
      )}
      <SignalsDialog
        companyId={companyId}
        companyName={companyName}
        open={dialog}
        onOpenChange={setDialog}
      />
    </InfoRow>
  );
}

// Under the company's title, as a lead's or a deal's AI chip is: the
// Company signals agent and how many new signals the company has, opening
// the whole list, and, for whoever may edit the company while the search
// is configured, Check now at its end (a lead's Re-run). What a check found
// shows after it for a while.
export function SignalsStatus({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}): ReactElement | null {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refreshSignals = useRefreshSignals(companyId);
  const path = `companies/${companyId}/signals`;
  const { data } = useLatest(companyId);
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  if (!data) return null;
  const fresh = data.fresh;
  const check = async (): Promise<void> => {
    setBusy(true);
    setNote(undefined);
    try {
      const result = await api<{ data: { found: unknown[] } }>(
        `${path}/check`,
        'POST',
      );
      const found = result.data.found.length;
      setNote(
        toText(
          found
            ? text('signals.foundSome', { count: found })
            : text('signals.foundNone'),
        ),
      );
      await refreshSignals();
    } catch {
      setNote(toText(text('errors.signalsFailed')));
    } finally {
      setBusy(false);
    }
  };
  const canCheck = data.canEdit && data.available;
  return (
    <span className='inline-flex max-w-full items-center gap-2'>
      <span className='inline-flex h-7 max-w-full items-center rounded-lg bg-primary/10 font-sans text-sm dark:bg-primary/20'>
        <button
          type='button'
          onClick={() => setDialog(true)}
          className={`flex h-full min-w-0 items-center gap-1.5 px-2 transition-colors hover:bg-primary/15 ${
            canCheck ? 'rounded-l-lg' : 'rounded-lg'
          }`}
        >
          <Sparkles className='size-3.5 shrink-0 text-primary' />
          <span className='min-w-0 truncate font-medium text-primary'>
            <AgentWords
              inButton
              work='signals'
              wordKey='name'
              fallback='signals.tab'
            />
          </span>
          {fresh ? (
            <span className='shrink-0 text-primary/70'>
              {text('signals.newCount', { count: fresh })}
            </span>
          ) : null}
        </button>
        {canCheck ? (
          <>
            <span aria-hidden className='h-3.5 w-px shrink-0 bg-primary/20' />
            <button
              type='button'
              disabled={busy}
              onClick={() => void check()}
              className='flex h-full shrink-0 items-center gap-1 rounded-r-lg px-2 font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50'
            >
              {busy ? <Spinner className='size-3.5' /> : null}
              {text(busy ? 'signals.checking' : 'signals.checkNow')}
            </button>
          </>
        ) : null}
      </span>
      {note ? (
        <span role='status' className='text-xs text-muted-foreground'>
          {note}
        </span>
      ) : null}
      <SignalsDialog
        companyId={companyId}
        companyName={companyName}
        open={dialog}
        onOpenChange={setDialog}
      />
    </span>
  );
}

// Beside the chip, for whoever may edit the company: watching it has the
// daily check look at it every week, open deal or not.
export function WatchButton({
  companyId,
}: {
  companyId: string;
}): ReactElement | null {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refreshSignals = useRefreshSignals(companyId);
  const path = `companies/${companyId}/signals`;
  const { data } = useLatest(companyId);
  const [busy, setBusy] = useState(false);
  if (!data?.canEdit) return null;
  const toggle = async (): Promise<void> => {
    setBusy(true);
    try {
      await api(`${path}/watch`, 'PUT', { watched: !data.watched });
      await refreshSignals();
    } finally {
      setBusy(false);
    }
  };
  // Black while watching, as a switched-on state reads; what it does on
  // hover either way.
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size='sm'
            variant={data.watched ? 'contrast' : 'outline'}
            aria-pressed={data.watched}
            disabled={busy}
            onClick={() => void toggle()}
          />
        }
      >
        <Star className={data.watched ? 'fill-current' : undefined} />
        {text(data.watched ? 'signals.watching' : 'signals.watch')}
      </TooltipTrigger>
      <TooltipContent side='bottom' className='max-w-64'>
        {text(data.watched ? 'signals.watchingHint' : 'signals.watchHint')}
      </TooltipContent>
    </Tooltip>
  );
}
