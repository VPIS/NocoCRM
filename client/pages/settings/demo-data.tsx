import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClientError, useToaster } from '@nocobase/app-client';
import { useDemoData } from '@nocobase/app-plugin-demo-mode/client/demo-data';
import type {
  DemoConfigurationView,
  DemoWriteRule,
} from '@nocobase/app-plugin-demo-mode/client/demo-configuration';
import { PageContainer } from '../../components/page-container.js';
import { PageHeader } from '../../components/page-header.js';
import { Button } from '../../components/ui/button.js';
import { Card, CardContent } from '../../components/ui/card.js';
import { Checkbox } from '../../components/ui/checkbox.js';
import { Progress } from '../../components/ui/progress.js';
import { Alert, AlertDescription } from '../../components/ui/alert.js';
import { ErrorNotice, Loading } from '../../components/crm/common.js';
import { Choice } from '../../components/crm/form.js';
import { ConfirmDialog } from '../crm-detail.js';
import {
  localDate,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useRefresh,
  type Metadata,
} from '../../components/crm/api.js';
import { DEFAULT_TIME_ZONE } from '../../../server/providers/crm/zone-time.js';

// Settings → Demo data: the CRM's demo dataset, imported and removed
// through the demo mode plugin's lifecycle (`useDemoData`, the server's
// /api/demoMode/data), and what visitors of a read-only demo may still do
// (/api/demoMode/configuration). Only in a deployment running in demo mode:
// elsewhere the plugin's routes answer nothing and the page says why.

// The demo mode plugin's own errors carry their explanation, translated by
// the server; the CRM's are told as everywhere else.
function DemoError({ error }: { error: unknown }): ReactElement | null {
  const standard =
    error instanceof ApiClientError
      ? (
          error.payload as
            | {
                error?: {
                  domain?: string;
                  localizedMessage?: { message?: string };
                  message?: string;
                };
              }
            | undefined
        )?.error
      : undefined;
  if (standard?.domain !== 'demoMode') return <ErrorNotice error={error} />;
  return (
    <Alert variant='destructive' role='alert'>
      <AlertDescription>
        {standard.localizedMessage?.message ?? standard.message}
      </AlertDescription>
    </Alert>
  );
}

export default function DemoDataPage(): ReactElement {
  const { text, language } = useCrmText();
  const refresh = useRefresh();
  const queryClient = useQueryClient();
  const toaster = useToaster();
  // The workspace's settings, for the date the dataset was imported.
  const timeZone =
    useCrmQuery<Metadata>('workspace').data?.settings?.timeZone ??
    DEFAULT_TIME_ZONE;
  const demo = useDemoData();
  const [error, setError] = useState<unknown>();
  const [action, setAction] = useState<'import' | 'clear' | 'reset'>();
  // The dataset comes in Chinese and in English (the same story, told with
  // people of the language); the reader's interface language first.
  const [demoLanguage, setDemoLanguage] = useState(
    language.startsWith('zh') ? 'zh-CN' : 'en-US',
  );
  const status = demo.status;
  const run = async (which: 'import' | 'clear' | 'reset'): Promise<void> => {
    setError(undefined);
    try {
      if (which === 'import') await demo.importData(demoLanguage);
      else if (which === 'reset') await demo.reset(demoLanguage);
      else await demo.clear();
      // Clearing is done when it answers; an import goes on in the
      // background, its progress on this page and in the banner.
      if (which === 'clear') {
        toaster.show({ type: 'success', title: text('demoRemoved') });
        // The records, the reader's roles and the settings changed.
        await queryClient.invalidateQueries();
        await refresh();
      }
    } catch (cause) {
      setError(cause);
    } finally {
      setAction(undefined);
    }
  };
  // An import this page watched has finished: everything the pages read
  // changed, the reader's roles included.
  const importing = Boolean(status?.importing);
  const wasImportingRef = useRef(false);
  const present = Boolean(status?.present);
  useEffect(() => {
    if (wasImportingRef.current && !importing && present) {
      toaster.show({ type: 'success', title: text('demoImported') });
      void queryClient.invalidateQueries();
    }
    wasImportingRef.current = importing;
  }, [importing, present, toaster, text, queryClient]);

  if (demo.loading && !status) return <Loading />;
  if (!status || status.mode === 'off' || !status.available)
    return (
      <PageContainer>
        <PageHeader title={text('demoData')} />
        <p className='text-sm text-muted-foreground'>
          {text('demoUnavailable')}
        </p>
      </PageContainer>
    );
  const accounts =
    (!status.present && status.accountsByLanguage[demoLanguage]) ||
    status.accounts;
  const busy = demo.pending || importing || status.state === 'clearing';
  return (
    <PageContainer>
      <PageHeader
        title={text('demoData')}
        description={text('demoDescription')}
      />
      <DemoError error={error ?? demo.error} />
      <Card className='max-w-4xl border border-border shadow-xs ring-0'>
        <CardContent className='space-y-6'>
          <p className='text-sm text-muted-foreground'>
            {text(
              status.mode === 'read-only'
                ? 'demoModeReadOnly'
                : 'demoModeObserve',
            )}
          </p>
          <ul className='grid gap-1 text-sm sm:grid-cols-2'>
            {/* The accounts the import will create in the language
                picked, or those of the import present. */}
            {accounts.map((account) => (
              <li key={account.username} className='flex gap-2'>
                <code className='rounded bg-muted px-1.5 py-0.5 text-xs'>
                  {account.username}
                </code>
                <span>{account.name}</span>
                <span className='text-muted-foreground'>
                  {text(`options.${account.role}`)}
                </span>
              </li>
            ))}
          </ul>
          {status.importing ? (
            <div className='flex items-center gap-3 text-sm'>
              <span className='shrink-0'>{text('demoImporting')}</span>
              <Progress
                value={status.importing.percent}
                aria-label={text('demoImporting')}
                className='w-56'
              />
              <span className='text-xs text-muted-foreground tabular-nums'>
                {status.importing.percent}%
              </span>
            </div>
          ) : (
            <p className='text-sm'>
              {status.present
                ? text('demoPresent', {
                    date: localDate(status.createdAt, language, timeZone),
                    count: status.records,
                  })
                : text('demoAbsent')}
            </p>
          )}
          {status.failure && !status.importing ? (
            <p className='text-sm text-destructive'>
              {text('demoFailed', { message: status.failure.message })}
            </p>
          ) : null}
          {!status.importing && (
            <label className='flex items-center gap-3 text-sm'>
              <span className='shrink-0'>{text('demoLanguage')}</span>
              <span className='w-40'>
                <Choice
                  label={text('demoLanguage')}
                  value={demoLanguage}
                  choices={status.languages.map((v) => ({
                    value: v,
                    label: text(`aiLanguages.${v}`),
                  }))}
                  onChange={(v) => v && setDemoLanguage(v)}
                />
              </span>
            </label>
          )}
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              disabled={busy}
              onClick={() => setAction('reset')}
            >
              {text('demoRebuild')}
            </Button>
            <Button
              disabled={busy || status.present}
              onClick={() => setAction('import')}
            >
              {text('demoImport')}
            </Button>
            <Button
              variant='outline'
              // A failed import or clear leaves part of it to take back.
              disabled={busy || (!status.present && status.state !== 'failed')}
              onClick={() => setAction('clear')}
            >
              {text('demoReset')}
            </Button>
          </div>
          {action && (
            <ConfirmDialog
              title={text(
                action === 'import'
                  ? 'demoImportTitle'
                  : action === 'reset'
                    ? 'demoRebuild'
                    : 'demoResetTitle',
              )}
              description={
                action === 'import'
                  ? text('demoImportHint')
                  : text('demoClearAllHint')
              }
              busy={demo.pending}
              onCancel={() => setAction(undefined)}
              onConfirm={() => void run(action)}
            />
          )}
        </CardContent>
      </Card>
      <DemoWrites />
    </PageContainer>
  );
}

// The write exceptions a read-only demo offers (server/providers/crm/
// demo-writes.ts), as checkboxes: each capability's operations together, in
// its scope. Saved with the revision read, so another administrator's save
// is never overwritten.
const LABELS: Record<string, string> = { 'crm.aiWork': 'demoWriteAiWork' };

function DemoWrites(): ReactElement | null {
  const { text } = useCrmText();
  const api = useCrmApi();
  const query = useCrmQuery<DemoConfigurationView>('demoMode/configuration');
  // What the last save answered, until the query reads it again.
  const [saved, setSaved] = useState<DemoConfigurationView>();
  const view =
    saved && (!query.data || saved.revision >= query.data.revision)
      ? saved
      : query.data;
  const [error, setError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  if (!view) return query.error ? <DemoError error={query.error} /> : null;
  const capabilities = view.capabilities.filter((c) => c.id in LABELS);
  if (!capabilities.length) return null;
  const allowed = (id: string) => view.rules.some((r) => r.capability === id);
  const toggle = async (id: string, on: boolean): Promise<void> => {
    const capability = capabilities.find((c) => c.id === id);
    if (!capability) return;
    const scope = capability.scopes[0]?.id ?? 'all';
    const rules: DemoWriteRule[] = [
      ...view.rules.filter((r) => r.capability !== id),
      ...(on
        ? capability.operations.map((operation) => ({
            capability: id,
            operation,
            scope,
          }))
        : []),
    ];
    setSaving(true);
    setError(undefined);
    try {
      setSaved(
        (
          await api<{ data: DemoConfigurationView }>(
            'demoMode/configuration/writeRules',
            'PUT',
            { expectedRevision: view.revision, value: rules },
          )
        ).data,
      );
    } catch (cause) {
      const conflict =
        cause instanceof ApiClientError &&
        (cause.payload as { error?: { reason?: string } } | undefined)?.error
          ?.reason === 'DEMO_CONFIGURATION_CONFLICT';
      if (conflict) {
        setSaved(undefined);
        await query.refetch();
        setError(new Error(toText(text('demoWritesConflict'))));
      } else setError(cause);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card className='max-w-4xl border border-border shadow-xs ring-0'>
      <CardContent className='space-y-3'>
        <h2 className='text-sm font-medium'>{text('demoWrites')}</h2>
        {error instanceof Error && !(error instanceof ApiClientError) ? (
          <p className='text-sm text-destructive'>{error.message}</p>
        ) : (
          <DemoError error={error} />
        )}
        {capabilities.map((capability) => (
          <label
            key={capability.id}
            className='flex items-center gap-3 text-sm'
          >
            <Checkbox
              checked={allowed(capability.id)}
              disabled={saving || view.busy}
              onCheckedChange={(checked) =>
                void toggle(capability.id, checked === true)
              }
            />
            <span>{text(LABELS[capability.id] ?? capability.title)}</span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
