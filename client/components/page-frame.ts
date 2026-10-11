import { createContext, type ReactNode } from 'react';

// Application change: a page that gathers several pages under tabs (the
// settings, client/pages/settings/index.tsx) gives them its title and tabs
// through this, and PageHeader draws those in place of the page's own title,
// with the page's description and actions on a row under the tabs. A
// covering child page (RouteChildPage) is a page of its own and clears it.
export interface PageFrame {
  readonly title: ReactNode;
  readonly tabs: ReactNode;
}

export const PageFrameContext = createContext<PageFrame | null>(null);
