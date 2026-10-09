import { useSyncServerLocale } from '@nocobase/app-plugin-i18n/client';
import { useMemo, type ReactElement } from 'react';
import type { AppClientRegisteredRoute } from '@nocobase/app-client/plugins';
import { Outlet, useLocation } from 'react-router';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { EMPTY_ARRAY } from '@/lib/constants';

import { RouteTreeProvider } from '../routing/route-context.js';

import {
  PageBreadcrumbProvider,
  useClientApplication,
} from '@nocobase/app-client';
import { useTranslation } from '@nocobase/i18n/client';
import { LayoutHeader } from './components/layout-header.js';
import {
  AppSidebar,
  AppSidebarProvider,
  AppSidebarToggle,
} from './components/app-sidebar.js';
import { NavigationMenu } from './components/navigation-menu.js';
// Application changes: the counts beside "Inbox", "Approvals" and "Mailbox"
// (navigation-badges.ts, waiting-count.ts, mail-unread.ts) and the banner
// offering the demo dataset.
import { NavigationBadgesContext } from './components/navigation-badges.js';
import {
  useApprovalsToDecide,
  useInboxCount,
} from '../components/crm/waiting-count.js';
import { useMailUnreadCount } from '../components/crm/mail-unread.js';
import { DemoBanner } from '../components/crm/demo-banner.js';
import { AssistantDock } from '../components/crm/assistant-dock.js';
import { AppBrand } from './components/app-brand.js';
import { HeaderActions } from './components/header-actions.js';
import { AppSidebarFooter } from './components/sidebar-footer.js';
import {
  useRouteNavigation,
  selectedNavigationId,
  navigationPages,
} from '../routing/route-navigation.js';

export interface AppLayoutProps {
  readonly routes: readonly AppClientRegisteredRoute[];
  /** Pages plugins declare with `defineDevRoutes()`: rendered in this shell at `/dev/...`, never in its navigation. */
  readonly devRoutes?: readonly AppClientRegisteredRoute[];
}

export function AppLayout({
  routes,
  devRoutes = EMPTY_ARRAY,
}: AppLayoutProps): ReactElement {
  // The browser decides what it renders; this tells the server the same language so its messages match.
  useSyncServerLocale();

  const { t } = useTranslation();
  const { items: menuItems, denied } = useRouteNavigation(routes);
  const selectedKey = selectedNavigationId(
    routes,
    useLocation().pathname,
    denied,
  );
  const settingsNavigation = useRouteNavigation(
    useClientApplication().runtime.settingsRouteTree,
  );
  // Pages read their trail from this tree, so it keeps its identity between renders.
  const routeTree = useMemo(
    () => (devRoutes.length ? [...routes, ...devRoutes] : routes),
    [routes, devRoutes],
  );
  const navigationLabel = t('navigation.label', {
    defaultValue: 'Application navigation',
  });
  // Application change: the count beside the inbox in the menu and in the
  // tab's title.
  const inbox = useInboxCount();
  // And beside Approvals, those waiting on the reader's decision.
  const toDecide = useApprovalsToDecide();
  const unreadMail = useMailUnreadCount();

  return (
    // The shell owns the business route tree used by its pages and navigation.
    <RouteTreeProvider routes={routeTree}>
      <PageBreadcrumbProvider>
        <AppSidebarProvider>
          <AppSidebar label={navigationLabel} footer={<AppSidebarFooter />}>
            {/* Application change: the CRM's menu-only groups are headed sections (navigation-menu.tsx). */}
            <NavigationBadgesContext
              value={{
                inbox,
                'crm-approvals': toDecide,
                'crm-mail': unreadMail,
              }}
            >
              <NavigationMenu
                items={menuItems}
                label={navigationLabel}
                selectedKey={selectedKey}
                sections
              />
            </NavigationBadgesContext>
          </AppSidebar>
          {/* Application change: crm-page-main lets the assistant panel push header and page aside (styles.css). */}
          <div className='crm-page-main flex min-w-0 flex-1 flex-col'>
            <LayoutHeader className='sticky top-0 z-40 justify-between'>
              <div className='flex min-w-0 items-center gap-3'>
                <AppSidebarToggle />
                <div className='md:hidden'>
                  <AppBrand />
                </div>
                <div className='h-5 w-px shrink-0 bg-border' />
                {/* The current page's trail: the route tree's, or the one the page declares (`usePageBreadcrumb`). */}
                <Breadcrumbs denied={denied} />
              </div>
              <HeaderActions
                showSettings={
                  navigationPages(settingsNavigation.items).length > 0
                }
              />
            </LayoutHeader>
            {/* Application change: the CRM's demo banner, under the header
                and above every page, for whoever may import the dataset. */}
            <DemoBanner />
            <main className='relative min-w-0 flex-1 overflow-hidden'>
              {/* main only positions; the page scrolls in here, so a child page layer laid over main is neither
            moved by the page's scrolling nor stretched by its height. */}
              <div className='h-full overflow-y-auto'>
                <Outlet />
              </div>
              {/* Application change: the assistant's entry, floating over the
                  bottom of this column (assistant-dock.tsx). */}
              <AssistantDock />
            </main>
          </div>
        </AppSidebarProvider>
      </PageBreadcrumbProvider>
    </RouteTreeProvider>
  );
}
