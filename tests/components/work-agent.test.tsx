import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// The agent doing a dialog's AI work, named in it
// (client/components/crm/work-agent.tsx): "by <agent> Agent" with what it
// does, its name translated as the Agents page translates
// it, and nothing while it is archived or gone.
function english(key: string, options?: Record<string, unknown>): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  if (typeof value !== 'string') return key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(options?.[name] ?? ''),
  );
}
let names: Record<string, unknown> | undefined;
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({ text: english, language: 'en-US' }),
  useMetadata: () => ({
    data: { assistant: true, workAgentNames: names },
  }),
}));
vi.mock('@nocobase/app-plugin-agents/client/chat', () => ({
  // Its avatar, marked to show where it stands, no text of its own.
  AgentAvatar: () => <i data-avatar />,
  // The plugin's translation of a built-in agent's name: its reference
  // read in Chinese here, to tell it from the name as written.
  useAgentText: () => ({
    name: (agent: { name: string; nameText: { key: string } | null }) =>
      agent.nameText?.key === 'crm.agentWork.names.tasks'
        ? '任务助手'
        : agent.name,
  }),
}));
const { AgentSentence, WorkAgentLabel } =
  await import('../../client/components/crm/work-agent.js');
const { useAgentWords } =
  await import('../../client/components/crm/work-agent-name.js');
const { FollowUpOption } =
  await import('../../client/components/crm/follow-up-option.js');

it("names the agent doing the dialog's work, translated while it keeps its name", () => {
  names = {
    tasks: {
      name: 'Task assistant',
      nameText: { key: 'crm.agentWork.names.tasks', ns: 'crm' },
    },
    // Renamed by an administrator: shown as they wrote it.
    leads: { name: 'Our leads', nameText: null },
  };
  const { container, unmount } = render(<WorkAgentLabel work='tasks' />);
  expect(screen.getByText('任务助手')).toBeTruthy();
  expect(container.textContent).toBe('Organised by任务助手');
  unmount();
  const merge = render(<WorkAgentLabel work='leads' does='propose' />);
  expect(screen.getByText('Our leads')).toBeTruthy();
  expect(merge.container.textContent).toBe('Proposed byOur leads');
});

it('names nothing while the work has no agent of its own', () => {
  names = {};
  const { container } = render(<WorkAgentLabel work='opportunities' />);
  expect(container.textContent).toBe('');
});

it('sets the agent among the words around it', () => {
  const { container } = render(
    <AgentSentence textKey='agentWork.by.organise' name='Task assistant' />,
  );
  expect(container.textContent).toBe('Organised byTask assistant');
});

it('names the agent a follow-up option runs, and keeps the AI words without it', () => {
  names = {
    opportunities: { name: 'Opportunity follow-up', nameText: null },
  };
  const option = (label: string) => (
    <FollowUpOption
      checked
      onChange={() => {}}
      label={label}
      agent='opportunities'
      trigger='taskDone'
    />
  );
  const { container, unmount } = render(option('evaluation.followUpAfter'));
  expect(container.textContent).toBe(
    'RunOpportunity follow-uponce recorded',
  );
  unmount();
  names = {};
  const plain = render(option('dealFollowUpNow'));
  expect(plain.container.textContent).toBe(
    'AI follows up the opportunity at once',
  );
});

it("words a record's AI button by its agent, and by the AI without one", () => {
  names = {
    tasks: {
      name: 'Task assistant',
      nameText: { key: 'crm.agentWork.names.tasks', ns: 'crm' },
    },
  };
  function Words(): ReactElement {
    const words = useAgentWords();
    return (
      <p>
        {words('tasks', 'run', 'taskPrep.ask')}|
        {words('tasks', 'running.prep', 'taskPrep.running')}|
        {words('approvals', 'run', 'approvalReview.ask')}
      </p>
    );
  }
  const { container } = render(<Words />);
  expect(container.textContent).toBe(
    'Run 任务助手|任务助手 is preparing this task…|AI review',
  );
});

it("leads the agent's name with its avatar", () => {
  names = { leads: { name: 'Lead follow-up', nameText: null } };
  const { container } = render(<WorkAgentLabel work='leads' />);
  const avatar = container.querySelector('[data-avatar]');
  expect(avatar?.nextSibling?.textContent).toBe('Lead follow-up');
});
