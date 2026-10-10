import {
  defineAppRoutes,
  type AppClientRouteContribution,
} from '@nocobase/app-client/plugins';
import type { AppClientRouteDefinition } from '@nocobase/app-client/plugins';
import {
  agentsRoute,
  modelsRoute,
  skillsRoute,
  usageRoute,
} from '@nocobase/app-plugin-agents/client/routes';
import {
  Bot,
  Building2,
  ChartLine,
  ClipboardList,
  UserRound,
  Handshake,
  LayoutDashboard,
  Inbox,
  ListChecks,
  Mail,
  MessagesSquare,
  Radar,
  ScanSearch,
  ShieldCheck,
  TrendingUp,
  Settings2,
  ShieldUser,
  UsersRound,
  KeyRound,
  CalendarClock,
  SquareCheckBig,
} from 'lucide-react';

// Navigation is read from these declarations, and the sidebar follows their
// order: the workspace and what to do first, then the AI team, the records
// with the reports, and mail. A group without a path is menu-only; the sidebar renders it as a
// headed section. Detail pages carry no navigation entry and select the
// nearest visible ancestor, which keeps an object highlighted on its records.
//
// Every page states its check: a page left without one is hidden from all but
// root. The page id is the route name, which the permission sets' page grants
// name (crmPages in server/providers/crm/resources.ts); renaming one means
// migrating those grants.
const page = (name: string) =>
  ({
    resource: { type: 'page', id: name },
    action: 'access',
  }) as const;

// The overlays a permission set's header opens, declared under each of its
// tabs, so they stack on the tab being shown; `tab` is that tab's route name.
function permissionSetHeaderRoutes(tab: string): AppClientRouteDefinition[] {
  return [
    {
      name: `${tab}-rename`,
      path: 'edit',
      componentLoader: () =>
        import('./pages/settings/permission-sets/rename.js'),
    },
  ];
}

const appRoutes: AppClientRouteContribution = defineAppRoutes([
  {
    auth: 'required',
    authz: page('home'),
    componentLoader: () => import('./pages/crm-dashboard.js'),
    name: 'home',
    navigation: { title: 'navigation.home', icon: LayoutDashboard },
    path: '/',
  },
  // What to do, right under the overview: the AI's suggestions waiting on
  // the reader, the tasks and the approvals. Application change: the
  // template reaches the inbox from a header button and declares it without
  // navigation; here it leads the menu instead, with the AI's suggestions in
  // its To do view (client/components/crm/inbox-decisions.tsx). The plugin's
  // API answers each person's own messages only, and the suggestions are
  // gated by the crm-decisions page grant, so the page needs no check of its
  // own.
  {
    authz: 'skip',
    auth: 'required',
    componentLoader: () => import('./pages/inbox.js'),
    name: 'inbox',
    path: '/inbox',
    navigation: { title: 'crm.navigation.inbox', icon: Inbox },
  },
  ...[
    ['tasks', SquareCheckBig],
    ['approvals', ListChecks],
  ].map(([entity, icon]) => ({
    name: `crm-${String(entity)}`,
    path: `/crm/${String(entity)}`,
    auth: 'required' as const,
    authz: page(`crm-${String(entity)}`),
    navigation: {
      title: `crm.entities.${String(entity)}`,
      icon: icon as typeof Radar,
    },
    componentLoader: () => import('./pages/crm-list.js'),
  })),
  // The agents: the AI's work the system starts on its own, one page per
  // agent (pages/crm-agents.tsx, which reads the agent from the path). The
  // four share the page grant crm-agents, an exception to "the page id is
  // the route name": they are one feature, granted together.
  // Conversations leads them: the person's own talks with the CRM's agent,
  // the assistant panel's full-page view, in place of the list the sidebar
  // once kept under the menu. The open conversation, or "new", is the
  // child's segment; the page draws it, as a record page draws its tab
  // (pages/crm-record-tab.tsx renders nothing).
  {
    name: 'crm-agent-group',
    navigation: { title: 'crm.navigation.agents' },
    children: [
      {
        name: 'crm-agent-chat',
        path: '/crm/agent-chat',
        auth: 'required',
        authz: page('crm-agent-chat'),
        navigation: {
          title: 'crm.navigation.conversations',
          icon: MessagesSquare,
        },
        componentLoader: () => import('./pages/crm-agent-chat/index.js'),
        children: [
          {
            name: 'crm-agent-chat-conversation',
            path: ':conversationId',
            componentLoader: () => import('./pages/crm-record-tab.js'),
          },
        ],
      },
      ...[
        ['leads', ScanSearch],
        ['opportunities', TrendingUp],
        ['approvals', ShieldCheck],
        ['tasks', ClipboardList],
      ].map(([agent, icon]) => ({
        name: `crm-agents-${String(agent)}`,
        path: `/crm/agents/${String(agent)}`,
        auth: 'required' as const,
        authz: page('crm-agents'),
        navigation: {
          title: `crm.agents.${String(agent)}.title`,
          icon: icon as typeof Radar,
        },
        componentLoader: () => import('./pages/crm-agents.js'),
      })),
    ],
  },
  // The records: leads and deals, then the companies and their people.
  {
    name: 'crm-records',
    navigation: { title: 'crm.navigation.records' },
    children: [
      ...[
        ['leads', Radar],
        ['opportunities', Handshake],
        ['companies', Building2],
        ['contacts', UserRound],
      ].map(([entity, icon]) => ({
        name: `crm-${String(entity)}`,
        path: `/crm/${String(entity)}`,
        auth: 'required' as const,
        authz: page(`crm-${String(entity)}`),
        navigation: {
          title: `crm.entities.${String(entity)}`,
          icon: icon as typeof Radar,
        },
        componentLoader: () => import('./pages/crm-list.js'),
      })),
      // How the business is going, read from the records above: the
      // analyses taken out of the overview, which keeps today's work.
      {
        auth: 'required',
        authz: page('crm-reports'),
        componentLoader: () => import('./pages/crm-reports.js'),
        name: 'crm-reports',
        navigation: { title: 'crm.navigation.reports', icon: ChartLine },
        path: '/crm/reports',
      },
    ],
  },
  // Integrations: the services the user connects, the mailbox now (other
  // channels later). The Mail plugin's workspace, and the page that connects
  // mailboxes, reached from its header with no entry of its own. Both check
  // the plugin's own page grant, `mail.workspace`, which its API checks too,
  // so the menu shows them to exactly those whose mail requests the server
  // answers.
  {
    name: 'crm-integrations',
    navigation: { title: 'crm.navigation.integrations' },
    children: [
      {
        name: 'crm-mail',
        path: '/crm/mail',
        auth: 'required',
        authz: page('mail.workspace'),
        navigation: { title: 'crm.navigation.mailbox', icon: Mail },
        componentLoader: () => import('./pages/crm-mail/index.js'),
      },
      // Reached from the Mailbox page's header, with no entry of its own;
      // the menu keeps Mailbox marked while it is shown.
      {
        name: 'crm-mail-accounts',
        path: '/crm/mail/accounts',
        auth: 'required',
        authz: page('mail.workspace'),
        componentLoader: () => import('./pages/crm-mail/accounts.js'),
      },
    ],
  },
  {
    name: 'crm-record',
    path: '/crm/:entity/:id',
    auth: 'required',
    authz: page('crm-record'),
    componentLoader: () => import('./pages/crm-detail.js'),
    // A tab has an address of its own (/crm/companies/<id>/contacts), read by
    // useDetailTab; the page draws the tab, see pages/crm-record-tab.tsx.
    children: [
      {
        name: 'crm-record-tab',
        path: ':tab',
        componentLoader: () => import('./pages/crm-record-tab.js'),
      },
    ],
  },
  // Accounts became companies: the old list, record and tab addresses lead
  // to the new ones, whose own routes check access.
  {
    name: 'crm-accounts-redirect',
    path: '/crm/accounts',
    auth: 'required',
    authz: 'skip',
    componentLoader: () => import('./pages/crm-companies-redirect.js'),
    children: [
      {
        name: 'crm-accounts-redirect-record',
        path: ':id',
        componentLoader: () => import('./pages/crm-companies-redirect.js'),
        children: [
          {
            name: 'crm-accounts-redirect-tab',
            path: ':tab',
            componentLoader: () => import('./pages/crm-companies-redirect.js'),
          },
        ],
      },
    ],
  },
  // Waiting on me became the inbox's AI suggestions: its old address, from
  // links and bookmarks, opens them there. The route keeps the page grant
  // that shows them.
  {
    name: 'crm-decisions',
    path: '/crm/decisions',
    auth: 'required',
    authz: page('crm-decisions'),
    componentLoader: () => import('./pages/crm-decisions.js'),
  },
  {
    auth: 'guest',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/login.js'),
    name: 'login',
    path: '/login',
  },
  {
    auth: 'guest',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/forgot-password.js'),
    name: 'forgot-password',
    path: '/forgot-password',
  },
  {
    auth: 'guest',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/reset-password.js'),
    name: 'reset-password',
    path: '/reset-password',
  },
  {
    // Where a command line's sign-in sends the person to approve it (`pages/auth/device.tsx`). Optional rather than
    // required so it renders outside the shell, like the sign-in pages; the page sends a guest to sign in and back.
    auth: 'optional',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/device.js'),
    name: 'device',
    path: '/device',
  },
  // Settings: what configures the CRM, its AI and its people, as ordinary
  // pages in a section of the menu. Template 1.0.0-beta.60 has no settings
  // area of its own (no /settings layout or header entry), and plugins
  // contribute no settings pages: each entry carries its own grant, so the
  // section shows only what the reader may open. The CRM's own pages keep
  // their /settings/... addresses; the Agents plugin's pages keep the paths
  // it navigates to.
  {
    name: 'crm-settings-group',
    navigation: { title: 'crm.navigation.settings' },
    children: [
      {
        name: 'crm-settings',
        path: '/settings/crm',
        auth: 'required',
        navigation: { title: 'crm.settings', icon: Settings2 },
        authz: {
          resource: { type: 'settings', id: 'crm' },
          action: 'manage',
        },
        componentLoader: () => import('./pages/crm-settings.js'),
      },
      // The administration pages the plugins left to the application in
      // template 1.0.0-beta.60 (client/pages/settings/): each route checks
      // what the plugin's own API checks.
      {
        // The users plugin's `user` record type, which it does not place in
        // the permission catalog: only the unrestricted root set opens it.
        name: 'settings-users',
        path: '/settings/users',
        auth: 'required',
        navigation: { title: 'crm.navigation.users', icon: UsersRound },
        authz: { resource: { type: 'user', id: '*' }, action: 'read' },
        componentLoader: () => import('./pages/settings/users/index.js'),
        children: [
          {
            name: 'settings-users-new',
            path: 'new',
            componentLoader: () => import('./pages/settings/users/new.js'),
          },
          {
            name: 'settings-users-invite',
            path: 'invite',
            componentLoader: () => import('./pages/settings/users/invite.js'),
          },
          {
            name: 'settings-users-edit',
            path: ':userId/edit',
            componentLoader: () => import('./pages/settings/users/edit.js'),
          },
          {
            name: 'settings-users-roles',
            path: ':userId/roles',
            componentLoader: () => import('./pages/settings/users/roles.js'),
          },
          {
            name: 'settings-users-password',
            path: ':userId/password',
            componentLoader: () => import('./pages/settings/users/password.js'),
          },
        ],
      },
      {
        name: 'settings-permission-sets',
        path: '/settings/permission-sets',
        auth: 'required',
        navigation: {
          title: 'crm.navigation.permissionSets',
          icon: ShieldUser,
        },
        authz: {
          resource: { type: 'settings', id: 'authorization.permission-sets' },
          action: 'read',
        },
        componentLoader: () =>
          import('./pages/settings/permission-sets/index.js'),
        children: [
          {
            name: 'settings-permission-sets-new',
            path: 'new',
            componentLoader: () =>
              import('./pages/settings/permission-sets/new.js'),
          },
          {
            name: 'settings-permission-sets-rename',
            path: 'edit/:setKey',
            componentLoader: () =>
              import('./pages/settings/permission-sets/rename.js'),
          },
          {
            // A set's own page, covering the list, with its two tabs; the
            // header's Rename is declared under each tab.
            name: 'settings-permission-set',
            path: ':setKey',
            componentLoader: () =>
              import('./pages/settings/permission-sets/detail/index.js'),
            children: [
              {
                name: 'settings-permission-set-permissions',
                path: 'permissions',
                componentLoader: () =>
                  import('./pages/settings/permission-sets/detail/permissions.js'),
                children: permissionSetHeaderRoutes(
                  'settings-permission-set-permissions',
                ),
              },
              {
                name: 'settings-permission-set-members',
                path: 'members',
                componentLoader: () =>
                  import('./pages/settings/permission-sets/detail/members.js'),
                children: [
                  ...permissionSetHeaderRoutes(
                    'settings-permission-set-members',
                  ),
                  {
                    name: 'settings-permission-set-members-add',
                    path: 'add',
                    componentLoader: () =>
                      import('./pages/settings/permission-sets/detail/add-members.js'),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        // Every signed-in person manages their own keys only; the API
        // answers for the caller alone.
        name: 'settings-api-keys',
        path: '/settings/api-keys',
        auth: 'required',
        navigation: { title: 'crm.navigation.apiKeys', icon: KeyRound },
        authz: 'skip',
        componentLoader: () => import('./pages/settings/api-keys/index.js'),
        children: [
          {
            name: 'settings-api-keys-new',
            path: 'new',
            componentLoader: () => import('./pages/settings/api-keys/new.js'),
          },
        ],
      },
      {
        // The page grant the scheduler's API checks.
        name: 'settings-scheduled-tasks',
        path: '/settings/scheduled-tasks',
        auth: 'required',
        navigation: {
          title: 'crm.navigation.scheduledTasks',
          icon: CalendarClock,
        },
        authz: page('scheduler.schedules'),
        componentLoader: () =>
          import('./pages/settings/scheduled-tasks/index.js'),
        children: [
          {
            name: 'settings-scheduled-task',
            path: ':scheduleId',
            componentLoader: () =>
              import('./pages/settings/scheduled-tasks/detail.js'),
          },
        ],
      },
      // The Agents plugin's pages, which it leaves to the application to route
      // (migration step 2): the agents, their model services, the skill
      // library and what runs used. Each keeps the page grant or settings item
      // its definition declares; the coding-tool runtimes page is left out, the
      // CRM's agents being online ones.
      {
        name: 'agents-settings',
        navigation: { title: 'crm.navigation.agentsGroup', icon: Bot },
        children: [
          {
            ...agentsRoute,
            navigation: { title: 'crm.navigation.agentList' },
          },
          { ...modelsRoute, navigation: { title: 'crm.navigation.models' } },
          { ...skillsRoute, navigation: { title: 'crm.navigation.skills' } },
          { ...usageRoute, navigation: { title: 'crm.navigation.usage' } },
        ],
      },
    ],
  },
]);

const routes: readonly AppClientRouteContribution[] = [appRoutes];

export default routes;
