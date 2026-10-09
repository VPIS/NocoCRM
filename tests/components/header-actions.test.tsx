import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { HeaderActions } from '../../client/layouts/components/header-actions.js';

vi.mock('../../client/theme/index.js', () => ({
  ThemeSettings: () => null,
}));
vi.mock('../../client/layouts/components/user-menu.js', () => ({
  UserMenu: () => null,
}));
vi.mock('../../client/components/crm/ai-chat.js', () => ({
  AssistantButton: () => <button aria-label='AI 助手' />,
}));
it('hides Settings when navigation has no accessible pages', () => {
  render(
    <MemoryRouter>
      <HeaderActions showSettings={false} />
    </MemoryRouter>,
  );
  expect(
    screen.queryByRole('link', { name: 'Settings' }),
  ).not.toBeInTheDocument();
});

it('keeps Settings visible and current on an accessible settings page', () => {
  render(
    <MemoryRouter initialEntries={['/settings/users']}>
      <HeaderActions showSettings />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  // The assistant opens from the header on every surface.
  expect(screen.getByRole('button', { name: 'AI 助手' })).toBeInTheDocument();
});

// The inbox leads the menu instead (client/routes.ts).
it('has the assistant beside the account menu and no inbox button', () => {
  render(
    <MemoryRouter initialEntries={['/leads']}>
      <HeaderActions showSettings />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('link', { name: /Inbox/u })).toBeNull();
  expect(screen.getByRole('button', { name: 'AI 助手' })).toBeInTheDocument();
});
