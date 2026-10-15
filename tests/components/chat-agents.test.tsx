import { renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

// The agents a person may chat with (client/components/crm/agent-chat/ask.ts):
// the plugin's, without the CRM's work agents (crm-agents/work-agents.ts) and
// the Background AI they replaced, which do the CRM's work and nobody talks
// to.
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@nocobase/app-plugin-agents/client/chat')
  >()),
  useChatAgents: () => ({
    data: [
      'assistant',
      'lead-agent',
      'signals-agent',
      'background',
      'mine',
    ].map((id) => ({ id, name: id })),
    isLoading: false,
  }),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useMetadata: () => ({
    data: {
      backgroundAgent: 'background',
      workAgents: { leads: 'lead-agent', signals: 'signals-agent' },
    },
  }),
}));
const { useCrmChatAgents } =
  await import('../../client/components/crm/agent-chat/ask.js');

it('leaves the work agents and the Background AI out of the agents to chat with', () => {
  const { result } = renderHook(() => useCrmChatAgents());
  expect(result.current.data?.map((agent) => agent.id)).toEqual([
    'assistant',
    'mine',
  ]);
});
