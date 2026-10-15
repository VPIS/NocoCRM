import {
  defineAppRoutes,
  type AppClientRouteContribution,
} from '@nocobase/app-client/plugins';
import type {
  AppClientRouteComponentLoader,
  AppClientRouteDefinition,
} from '@nocobase/app-client/plugins';
import {
  agentsRoute,
  modelsRoute,
  skillsRoute,
  usageRoute,
} from '@nocobase/app-plugin-agents/client/routes';
import {
  Bot,
  BookOpen,
  Cpu,
  Gauge,
  Building2,
  ChartLine,
  UserRound,
  Handshake,
  LayoutDashboard,
  Inbox,
  ListChecks,
  Mail,
  Radar,
  Workflow,
  ScrollText,
  Settings2,
  SquareCheckBig,
} from 'lucide-react';

// One of the Agents plugin's pages, drawn in the CRM's look
// (components/crm/plugin-page.tsx): its component is loaded as the plugin
// declares it and wrapped, the route otherwise the plugin's own.
const crmStyled = <
  Route extends { componentLoader: AppClientRouteComponentLoader },
>(
  route: Route,
): Route => ({
  ...route,
  componentLoader: async () => {
    const [{ default: Page }, { withCrmStyle }] = await Promise.all([
      route.componentLoader(),
      import('./components/crm/plugin-page.js'),
    ]);
    return { default: withCrmStyle(Page) };
  },
});

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
  // The Agent team, after Integrations: the AI's work the system starts on
  // its own, its four agents on one page with a tab each (Auto follow-up,
  // pages/crm-agents.tsx), then the Agents plugin's own pages, which it leaves to the
  // application to route (migration step 2): the agents, the skill library,
  // their model services and what runs used. Each of those keeps the page
  // grant or settings item its definition declares, so it shows only to
  // whoever may open it; the coding-tool runtimes page is left out, the
  // CRM's agents being online ones.
  // Conversations leads them: the person's own talks with the CRM's agent,
  // the assistant panel's full-page view, in place of the list the sidebar
  // once kept under the menu. The open conversation, or "new", is the
  // child's segment; the page draws it, as a record page draws its tab
  // (pages/crm-record-tab.tsx renders nothing).
  {
    name: 'crm-agent-group',
    navigation: { title: 'crm.navigation.agentsGroup' },
    children: [
      {
        name: 'crm-agent-chat',
        path: '/crm/agent-chat',
        auth: 'required',
        authz: page('crm-agent-chat'),
        // No menu entry: the overview lists the latest conversations and
        // leads here through View all; the header still names the page.
        breadcrumb: { title: 'crm.navigation.conversations' },
        componentLoader: () => import('./pages/crm-agent-chat/index.js'),
        children: [
          {
            name: 'crm-agent-chat-conversation',
            path: ':conversationId',
            componentLoader: () => import('./pages/crm-record-tab.js'),
          },
        ],
      },
      // Agent work: the work agents on one page, a tab each, their switches
      // and their runs, /crm/agent-work/<agent> naming the tab (the page
      // draws it, as a record page draws its own; pages/crm-record-tab.tsx
      // renders nothing), and /crm/agent-work opening on the first. Once
      // Auto follow-up at /crm/agents, which still leads here; its route
      // and page grant keep the name `crm-agents`, which stored grants name.
      {
        name: 'crm-agents',
        path: '/crm/agent-work',
        auth: 'required',
        authz: page('crm-agents'),
        navigation: { title: 'crm.navigation.agentWork', icon: Workflow },
        componentLoader: () => import('./pages/crm-agents.js'),
        children: [
          {
            name: 'crm-agents-tab',
            path: ':agent',
            componentLoader: () => import('./pages/crm-record-tab.js'),
          },
        ],
      },
      // The business guidance the AI works from, which the settings page
      // once kept as a tab (pages/crm-guidance.tsx); saved with the
      // settings, so it checks what they check.
      {
        name: 'crm-guidance',
        path: '/crm/guidance',
        auth: 'required',
        authz: {
          resource: { type: 'settings', id: 'crm' },
          action: 'manage',
        },
        navigation: { title: 'crm.navigation.guidance', icon: ScrollText },
        componentLoader: () => import('./pages/crm-guidance.js'),
      },
      {
        ...crmStyled(agentsRoute),
        navigation: { title: 'crm.navigation.agentList', icon: Bot },
      },
      {
        ...crmStyled(skillsRoute),
        navigation: { title: 'crm.navigation.skills', icon: BookOpen },
      },
      {
        ...crmStyled(modelsRoute),
        navigation: { title: 'crm.navigation.models', icon: Cpu },
      },
      {
        ...crmStyled(usageRoute),
        navigation: { title: 'crm.navigation.usage', icon: Gauge },
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
  // Auto follow-up became Agent work: its old addresses lead to the new
  // ones, whose route checks access.
  {
    name: 'crm-agents-redirect',
    path: '/crm/agents',
    auth: 'required',
    authz: 'skip',
    componentLoader: () => import('./pages/crm-agent-work-redirect.js'),
    children: [
      {
        name: 'crm-agents-redirect-tab',
        path: ':agent',
        componentLoader: () => import('./pages/crm-agent-work-redirect.js'),
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
  // Settings: what configures the CRM and its people, one entry of the menu
  // that opens a page with a tab each (pages/settings/index.tsx). Template
  // 1.0.0-beta.60 has no settings area of its own (no /settings layout or
  // header entry), and plugins contribute no settings pages: the tabs are
  // this page's children at the /settings/... addresses they had as entries
  // of their own, each with its grant, and a tab shows only to whoever may
  // open it. The Agents plugin's pages are in the Agent team section.
  {
    name: 'settings',
    path: '/settings',
    auth: 'required',
    // Opens on the first tab its reader may open; API keys are everyone's.
    authz: 'skip',
    navigation: { title: 'crm.navigation.settings', icon: Settings2 },
    componentLoader: () => import('./pages/settings/index.js'),
    children: [
      {
        name: 'crm-settings',
        path: 'crm',
        authz: {
          resource: { type: 'settings', id: 'crm' },
          action: 'manage',
        },
        componentLoader: () => import('./pages/crm-settings.js'),
      },
      {
        // The demo dataset, imported and removed (pages/settings/
        // demo-data.tsx); the administrators', as the General tab is,
        // whose last card it was.
        name: 'settings-demo-data',
        path: 'demo-data',
        authz: {
          resource: { type: 'settings', id: 'crm' },
          action: 'manage',
        },
        componentLoader: () => import('./pages/settings/demo-data.js'),
      },
      {
        // How an approval moves, read only; the administrators', as the
        // General tab is.
        name: 'settings-approval-flow',
        path: 'approval-flow',
        authz: {
          resource: { type: 'settings', id: 'crm' },
          action: 'manage',
        },
        componentLoader: () =>
          import('./pages/settings/approval-flow/index.js'),
      },
      // The administration pages the plugins left to the application in
      // template 1.0.0-beta.60 (client/pages/settings/): each route checks
      // what the plugin's own API checks.
      {
        // The users plugin's `user` record type, which it does not place in
        // the permission catalog: only the unrestricted root set opens it.
        name: 'settings-users',
        path: 'users',
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
        path: 'permission-sets',
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
        path: 'api-keys',
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
        path: 'scheduled-tasks',
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
    ],
  },
]);

const routes: readonly AppClientRouteContribution[] = [appRoutes];

export default routes;
