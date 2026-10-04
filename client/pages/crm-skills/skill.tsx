import { useState, type ReactElement } from 'react';
import { useParams } from 'react-router';
import { RouteDrawer } from '../../components/route-drawer.js';
import { Button } from '../../components/ui/button.js';
import { Textarea } from '../../components/ui/textarea.js';
import { ErrorNotice, Loading } from '../../components/crm/common.js';
import { LengthHint } from '../../components/crm/length-hint.js';
import { Markdown } from '../../components/crm/markdown.js';
import {
  localDate,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
} from '../../components/crm/api.js';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';
import { useSkillDisplay, type CrmSkill, type SkillList } from './shared.js';

// One skill in a drawer over the Sales skills list: the company's additions,
// which whoever holds manageSkills edits here, then the built-in method it
// adds to, read-only.
export default function SkillDrawer(): ReactElement {
  const { text } = useCrmText();
  const display = useSkillDisplay();
  const { skillName } = useParams();
  const query = useCrmQuery<SkillList>('skills');
  const skill = query.data?.skills.find((s) => s.name === skillName);
  return (
    <RouteDrawer
      title={skill ? display(skill.title) : text('skillsPage.title')}
      description={skill ? display(skill.description) : undefined}
      className='sm:max-w-2xl'
    >
      {query.isLoading ? (
        <Loading />
      ) : !query.data ? (
        <ErrorNotice error={query.error} />
      ) : !skill ? (
        <ErrorNotice error={{ code: 'notFound' }} />
      ) : (
        <div className='grid gap-6'>
          <Additions
            key={skill.name}
            skill={skill}
            canEdit={query.data.canEdit}
          />
          <section className='grid gap-2 border-t pt-4'>
            <h3 className='text-sm font-medium'>{text('skillsPage.method')}</h3>
            <div className='rounded-lg border bg-muted/30 p-4'>
              <Markdown>{skill.content}</Markdown>
            </div>
          </section>
        </div>
      )}
    </RouteDrawer>
  );
}

function Additions({
  skill,
  canEdit,
}: {
  skill: CrmSkill;
  canEdit: boolean;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const timeZone = useMetadata().data?.settings.timeZone ?? 'Asia/Shanghai';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(skill.notes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  const save = async (): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await api(`skills/${skill.name}`, 'PUT', { notes: draft });
      await refresh();
      setEditing(false);
      setSaved(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className='grid gap-2'>
      <div className='flex items-center justify-between gap-2'>
        <h3 className='text-sm font-medium'>{text('skillsPage.notes')}</h3>
        {canEdit && !editing && (
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setDraft(skill.notes);
              setSaved(false);
              setEditing(true);
            }}
          >
            {text(skill.notes ? 'edit' : 'skillsPage.addNotes')}
          </Button>
        )}
      </div>
      <p className='text-xs text-muted-foreground'>
        {text('skillsPage.notesHint')}
      </p>
      {editing ? (
        <div className='grid gap-2'>
          <Textarea
            value={draft}
            maxLength={LONG_TEXT_LIMIT}
            rows={6}
            placeholder={text('skillsPage.placeholder')}
            aria-label={text('skillsPage.notes')}
            onChange={(e) => setDraft(e.target.value)}
          />
          <LengthHint length={draft.length} language={language} />
          <ErrorNotice error={error} />
          <div className='flex gap-2'>
            <Button disabled={busy} onClick={() => void save()}>
              {text('save')}
            </Button>
            <Button
              variant='outline'
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              {text('cancel')}
            </Button>
          </div>
        </div>
      ) : skill.notes ? (
        <Markdown compact>{skill.notes}</Markdown>
      ) : (
        <p className='text-sm text-muted-foreground'>
          {text('skillsPage.noNotes')}
        </p>
      )}
      {saved && !editing && (
        <p role='status' className='text-sm text-muted-foreground'>
          {text('skillsPage.saved')}
        </p>
      )}
      {skill.notes && skill.updatedAt && skill.updatedByName && !editing && (
        <p className='text-xs text-muted-foreground'>
          {text('skillsPage.updated', {
            name: skill.updatedByName,
            date: localDate(skill.updatedAt, language, timeZone),
          })}
        </p>
      )}
    </section>
  );
}
