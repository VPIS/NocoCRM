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
});

// The inbox leads the menu (client/routes.ts) and the assistant is asked
// from the dock at the bottom of the page (assistant-dock.tsx).
it('has neither an inbox nor an assistant button', () => {
  render(
    <MemoryRouter initialEntries={['/leads']}>
      <HeaderActions showSettings />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('link', { name: /Inbox/u })).toBeNull();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
