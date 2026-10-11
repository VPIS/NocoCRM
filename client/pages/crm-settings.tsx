import { PageContainer } from '../components/page-container.js';
import { PageHeader } from '../components/page-header.js';
import { toText } from '../components/crm/api.js';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Switch } from '../components/ui/switch.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { Loading, ErrorNotice } from '../components/crm/common.js';
import { Choice } from '../components/crm/form.js';
import { ConfirmDialog } from './crm-detail.js';
import {
  localDate,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useRefresh,
  type CrmSettings,
} from '../components/crm/api.js';
interface DemoStatus {
  present: boolean;
  createdAt: string | null;
  records: number;
  accounts: { username: string; name: string; role: string }[];
  accountsByLanguage?: Record<
    string,
    { username: string; name: string; role: string }[]
  >;
}
interface SettingsResponse {
  settings: CrmSettings;
  demo: DemoStatus;
}
// What each card holds and saves.
const BUSINESS = ['currency', 'timeZone', 'aiLanguage'] as const;
const REMINDER_DAYS = [
  'taskReminderMinutes',
  'closeReminderDays',
  'uncontactedDays',
  'leadStaleDays',
  'staleDays',
  'nurtureReviewDays',
] as const;
const NOTIFICATIONS = [
  'notifyApprovals',
  'notifyRecordChanges',
  'notifyComments',
  'notifyTaskReminders',
] as const;
const REMINDERS = [...REMINDER_DAYS, ...NOTIFICATIONS] as const;

export default function SettingsPage(): ReactElement {
  const settings = useCrmQuery<CrmSettings>('systemSettings');
  const demo = useCrmQuery<DemoStatus>('demoData');
  const { text } = useCrmText();
  if (settings.isLoading || demo.isLoading) return <Loading />;
  if (!settings.data || !demo.data)
    return (
      <PageContainer>
        <PageHeader title={text('settings')} />
        <ErrorNotice error={settings.error ?? demo.error} />
      </PageContainer>
    );
  return (
    <SettingsForm initial={{ settings: settings.data, demo: demo.data }} />
  );
}
function SettingsForm({
  initial,
}: {
  initial: SettingsResponse;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [settings, setSettings] = useState(initial.settings);
  // What the server holds, which a card's Save is offered against.
  const [stored, setStored] = useState(initial.settings);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  // The card being saved, and the card saved last.
  const [saving, setSaving] = useState<string>();
  const [saved, setSaved] = useState<string>();
  // ?section=demoData brings that part into view (the demo banner links
  // there).
  const [searchParams] = useSearchParams();
  const target = searchParams.get('section');
  useEffect(() => {
    if (target)
      document
        .getElementById(`settings-${target}`)
        ?.scrollIntoView({ block: 'start' });
  }, [target]);
  // The demo dataset: imported and removed from here, never saved with the
  // settings form, so it keeps its own state and confirmation.
  const [demo, setDemo] = useState(initial.demo);
  const [demoAction, setDemoAction] = useState<'populate' | 'reset'>();
  const [demoNotice, setDemoNotice] = useState<string>();
  // The dataset comes in Chinese and in English (the same story, translated);
  // the reader's interface language is the first choice.
  const [demoLanguage, setDemoLanguage] = useState(
    language.startsWith('zh') ? 'zh-CN' : 'en-US',
  );
  // A second click on the confirmation, before it closes, starts nothing:
  // an import takes a while, and a second one beside it would be refused.
  const demoRunningRef = useRef(false);
  const runDemo = async (action: 'populate' | 'reset'): Promise<void> => {
    if (demoRunningRef.current) return;
    demoRunningRef.current = true;
    setBusy(true);
    setError(undefined);
    setDemoNotice(undefined);
    try {
      setDemo(
        (
          await api<{ data: DemoStatus }>(
            action === 'populate' ? 'demoData/import' : 'demoData/remove',
            'POST',
            action === 'populate' ? { language: demoLanguage } : {},
          )
        ).data,
      );
      await refresh();
      setDemoNotice(
        text(action === 'populate' ? 'demoImported' : 'demoRemoved'),
      );
    } catch (e) {
      setError(e);
    } finally {
      demoRunningRef.current = false;
      setBusy(false);
      setDemoAction(undefined);
    }
  };
  const set = (key: keyof CrmSettings, value: unknown): void => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(undefined);
  };
  // Each card saves its own settings alone, the route taking any part of
  // them, and only once one of them differs from what is stored.
  const saveCard = (card: string, keys: readonly (keyof CrmSettings)[]) => {
    const changed = keys.some((key) => settings[key] !== stored[key]);
    return (
      <div className='flex items-center justify-end gap-3'>
        {saved === card && (
          <span role='status' className='text-sm text-muted-foreground'>
            {text('settingsSaved')}
          </span>
        )}
        <Button
          disabled={!changed || saving !== undefined}
          onClick={() => {
            void (async () => {
              setSaving(card);
              setError(undefined);
              try {
                const changes = Object.fromEntries(
                  keys.map((key) => [key, settings[key]]),
                );
                await api('systemSettings', 'PUT', changes);
                setStored((current) => ({ ...current, ...changes }));
                await refresh();
                setSaved(card);
              } catch (e) {
                setError(e);
              } finally {
                setSaving(undefined);
              }
            })();
          }}
        >
          {saving === card ? text('saving') : text('save')}
        </Button>
      </div>
    );
  };
  const fields = (keys: readonly (keyof CrmSettings)[]): ReactElement => (
    <div className='grid gap-4 sm:grid-cols-2'>
      {keys.map((key) => (
        <label key={key} className='grid gap-2 text-sm'>
          {text(`fields.${toText(key)}`)}
          {key === 'timeZone' ? (
            // IANA zones the browser knows, with the saved one kept even when
            // it is not among them; a typed zone name is easy to get wrong
            // and everything date-related hangs on it.
            <Choice
              label={text('fields.timeZone')}
              value={toText(settings.timeZone)}
              choices={[
                ...new Set([
                  toText(settings.timeZone),
                  ...Intl.supportedValuesOf('timeZone'),
                ]),
              ]
                .filter(Boolean)
                .map((v) => ({ value: v, label: v }))}
              onChange={(v) => set(key, v)}
            />
          ) : key === 'aiLanguage' ? (
            // What the AI writes in when it works on its own, the same for
            // the whole team; the chat answers in the user's language.
            <Choice
              label={text('fields.aiLanguage')}
              value={toText(settings.aiLanguage)}
              choices={['zh-CN', 'en-US'].map((v) => ({
                value: v,
                label: text(`aiLanguages.${v}`),
              }))}
              onChange={(v) => set(key, v)}
            />
          ) : key === 'currency' ? (
            // The default for new opportunities, from the currency list
            // defined in code (server/providers/crm/schema.ts).
            <Choice
              label={text('fields.currency')}
              value={toText(settings.currency)}
              choices={(settings.options.currency ?? []).map((v) => ({
                value: v,
                label: v,
              }))}
              onChange={(v) => set(key, v)}
            />
          ) : (
            <Input
              value={toText(settings[key])}
              type={typeof settings[key] === 'number' ? 'number' : 'text'}
              min={0}
              onChange={(e) =>
                set(
                  key,
                  typeof settings[key] === 'number'
                    ? Number(e.target.value)
                    : e.target.value,
                )
              }
            />
          )}
        </label>
      ))}
    </div>
  );
  return (
    <PageContainer>
      <PageHeader
        title={text('settings')}
        description={text('settingsDescription')}
      />
      <ErrorNotice error={error} />
      {/* One page, its parts one under another: the business defaults and
          the reminders each saved by their own card's Save; the demo
          dataset is imported and removed on its own. */}
      <Card
        id='settings-business'
        className='max-w-4xl scroll-mt-16 border border-border shadow-xs ring-0'
      >
        <CardHeader>
          <CardTitle>{text('business')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {fields(BUSINESS)}
          {saveCard('business', BUSINESS)}
        </CardContent>
      </Card>
      <Card
        id='settings-reminders'
        className='max-w-4xl scroll-mt-16 border border-border shadow-xs ring-0'
      >
        <CardHeader>
          <CardTitle>{text('reminders')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='space-y-6'>
            {fields(REMINDER_DAYS)}
            {/* Each kind of in-app message the CRM sends, on unless
                switched off (service.ts, queueMessage). */}
            <div className='space-y-2'>
              <p className='text-sm font-medium'>
                {text('notifications.heading')}
              </p>
              <ul className='divide-y divide-border rounded-lg border border-border px-3'>
                {NOTIFICATIONS.map((key) => (
                  <li
                    key={key}
                    className='flex items-start justify-between gap-4 py-2.5'
                  >
                    <div className='min-w-0 space-y-0.5'>
                      <p className='text-sm'>{text(`notifications.${key}`)}</p>
                      <p className='text-xs text-muted-foreground'>
                        {text(`notifications.${key}Hint`)}
                      </p>
                    </div>
                    <Switch
                      checked={settings[key] !== false}
                      onCheckedChange={(on) => set(key, on)}
                      aria-label={toText(text(`notifications.${key}`))}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {saveCard('reminders', REMINDERS)}
        </CardContent>
      </Card>
      <Card
        id='settings-demoData'
        className='max-w-4xl scroll-mt-16 border border-border shadow-xs ring-0'
      >
        <CardHeader>
          <CardTitle>{text('demoData')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <>
            <p className='text-sm text-muted-foreground'>
              {text('demoDescription')}
            </p>
            <ul className='grid gap-1 text-sm sm:grid-cols-2'>
              {/* The accounts the import will create in the language
                  picked, or those of the import present. */}
              {(
                (!demo.present && demo.accountsByLanguage?.[demoLanguage]) ||
                demo.accounts
              ).map((account) => (
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
            {demoNotice && (
              <p role='status' className='rounded-lg bg-primary/10 p-3 text-sm'>
                {demoNotice}
              </p>
            )}
            <p className='text-sm'>
              {demo.present
                ? text('demoPresent', {
                    date: localDate(
                      demo.createdAt,
                      language,
                      settings.timeZone,
                    ),
                    count: demo.records,
                  })
                : text('demoAbsent')}
            </p>
            {!demo.present && (
              <label className='flex items-center gap-3 text-sm'>
                <span className='shrink-0'>{text('demoLanguage')}</span>
                <span className='w-40'>
                  <Choice
                    label={text('demoLanguage')}
                    value={demoLanguage}
                    choices={['zh-CN', 'en-US'].map((v) => ({
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
                disabled={busy || demo.present}
                onClick={() => setDemoAction('populate')}
              >
                {text('demoImport')}
              </Button>
              <Button
                variant='outline'
                disabled={busy || !demo.present}
                onClick={() => setDemoAction('reset')}
              >
                {text('demoReset')}
              </Button>
            </div>
            {demoAction && (
              <ConfirmDialog
                title={text(
                  demoAction === 'populate'
                    ? 'demoImportTitle'
                    : 'demoResetTitle',
                )}
                description={text(
                  demoAction === 'populate'
                    ? 'demoImportHint'
                    : 'demoResetHint',
                )}
                busy={busy}
                onCancel={() => setDemoAction(undefined)}
                onConfirm={() => void runDemo(demoAction)}
              />
            )}
          </>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
