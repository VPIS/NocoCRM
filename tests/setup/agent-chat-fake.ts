/* eslint-disable @eslint-react/no-unnecessary-use-prefix -- stand-ins for
   the plugin's hooks, named as the hooks they replace */
// A stand-in for the Agents plugin's headless chat
// (`@nocobase/app-plugin-agents/client/chat`) in component tests: the agents
// on offer, the panel's state, and what the CRM asked of the chat
// (conversations created, messages sent, the panel opened, pins). A test
// mocks the module with a factory returning `fakeChatModule` of the
// original module, and reads and resets `chatFake`.

type Row = Record<string, unknown>;

export const MODELS = [
  {
    modelService: 'qwen',
    model: 'qwen-max',
    serviceTitle: 'Qwen',
    modelLabel: 'Qwen Max',
  },
  {
    modelService: 'openai',
    model: 'gpt-5',
    serviceTitle: 'OpenAI',
    modelLabel: 'GPT 5',
  },
];

export const AI_AGENT = {
  id: 'noco',
  name: 'AI',
  description: 'CRM assistant',
  nameText: null,
  descriptionText: null,
  avatar: null,
  type: 'online' as const,
  models: MODELS,
  personal: false,
  isSystemDefault: true,
  isMyDefault: false,
  availability: { online: true, reason: null, onlineRunners: 1 },
  fallbackAgentId: null,
};

export const chatFake = {
  loading: false,
  agents: [AI_AGENT] as Row[],
  open: false,
  conversationId: null as string | null,
  view: 'chat' as 'chat' | 'history',
  pinned: [] as Row[],
  draft: null as { text: string; nonce: number } | null,
  created: [] as Row[],
  sent: [] as Row[],
  opened: [] as Row[],
  cleared: 0,
  focused: 0,
  sendFails: false,
  // The person's conversations, newest first, and those archived.
  conversations: [] as { id: string; title: string | null; read: boolean }[],
  listFails: false,
  archived: [] as string[],
  reset(): void {
    this.loading = false;
    this.agents = [AI_AGENT];
    this.open = false;
    this.conversationId = null;
    this.view = 'chat';
    this.pinned = [];
    this.draft = null;
    this.created = [];
    this.sent = [];
    this.opened = [];
    this.cleared = 0;
    this.focused = 0;
    this.sendFails = false;
    this.conversations = [];
    this.listFails = false;
    this.archived = [];
  },
};

const api = {
  createConversation: (request: Row) => {
    chatFake.created.push(request);
    return Promise.resolve({ id: `c${String(chatFake.created.length)}` });
  },
  sendMessage: (id: string, request: Row) => {
    if (chatFake.sendFails) return Promise.reject(new Error('down'));
    chatFake.sent.push({ conversationId: id, ...request });
    return Promise.resolve({});
  },
};

const attachments = {
  upload: (file: File) =>
    Promise.resolve({
      id: `f-${file.name}`,
      filename: file.name,
      ext: '',
      mimeType: file.type,
      size: file.size,
      contentUrl: '',
      downloadUrl: '',
      previewable: false,
    }),
  discard: () => undefined,
};

const sources = {
  items: [],
  filter: null,
  selection: null,
  removed: new Set<string>(),
  registerItem: () => () => undefined,
  registerFilter: () => () => undefined,
  remove: () => undefined,
};

function panel() {
  return {
    available: true,
    open: chatFake.open,
    mode: 'docked',
    view: chatFake.view,
    conversationId: chatFake.conversationId,
    newAgentId: null,
    pinned: chatFake.pinned,
    draft: chatFake.draft,
    source: 'panel',
    openChat: (options: Row = {}) => {
      chatFake.opened.push(options);
      if (options.pin)
        chatFake.pinned = [...chatFake.pinned, options.pin as Row];
    },
    closeChat: () => undefined,
    toggleChat: () => undefined,
    setMode: () => undefined,
    setView: () => undefined,
    selectConversation: (id: string | null) =>
      chatFake.opened.push({ conversationId: id }),
    clearPinned: () => {
      chatFake.cleared += 1;
      chatFake.pinned = [];
    },
    resetSource: () => undefined,
    registerComposer: () => () => undefined,
    focusComposer: () => {
      chatFake.focused += 1;
    },
    openPage: null,
    conversationPath: null,
  };
}

export function fakeChatModule(actual: Row): Row {
  return {
    ...actual,
    useChatAgents: () => ({
      data: chatFake.loading ? undefined : chatFake.agents,
      isLoading: chatFake.loading,
      error: null,
    }),
    useChatApi: () => api,
    useChatAttachments: () => attachments,
    useChatSources: () => sources,
    useChatPanel: panel,
    useConversationList: () => ({
      data: chatFake.listFails
        ? undefined
        : {
            pages: [{ items: chatFake.conversations, nextCursor: null }],
            pageParams: [null],
          },
      isLoading: false,
      isError: chatFake.listFails,
      isFetching: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: () => undefined,
      refetch: () => Promise.resolve(),
    }),
    useConversationActions: () => ({
      archive: {
        isPending: false,
        mutate: (
          input: { id: string; archived: boolean },
          options?: { onSuccess?: () => void },
        ) => {
          chatFake.archived.push(input.id);
          chatFake.conversations = chatFake.conversations.filter(
            (item) => item.id !== input.id,
          );
          options?.onSuccess?.();
        },
      },
      markRead: () => undefined,
    }),
  };
}
