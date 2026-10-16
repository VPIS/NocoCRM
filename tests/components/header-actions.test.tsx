import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { HeaderActions } from '../../client/layouts/components/header-actions.js';
import { AssistantHeaderButton } from '../../client/components/crm/assistant-header-button.js';

vi.mock('../../client/theme/index.js', () => ({
  ThemeSettings: () => null,
}));
vi.mock('../../client/layouts/components/user-menu.js', () => ({
  UserMenu: () => null,
}));

const state = vi.hoisted(() => ({
  readiness: { state: 'ready' } as { state: string; reason?: string },
  open: false,
  toggleChat: vi.fn(),
}));
vi.mock('@nocobase/app-plugin-agents/client/chat', () => ({
  useChatPanel: () => ({ open: state.open, toggleChat: state.toggleChat }),
}));
vi.mock('../../client/components/crm/agent-chat/ask.js', () => ({
  useAgentReadiness: () => state.readiness,
}));
vi.mock('../../client/components/crm/api.js', () => ({
  toText: (value: unknown) => String(value ?? ''),
  useCrmText: () => ({ text: (key: string) => key }),
}));

beforeEach(() => {
  state.readiness = { state: 'ready' };
  state.open = false;
  state.toggleChat.mockReset();
});

// The header carries no Settings or Inbox entry: the settings pages are a
// section of the menu and the inbox is the menu's, right under the overview
// (client/routes.ts). It leads with the assistant, from every page.
it('has the assistant, and neither a settings nor an inbox entry', () => {
  render(
    <MemoryRouter initialEntries={['/settings/crm']}>
      <HeaderActions />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
  expect(screen.queryByRole('link', { name: /Inbox/u })).toBeNull();
  expect(screen.getByRole('button', { name: 'dock.open' })).toBeTruthy();
});

it('opens the panel where it was left, as ⌘J does, and closes it again', () => {
  const { rerender } = render(<AssistantHeaderButton />);
  const button = screen.getByRole('button', { name: 'dock.open' });
  expect(button.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(button);
  expect(state.toggleChat).toHaveBeenCalledTimes(1);
  state.open = true;
  rerender(<AssistantHeaderButton />);
  expect(
    screen
      .getByRole('button', { name: 'dock.open' })
      .getAttribute('aria-expanded'),
  ).toBe('true');
});

it('says why, disabled, while the assistant cannot answer, and waits while it loads', () => {
  state.readiness = { state: 'unavailable', reason: 'Not set up' };
  const { rerender } = render(<AssistantHeaderButton />);
  const button = screen.getByRole('button', { name: 'Not set up' });
  expect(button.hasAttribute('disabled')).toBe(true);
  state.readiness = { state: 'loading' };
  rerender(<AssistantHeaderButton />);
  expect(screen.queryByRole('button')).toBeNull();
});
