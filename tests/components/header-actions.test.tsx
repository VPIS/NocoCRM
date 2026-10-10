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

// The header carries no Settings, Inbox or assistant entry: the settings
// pages are a section of the menu and the inbox leads its Action section
// (client/routes.ts), and the assistant is asked from the dock at the
// bottom of the page (assistant-dock.tsx).
it('has neither a settings, an inbox nor an assistant entry', () => {
  render(
    <MemoryRouter initialEntries={['/settings/crm']}>
      <HeaderActions />
    </MemoryRouter>,
  );
  expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
  expect(screen.queryByRole('link', { name: /Inbox/u })).toBeNull();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
