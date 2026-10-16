import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import {
  createMemoryRouter,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
} from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// The WhatsApp pages (client/pages/crm-whatsapp/, components/crm/whatsapp/,
// pages/crm-whatsapp/connection.tsx): the messages as bubbles with their media,
// the workspace's list and conversation with its actions, a record's tab,
// and the connection page with its numbers and the number dialog.

function english(key: string, options?: Record<string, unknown>): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  if (typeof value !== 'string')
    return typeof options?.defaultValue === 'string'
      ? options.defaultValue
      : key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(options?.[name] ?? ''),
  );
}
const state = vi.hoisted(() => ({
  api: vi.fn(),
  meta: {} as Record<string, unknown>,
}));
vi.mock('@nocobase/app-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nocobase/app-client')>()),
  // The unsaved-changes guard, whose provider the application shell gives.
  useNavigationGuard: () => undefined,
}));
vi.mock('@nocobase/app-plugin-authentication/client', () => ({
  useAuthentication: () => ({ refresh: async () => undefined }),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({ text: english, language: 'en-US' }),
  useCrmApi: () => state.api,
  useCrmScopeKey: () => ['crm'],
  useMetadata: () => ({ data: state.meta }),
  useRefresh: () => async () => undefined,
}));

const { WhatsAppMessages } =
  await import('../../client/components/crm/whatsapp/messages.js');
const { RecordWhatsAppPanel } =
  await import('../../client/components/crm/whatsapp/record-tab.js');
const { default: WhatsAppPage } =
  await import('../../client/pages/crm-whatsapp/index.js');
const { default: ConversationPane } =
  await import('../../client/pages/crm-whatsapp/conversation.js');
const { default: WhatsAppSettingsPage } =
  await import('../../client/pages/crm-whatsapp/connection.js');
const { default: WhatsAppNumberDialog } =
  await import('../../client/pages/crm-whatsapp/number.js');

const message = (
  id: string,
  at: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  conversationId: 'c1',
  direction: 'in' as const,
  origin: 'customer',
  type: 'text',
  text: `Message ${id}`,
  caption: null,
  media: null,
  replyTo: null,
  status: null,
  sentById: null,
  occurredAt: at,
  ...extra,
});
const customer = {
  id: 'w1',
  name: 'Ana Souza',
  phone: '+5511999990000',
  username: null,
  profileName: 'Ana Souza',
  state: 'unlinked' as const,
  leadId: null,
  contactId: null,
  matchedBy: null,
};
const conversation = {
  id: 'c1',
  lastInboundAt: '2026-10-15T08:00:00.000Z',
  unreadCount: 0,
  contact: customer,
  record: null,
  messages: [message('m1', '2026-10-14T08:00:00.000Z')],
  more: false,
};
const wrap = (ui: ReactElement): ReactElement => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {ui}
  </QueryClientProvider>
);

beforeEach(() => {
  state.api.mockReset();
  state.meta = {
    userId: 'u1',
    settingsAccess: true,
    users: [],
    whatsapp: { configured: true },
    permissions: { leads: { create: false } },
  };
  Element.prototype.scrollTo ??= () => undefined;
});

describe('the messages', () => {
  it("mark coexistence's messages by where they came from, an edit, and a deletion", () => {
    render(
      <WhatsAppMessages
        messages={[
          message('h1', '2026-09-01T08:00:00.000Z', {
            origin: 'imported',
            text: 'From the history',
          }),
          message('h2', '2026-09-01T08:05:00.000Z', {
            direction: 'out',
            origin: 'imported',
            type: 'media_placeholder',
            text: null,
          }),
          message('a1', '2026-10-15T08:00:00.000Z', {
            direction: 'out',
            origin: 'businessApp',
            text: 'Answered on the phone',
            editedAt: '2026-10-15T08:01:00.000Z',
          }),
          message('a2', '2026-10-15T08:02:00.000Z', {
            direction: 'out',
            origin: 'businessApp',
            text: 'Taken back',
            revokedAt: '2026-10-15T08:03:00.000Z',
          }),
        ]}
        more={false}
        loadingEarlier={false}
        onLoadEarlier={() => undefined}
        senderOf={() => 'Ana Souza'}
      />,
    );
    expect(screen.getAllByText(/^Imported · /)).toHaveLength(2);
    expect(screen.getByText(/^From the app · Edited · /)).toBeTruthy();
    expect(screen.getByText('File from the history')).toBeTruthy();
    // A deletion shows no words of it.
    expect(screen.getByText('This message was deleted')).toBeTruthy();
    expect(screen.queryByText('Taken back')).toBeNull();
  });

  it('show a day separator, the media by its state, and who wrote each', () => {
    render(
      <WhatsAppMessages
        messages={[
          message('m1', '2026-10-14T08:00:00.000Z'),
          message('m2', '2026-10-15T08:00:00.000Z', {
            type: 'image',
            text: null,
            caption: 'Our line',
            media: {
              status: 'stored',
              fileId: 'f1',
              url: '/api/attachments/f1/content',
              mimeType: 'image/jpeg',
              filename: null,
            },
          }),
          message('m3', '2026-10-15T08:01:00.000Z', {
            type: 'document',
            text: null,
            media: {
              status: 'pending',
              fileId: null,
              url: null,
              mimeType: null,
              filename: 'spec.pdf',
            },
          }),
          message('m4', '2026-10-15T08:02:00.000Z', {
            type: 'audio',
            text: null,
            media: {
              status: 'unavailable',
              fileId: null,
              url: null,
              mimeType: null,
              filename: null,
            },
          }),
          message('m5', '2026-10-15T08:03:00.000Z', {
            direction: 'out',
            origin: 'crm',
            text: 'Thanks',
          }),
        ]}
        more
        loadingEarlier={false}
        onLoadEarlier={() => undefined}
        senderOf={() => 'Ana Souza'}
      />,
    );
    // Two days, two separators.
    expect(screen.getByText('Oct 14, 2026')).toBeTruthy();
    expect(screen.getByText('Oct 15, 2026')).toBeTruthy();
    const image = screen.getByRole('img', { name: 'Our line' });
    expect(image.getAttribute('src')).toBe(
      '/api/attachments/f1/content?inline=1',
    );
    expect(screen.getByText(crmEn.whatsapp.media.pending)).toBeTruthy();
    expect(screen.getByText(crmEn.whatsapp.media.unavailable)).toBeTruthy();
    expect(screen.getByText(crmEn.whatsapp.kind.audio)).toBeTruthy();
    // Who wrote each, for screen readers too.
    expect(screen.getAllByText('Ana Souza:')).toHaveLength(4);
    expect(screen.getByText(`${crmEn.whatsapp.team}:`)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: crmEn.whatsapp.loadEarlier }),
    ).toBeTruthy();
  });
});

describe('the workspace', () => {
  const routes = (path: string): ReactElement =>
    wrap(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path='/crm/whatsapp' element={<WhatsAppPage />}>
            <Route path=':conversationId' element={<ConversationPane />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  const respond = (overrides: Record<string, unknown> = {}) =>
    state.api.mockImplementation(async (path: string, method = 'GET') => {
      if (path in overrides) return overrides[path];
      if (path.startsWith('whatsapp/conversations?'))
        return {
          data: [
            {
              id: 'c1',
              waContactId: 'w1',
              name: 'Ana Souza',
              phone: '+5511999990000',
              state: 'unlinked',
              leadId: null,
              contactId: null,
              lastMessageAt: '2026-10-14T08:00:00.000Z',
              lastDirection: 'in',
              unreadCount: 2,
              last: {
                type: 'image',
                text: null,
                caption: 'Our line',
                direction: 'in',
                occurredAt: '2026-10-14T08:00:00.000Z',
              },
            },
          ],
          meta: { total: 1 },
        };
      if (path === 'whatsapp/conversations/c1/link' && method === 'POST')
        return {
          data: {
            ...conversation,
            contact: { ...customer, state: 'dismissed' },
          },
        };
      if (path.startsWith('whatsapp/conversations/c1'))
        return { data: conversation };
      return {};
    });

  it('lists the conversations with their state and opens one beside the list', async () => {
    respond();
    render(routes('/crm/whatsapp/c1?view=unlinked'));
    const list = await screen.findByRole('list');
    const row = within(list).getByRole('link', { name: /Ana Souza/ });
    expect(row.getAttribute('aria-current')).toBe('page');
    expect(row.getAttribute('href')).toBe('/crm/whatsapp/c1?view=unlinked');
    expect(within(row).getByText(crmEn.whatsapp.state.unlinked)).toBeTruthy();
    expect(within(row).getByText(crmEn.whatsapp.kind.image)).toBeTruthy();
    // The customer wrote last: it awaits a reply.
    expect(within(row).getByText(crmEn.whatsapp.awaiting)).toBeTruthy();
    // The conversation: its customer, and the way to link them; no New
    // lead without the right to create leads.
    expect(
      await screen.findByRole('heading', { name: 'Ana Souza' }),
    ).toBeTruthy();
    const link = screen.getByText(crmEn.whatsapp.link).closest('a');
    expect(link?.getAttribute('href')).toBe(
      '/crm/whatsapp/c1/link?view=unlinked',
    );
    expect(screen.queryByText(crmEn.whatsapp.newLead)).toBe(null);
    expect(screen.getByText('Message m1')).toBeTruthy();
    // The number's connection, from the page's header, for an administrator.
    expect(
      screen
        .getByText(crmEn.whatsapp.manageConnection)
        .closest('a')
        ?.getAttribute('href'),
    ).toBe('/crm/whatsapp/connection');
    expect(screen.getByText(crmEn.whatsapp.readOnlyNote)).toBeTruthy();
  });

  it('filters by number once there are two, naming each row’s number', async () => {
    const numbers = [
      { id: 'n1', phone: '+1 555 0100', name: 'Sales', mode: 'coexistence' },
      { id: 'n2', phone: '+44 7700 900123', name: 'Abroad', mode: 'api' },
    ];
    respond({ 'whatsapp/numbers': { data: numbers } });
    state.api.mockImplementation(
      ((base) => async (path: string, method?: string) =>
        path.startsWith('whatsapp/conversations?')
          ? {
              ...(await base(path, method)),
              data: (
                (await base(path, method)) as { data: { id: string }[] }
              ).data.map((row) => ({
                ...row,
                numberId: 'n2',
                number: numbers[1],
              })),
            }
          : base(path, method))(
        state.api.getMockImplementation() as (
          path: string,
          method?: string,
        ) => Promise<unknown>,
      ),
    );
    render(routes('/crm/whatsapp?view=all'));
    const list = await screen.findByRole('list');
    expect(await within(list).findByText('Abroad')).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: crmEn.whatsapp.numberFilter }),
    ).toBeTruthy();
    // Picked from the address: the list asks for that number's alone.
    render(routes('/crm/whatsapp?view=all&number=n2'));
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'whatsapp/conversations?view=all&numberId=n2&page=1&pageSize=50',
      ),
    );
  });

  it('sets a customer aside at once, and offers to restore them', async () => {
    const user = userEvent.setup();
    respond();
    render(routes('/crm/whatsapp/c1'));
    await user.click(
      await screen.findByRole('button', {
        name: 'Actions for Ana Souza',
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: crmEn.whatsapp.dismiss }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'whatsapp/conversations/c1/link',
        'POST',
        { state: 'dismissed' },
      ),
    );
    expect(
      await screen.findByRole('button', { name: crmEn.whatsapp.restore }),
    ).toBeTruthy();
    expect(screen.getByText(crmEn.whatsapp.setAside.dismissed)).toBeTruthy();
  });

  it('says what each empty view holds', async () => {
    respond({
      'whatsapp/conversations?view=all&page=1&pageSize=50': {
        data: [],
        meta: { total: 0 },
      },
    });
    // All by default, and for an old address naming the Mine there was.
    render(routes('/crm/whatsapp?view=mine'));
    expect(await screen.findByText(crmEn.whatsapp.empty.title)).toBeTruthy();
    expect(screen.getByText(crmEn.whatsapp.choose)).toBeTruthy();
  });
});

describe("a record's WhatsApp tab", () => {
  it('lists its people’s messages with their names, or says there are none', async () => {
    state.api.mockResolvedValueOnce({
      data: { messages: [], more: false, people: [] },
    });
    const { unmount } = render(
      wrap(<RecordWhatsAppPanel entity='leads' id='l1' />),
    );
    expect(await screen.findByText(crmEn.whatsapp.tabEmptyTitle)).toBeTruthy();
    unmount();
    state.api.mockResolvedValueOnce({
      data: {
        messages: [
          { ...message('m1', '2026-10-14T08:00:00.000Z'), waContactId: 'w1' },
          { ...message('m2', '2026-10-14T09:00:00.000Z'), waContactId: 'w2' },
        ],
        more: false,
        people: [
          { ...customer, id: 'w1', name: 'Ana Souza' },
          { ...customer, id: 'w2', name: 'Bruno Lima' },
        ],
      },
    });
    render(wrap(<RecordWhatsAppPanel entity='companies' id='co1' />));
    expect(
      await screen.findByText('Messages with Ana Souza and Bruno Lima'),
    ).toBeTruthy();
    // A company's tab names whose each run is.
    expect(screen.getByText('Bruno Lima')).toBeTruthy();
  });
});

describe('the connection settings', () => {
  const number = {
    id: 'n1',
    phoneNumberId: '1234567890',
    wabaId: null,
    mode: 'coexistence',
    displayPhone: '+1 555 0100',
    displayName: 'Sales',
    qualityRating: 'GREEN',
    status: 'CONNECTED',
    messagingLimit: null,
    hasAccessToken: true,
    connectedAt: null,
    lastWebhookAt: null,
    conversations: 3,
  };
  const connection = {
    configured: true,
    hasAppSecret: false,
    verifyToken: null,
    webhookPath: '/main/webhooks/whatsapp',
    secretsReady: true,
    numbers: [number],
    demoNumbers: [
      {
        ...number,
        id: 'd1',
        phoneNumberId: 'demo-d1',
        mode: 'demo',
        displayPhone: '+44 7700 900123',
        hasAccessToken: false,
        conversations: 2,
      },
    ],
  };
  const respond = () =>
    state.api.mockImplementation(async (path: string, method = 'GET') => {
      if (path === 'whatsapp/connection' && method === 'GET')
        return { data: connection };
      if (path === 'whatsapp/health')
        return {
          data: {
            received: 0,
            processed: 0,
            pending: 0,
            failed: 0,
            failures: [],
            mediaPending: 0,
            mediaUnavailable: 0,
          },
        };
      if (path === 'whatsapp/connection' && method === 'PUT')
        return {
          data: { ...connection, hasAppSecret: true, verifyToken: 'tok' },
        };
      if (path === 'whatsapp/numbers' && method === 'POST')
        return {
          data: {
            ...connection,
            numbers: [number, { ...number, id: 'n2', conversations: 0 }],
          },
        };
      return {};
    });
  const page = (path: string) =>
    render(
      wrap(
        <RouterProvider
          router={createMemoryRouter(
            [
              {
                path: '/crm/whatsapp/connection',
                element: <WhatsAppSettingsPage />,
                children: [
                  { path: 'numbers/new', element: <WhatsAppNumberDialog /> },
                ],
              },
            ],
            { initialEntries: [path] },
          )}
        />,
      ),
    );

  it('asks for the app secret until it is stored, and lists the numbers with their mode', async () => {
    const user = userEvent.setup();
    respond();
    page('/crm/whatsapp/connection');
    const save = await screen.findByRole('button', {
      name: crmEn.whatsappSettings.save,
    });
    expect(screen.getByText(crmEn.whatsappSettings.tokenLater)).toBeTruthy();
    // Nothing to do and nothing delivered yet: one line says so.
    expect(
      await screen.findByText(crmEn.whatsappSettings.noDeliveries),
    ).toBeTruthy();
    // The number, its mode; one holding conversations is not removed.
    expect(screen.getByText('+1 555 0100')).toBeTruthy();
    expect(
      // The company's, and the demo's, which behaves as coexistence does.
      screen.getAllByText(crmEn.whatsappSettings.modes.coexistence),
    ).toHaveLength(2);
    // The demo's number, read-only: no Check, Edit or Remove of its own.
    expect(screen.getByText('+44 7700 900123')).toBeTruthy();
    expect(screen.getByText(crmEn.whatsappSettings.demoHint)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: crmEn.remove })).toHaveLength(
      1,
    );
    expect(
      screen
        .getByText(crmEn.whatsappSettings.addNumber)
        .closest('a')
        ?.getAttribute('href'),
    ).toBe('/crm/whatsapp/connection/numbers/new');
    await user.click(screen.getByRole('button', { name: crmEn.remove }));
    expect(
      await screen.findByText(crmEn.whatsappSettings.removeInUse),
    ).toBeTruthy();
    const dialog = screen.getByRole('dialog');
    expect(
      (
        within(dialog).getByRole('button', {
          name: crmEn.remove,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.click(
      within(dialog).getByRole('button', { name: crmEn.cancel }),
    );
    await user.click(save);
    expect(
      await screen.findByText(crmEn.whatsappSettings.enterSecret),
    ).toBeTruthy();
    expect(document.activeElement?.id).toBe('crm-whatsapp-app-appSecret');
    await user.type(
      screen.getByLabelText(new RegExp(crmEn.whatsappSettings.appSecret)),
      'app-secret',
    );
    await user.click(save);
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith('whatsapp/connection', 'PUT', {
        appSecret: 'app-secret',
      }),
    );
    expect(
      await screen.findByText(
        `${window.location.origin}/main/webhooks/whatsapp`,
      ),
    ).toBeTruthy();
  });

  it('adds a number, coexistence by default, asking for its id and token', async () => {
    const user = userEvent.setup();
    respond();
    page('/crm/whatsapp/connection/numbers/new');
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', {
        name: crmEn.whatsappSettings.save,
      }),
    );
    expect(
      await within(dialog).findByText(crmEn.whatsappSettings.phoneInvalid),
    ).toBeTruthy();
    expect(
      within(dialog).getByText(crmEn.whatsappSettings.enterToken),
    ).toBeTruthy();
    expect(
      (
        within(dialog).getByRole('radio', {
          name: new RegExp(crmEn.whatsappSettings.modes.coexistence),
        }) as HTMLInputElement
      ).getAttribute('aria-checked'),
    ).toBe('true');
    await user.type(
      within(dialog).getByLabelText(
        new RegExp(crmEn.whatsappSettings.phoneNumberId),
      ),
      '2223334445',
    );
    await user.type(
      within(dialog).getByLabelText(
        new RegExp(crmEn.whatsappSettings.accessToken),
      ),
      'EAAG-token',
    );
    await user.click(
      within(dialog).getByRole('button', {
        name: crmEn.whatsappSettings.save,
      }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith('whatsapp/numbers', 'POST', {
        phoneNumberId: '2223334445',
        wabaId: null,
        mode: 'coexistence',
        accessToken: 'EAAG-token',
      }),
    );
  });
});
