import { useState, type ReactElement } from 'react';
import type {
  DemoChatConfiguration,
  DemoConfigurationView,
} from '@nocobase/app-plugin-demo-mode/client/demo-configuration';
import { Card, CardContent } from '../../components/ui/card.js';
import { Button } from '../../components/ui/button.js';
import { Checkbox } from '../../components/ui/checkbox.js';
import { Input } from '../../components/ui/input.js';
import { ErrorNotice } from '../../components/crm/common.js';
import {
  useCrmApi,
  useCrmQuery,
  useCrmText,
} from '../../components/crm/api.js';

export function DemoChat(): ReactElement | null {
  const query = useCrmQuery<DemoConfigurationView>('demoMode/configuration');
  if (!query.data)
    return query.error ? <ErrorNotice error={query.error} /> : null;
  return (
    <ChatFields
      key={query.data.revision}
      view={query.data}
      reload={async () => {
        await query.refetch();
      }}
    />
  );
}
function ChatFields({
  view,
  reload,
}: {
  view: DemoConfigurationView;
  reload: () => Promise<void>;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const [draft, setDraft] = useState<DemoChatConfiguration>(view.chat);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();
  const save = async () => {
    setPending(true);
    setError(undefined);
    try {
      await api('demoMode/configuration/chat', 'PUT', {
        expectedRevision: view.revision,
        value: draft,
      });
      await reload();
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className='max-w-4xl border border-border shadow-xs ring-0'>
      <CardContent className='flex flex-col gap-4'>
        <h2 className='text-base font-medium'>{text('demoChatTitle')}</h2>
        <p className='text-sm text-muted-foreground'>{text('demoChatHint')}</p>
        <ErrorNotice error={error} />
        <label className='flex items-center gap-3 text-sm'>
          <Checkbox
            checked={draft.enabled}
            disabled={pending || view.busy}
            onCheckedChange={(value) =>
              setDraft({ ...draft, enabled: value === true })
            }
          />
          {text('demoChatEnabled')}
        </label>
        <label className='flex items-center gap-3 text-sm'>
          <Checkbox
            checked={draft.model !== null}
            disabled={pending || view.busy}
            onCheckedChange={(value) =>
              setDraft({
                ...draft,
                model: value === true ? { modelService: '', model: '' } : null,
              })
            }
          />
          {text('demoChatLive')}
        </label>
        {draft.model && (
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='flex flex-col gap-2 text-sm'>
              {text('demoChatService')}
              <Input
                value={draft.model.modelService}
                disabled={pending}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    model: {
                      ...draft.model!,
                      modelService: event.target.value,
                    },
                  })
                }
              />
            </label>
            <label className='flex flex-col gap-2 text-sm'>
              {text('demoChatModel')}
              <Input
                value={draft.model.model}
                disabled={pending}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    model: { ...draft.model!, model: event.target.value },
                  })
                }
              />
            </label>
          </div>
        )}
        <label className='flex items-center gap-3 text-sm'>
          <Checkbox
            checked={draft.tools['crm.read'] === 'read'}
            disabled={pending || view.busy}
            onCheckedChange={(value) =>
              setDraft({
                ...draft,
                tools: {
                  ...draft.tools,
                  'crm.read': value === true ? 'read' : 'deny',
                },
              })
            }
          />
          {text('demoChatRead')}
        </label>
        <div className='flex gap-2'>
          <Button
            disabled={
              pending ||
              view.busy ||
              JSON.stringify(draft) === JSON.stringify(view.chat) ||
              Boolean(
                draft.model &&
                (!draft.model.modelService.trim() || !draft.model.model.trim()),
              )
            }
            onClick={() => void save()}
          >
            {text('save')}
          </Button>
          <Button
            variant='outline'
            disabled={pending}
            onClick={() => void reload()}
          >
            {text('demoChatReload')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
