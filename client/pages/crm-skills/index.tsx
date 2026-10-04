import type { ReactElement } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { NotebookPen } from 'lucide-react';
import { PageContainer } from '../../components/page-container.js';
import { PageHeader } from '../../components/page-header.js';
import { Badge } from '../../components/ui/badge.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card.js';
import { ErrorNotice, Loading } from '../../components/crm/common.js';
import { useCrmQuery, useCrmText } from '../../components/crm/api.js';
import { useSkillDisplay, type SkillList } from './shared.js';

// The CRM's AI skills (ai/skills) and the company's additions to them, on
// the main menu so everyone can see how the AI works. Laid out as the AI
// Employee plugin's own skill page is: a card per skill, its full text and
// the additions in a drawer over the list (./skill.tsx, /crm/skills/<name>).
// The built-in method is read-only: it ships with the source. The additions
// are edited by whoever holds the sales capability manageSkills, stored by
// the server and appended to the skill the AI loads
// (server/providers/crm/skills.ts).
export default function SkillsPage(): ReactElement {
  const { text } = useCrmText();
  const display = useSkillDisplay();
  const location = useLocation();
  const query = useCrmQuery<SkillList>('skills');
  return (
    <PageContainer>
      <PageHeader
        title={text('skillsPage.title')}
        description={text('skillsPage.description')}
      />
      {query.isLoading ? (
        <Loading />
      ) : !query.data ? (
        <ErrorNotice error={query.error} />
      ) : query.data.skills.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          {text('skillsPage.empty')}
        </p>
      ) : (
        <div className='grid gap-4 md:grid-cols-2'>
          {query.data.skills.map((skill) => (
            <Link
              key={skill.name}
              to={{ pathname: skill.name, search: location.search }}
              className='rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
            >
              <Card className='h-full transition-colors hover:bg-muted/40'>
                <CardHeader>
                  <div className='flex items-center gap-2'>
                    <CardTitle>{display(skill.title)}</CardTitle>
                    <Badge variant='muted'>{text('skillsPage.builtIn')}</Badge>
                  </div>
                  <p className='font-mono text-xs text-muted-foreground'>
                    {skill.name}
                  </p>
                  <CardDescription className='line-clamp-3'>
                    {display(skill.description)}
                  </CardDescription>
                </CardHeader>
                <CardContent className='mt-auto'>
                  <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                    <NotebookPen className='size-3.5' aria-hidden />
                    {text(
                      skill.notes
                        ? 'skillsPage.hasNotes'
                        : 'skillsPage.noNotes',
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Outlet />
    </PageContainer>
  );
}
