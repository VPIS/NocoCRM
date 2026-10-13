import { useState, type ReactElement } from 'react';
import { PageContainer } from '../components/page-container.js';
import { PageHeader } from '../components/page-header.js';
import { Button } from '../components/ui/button.js';
import { Textarea } from '../components/ui/textarea.js';
import { Loading, ErrorNotice } from '../components/crm/common.js';
import { settingsGuidance } from '../../server/providers/crm/guidance.js';
import { LONG_TEXT_LIMIT } from '../../server/providers/crm/limits.js';
import {
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useRefresh,
  type CrmSettings,
} from '../components/crm/api.js';

// The business guidance the AI works from (server/providers/crm/guidance.ts),
// in the Agent team section: the shipped one, which follows the reminders'
// days and the AI language, until an administrator writes over it. It is a
// setting (`businessGuidance`), saved on its own; writing it back to the
// shipped text, or leaving it blank, returns to the shipped one.
export default function GuidancePage(): ReactElement {
  const settings = useCrmQuery<CrmSettings>('systemSettings');
  const { text } = useCrmText();
  if (settings.isLoading) return <Loading />;
  if (!settings.data)
    return (
      <PageContainer>
        <PageHeader title={text('guidance')} />
        <ErrorNotice error={settings.error} />
      </PageContainer>
    );
  return <GuidanceForm settings={settings.data} />;
}

function GuidanceForm({ settings }: { settings: CrmSettings }): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const shipped = settingsGuidance({ ...settings, businessGuidance: '' });
  const [value, setValue] = useState(settings.businessGuidance);
  // What is typed stays in the box as typed (blank included); until then it
  // shows the guidance in force.
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>();
  const custom = Boolean(value.trim());
  const change = (next: string): void => {
    setValue(next);
    setSaved(false);
  };
  const save = async (): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await api('systemSettings', 'PUT', { businessGuidance: value });
      await refresh();
      setSaved(true);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  return (
    <PageContainer>
      <PageHeader
        title={text('guidance')}
        description={text('guidanceHint')}
        actions={
          <Button
            variant='contrast'
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? text('saving') : text('save')}
          </Button>
        }
      />
      <ErrorNotice error={error} />
      {saved && (
        <p role='status' className='rounded-lg bg-primary/10 p-3 text-sm'>
          {text('settingsSaved')}
        </p>
      )}
      <div className='max-w-4xl space-y-3'>
        <Textarea
          aria-label={toText(text('guidance'))}
          value={draft ?? (custom ? value : shipped)}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            change(next === shipped || !next.trim() ? '' : next);
          }}
          maxLength={LONG_TEXT_LIMIT}
          // Grows with the text up to most of the screen, then scrolls.
          className='max-h-[70vh] min-h-96 overflow-y-auto bg-card font-mono text-xs leading-relaxed md:text-xs'
        />
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <p className='text-xs text-muted-foreground'>
            {text(custom ? 'guidanceCustom' : 'guidanceShipped')}
          </p>
          <Button
            variant='outline'
            size='sm'
            disabled={!custom && draft === null}
            onClick={() => {
              setDraft(null);
              change('');
            }}
          >
            {text('guidanceRestore')}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
