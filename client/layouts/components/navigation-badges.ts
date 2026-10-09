import { createContext, useContext } from 'react';

// Application change to the template's navigation: a count beside a menu
// entry, keyed by route name, which the application layout provides (the
// inbox's waiting suggestions and unread notifications, the mailbox's unread
// mail, the agents' runs under way). The template's navigation object has
// no field for one, and a count changes while the page is open, so it comes
// from the layout rather than from the route declaration. A plain number is
// something waiting; a live badge is work going on (a pulsing dot in the
// AI's colour) with its own words for the tooltip.
export type NavigationBadge =
  | number
  | { readonly count: number; readonly live: true; readonly hint: string };

export const NavigationBadgesContext = createContext<
  Readonly<Record<string, NavigationBadge>>
>({});

export function useNavigationBadge(routeName: string | undefined): {
  count: number;
  live: boolean;
  hint?: string;
} {
  const badges = useContext(NavigationBadgesContext);
  const badge = routeName ? badges[routeName] : undefined;
  if (typeof badge === 'object')
    return { count: badge.count, live: true, hint: badge.hint };
  return { count: badge ?? 0, live: false };
}
