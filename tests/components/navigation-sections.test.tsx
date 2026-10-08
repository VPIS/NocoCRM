import type { AppClientRegisteredRoute } from '@nocobase/app-client/plugins';
import { render, screen } from '@testing-library/react';
import {
  TestI18nProvider,
  createTestI18nRuntime,
} from '@nocobase/i18n/testing';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { RouteNavigationItem } from '../../client/routing/route-navigation.js';
import {
  AppSidebar,
  AppSidebarProvider,
} from '../../client/layouts/components/app-sidebar.js';
import { NavigationBadgesContext } from '../../client/layouts/components/navigation-badges.js';
import { NavigationMenu } from '../../client/layouts/components/navigation-menu.js';

// The application changes to the template's menu: menu-only groups drawn as
// headed sections (`sections`), and a count beside an entry from
// NavigationBadgesContext, as the CRM's Waiting on me shows.
const runtime = await createTestI18nRuntime({ strict: false });

function I18n({ children }: { readonly children: ReactNode }) {
  return <TestI18nProvider runtime={runtime}>{children}</TestI18nProvider>;
}

function page(name: string): AppClientRegisteredRoute {
  return {
    name,
    id: name,
    path: `/${name}`,
    auth: 'required',
    packageName: 'test',
    source: 'application',
    navigation: { title: name },
    componentLoader: async () => ({ default: () => null }),
  };
}

const items: RouteNavigationItem[] = [
  { route: page('home'), children: [] },
  {
    route: { ...page('AI'), componentLoader: undefined },
    children: [
      { route: page('decisions'), children: [] },
      { route: page('skills'), children: [] },
    ],
  },
];

function shell(badges: Readonly<Record<string, number>>) {
  return (
    <MemoryRouter>
      <AppSidebarProvider>
        <AppSidebar label='Navigation'>
          <NavigationBadgesContext value={badges}>
            <NavigationMenu
              items={items}
              label='Menu'
              selectedKey={undefined}
              sections
            />
          </NavigationBadgesContext>
        </AppSidebar>
      </AppSidebarProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => vi.unstubAllGlobals());

it('draws a menu-only group as a heading over entries that are always shown', () => {
  render(shell({}), { wrapper: I18n });
  expect(screen.getByText('AI')).toBeInTheDocument();
  // A heading, not a toggle: nothing collapses the section.
  expect(screen.queryByRole('button', { name: 'AI' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'decisions' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'skills' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'home' })).toBeInTheDocument();
});

it('shows a count beside the entry it belongs to, and none at zero', () => {
  const { rerender } = render(shell({ decisions: 3 }), { wrapper: I18n });
  // The link reads the count to a screen reader; the badge beside it is drawn for the eye.
  expect(screen.getByRole('link', { name: /^decisions/u }).textContent).toBe(
    'decisions · 3',
  );
  expect(screen.getByText('3')).toHaveAttribute('aria-hidden');
  rerender(shell({ decisions: 120 }));
  expect(screen.getByText('99+')).toBeInTheDocument();
  rerender(shell({ decisions: 0 }));
  expect(screen.getByRole('link', { name: /^decisions/u }).textContent).toBe(
    'decisions',
  );
  expect(screen.queryByText('99+')).not.toBeInTheDocument();
});
