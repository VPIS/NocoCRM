import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import {
  CalendarClock,
  KeyRound,
  Settings2,
  ShieldUser,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { PageFrameContext } from '../../components/page-frame.js';
import { LinkTabs } from '../../components/crm/link-tabs.js';
import { Loading } from '../../components/crm/common.js';
import { useCrmText } from '../../components/crm/api.js';

// Settings, the menu's one entry for them: the pages that configure the CRM
// and its people, a tab each, at the addresses they had as entries of their
// own (/settings/crm, /settings/users …). Each tab's route still checks its
// own grant; a tab shows only to whoever that grant lets open it, and
// /settings opens on the first of those. The tabs' pages keep their
// description and actions, which PageHeader draws under the tabs
// (components/page-frame.ts).
interface Tab {
  path: string;
  label: string;
  icon: LucideIcon;
}
const TABS: readonly Tab[] = [
  { path: 'crm', label: 'navigation.general', icon: Settings2 },
  { path: 'users', label: 'navigation.users', icon: UsersRound },
  {
    path: 'permission-sets',
    label: 'navigation.permissionSets',
    icon: ShieldUser,
  },
  { path: 'api-keys', label: 'navigation.apiKeys', icon: KeyRound },
  {
    path: 'scheduled-tasks',
    label: 'navigation.scheduledTasks',
    icon: CalendarClock,
  },
];

export default function SettingsPage(): ReactElement {
  const { text } = useCrmText();
  const { pathname } = useLocation();
  // The same checks as the tabs' routes in client/routes.ts; API keys are
  // everyone's own.
  const access: Record<string, ReturnType<typeof useCan>> = {
    crm: useCan({
      resource: { type: 'settings', id: 'crm' },
      action: 'manage',
    }),
    users: useCan({ resource: { type: 'user', id: '*' }, action: 'read' }),
    'permission-sets': useCan({
      resource: { type: 'settings', id: 'authorization.permission-sets' },
      action: 'read',
    }),
    'scheduled-tasks': useCan({
      resource: { type: 'page', id: 'scheduler.schedules' },
      action: 'access',
    }),
  };
  const pending = Object.values(access).some((check) => check.isPending);
  const tabs = TABS.filter((tab) => access[tab.path]?.can ?? true);
  const current = /\/settings\/([^/]+)/.exec(pathname)?.[1];
  if (!current) {
    if (pending) return <Loading />;
    return <Navigate to={`/settings/${tabs[0]?.path ?? 'api-keys'}`} replace />;
  }
  return (
    <PageFrameContext.Provider
      value={{
        title: text('navigation.settings'),
        tabs: (
          <LinkTabs
            label={text('navigation.settings')}
            tabs={tabs.map((tab) => ({
              to: `/settings/${tab.path}`,
              label: text(tab.label),
              icon: tab.icon,
              selected: tab.path === current,
            }))}
          />
        ),
      }}
    >
      <Outlet />
    </PageFrameContext.Provider>
  );
}
