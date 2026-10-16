import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import PermissionSetsPage from '../../client/pages/settings/permission-sets/index.js';
import PermissionSetPage from '../../client/pages/settings/permission-sets/detail/index.js';

// A permission set's page takes the list's place under the Settings tabs,
// with Back to the list; New and Rename open over the list.

const set = {
  key: 'crm-sales-manager',
  title: 'Sales manager',
  unrestricted: false,
};
vi.mock('@nocobase/app-plugin-authorization/client', () => ({
  useAuthorizationClient: () => ({}),
}));
vi.mock('@nocobase/app-client', () => ({
  useToaster: () => ({ show: vi.fn() }),
  usePageBreadcrumb: vi.fn(),
}));
vi.mock('@nocobase/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
    i18n: { language: 'en-US' },
  }),
}));
vi.mock('../../client/pages/settings/hooks.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAdminText: () => ({ text: (key: string) => key, language: 'en-US' }),
}));
vi.mock('../../client/pages/settings/permission-sets/data.js', () => ({
  setFailure: () => '',
  usePermissionSets: () => ({ data: [set] }),
  usePermissionSet: () => ({ data: set }),
  usePermissionSetsKey: () => ['permissionSets'],
  useMembers: () => ({ data: { assignments: [] } }),
  useSetActions: () => () => true,
  useSetTitle: () => (value: { title: string }) => value.title,
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

function at(path: string): void {
  const Child = (): ReactElement => <p>child page</p>;
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path='/settings/permission-sets'
          element={<PermissionSetsPage />}
        >
          <Route path='new' element={<Child />} />
          <Route path=':setKey' element={<PermissionSetPage />}>
            <Route path='permissions' element={<Child />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

it("shows a set's page alone, with Back to the list and its search", () => {
  at('/settings/permission-sets/crm-sales-manager/permissions?q=sales');
  expect(screen.queryByText('sets.title')).toBeNull();
  expect(
    screen.getByRole('heading', { level: 1, name: 'Sales manager' }),
  ).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe(
    '/settings/permission-sets?q=sales',
  );
  expect(screen.getByText('child page')).toBeTruthy();
});

it('keeps the list under New', () => {
  at('/settings/permission-sets/new');
  expect(screen.getByText('sets.title')).toBeTruthy();
  expect(screen.getByText('child page')).toBeTruthy();
});
