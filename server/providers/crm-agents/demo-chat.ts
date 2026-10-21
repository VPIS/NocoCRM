import { wrapLanguageModel } from 'ai';
import type { Application } from '@nocobase/app-server/application';
import { ApiError } from '@nocobase/app-server/router';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import {
  demoConfigurationToken,
  demoDataToken,
} from '@nocobase/app-plugin-demo-mode/server/tokens';

// Adapter for the installed Agents online API. Keep the plugin and its tables untouched:
// decorate public conversation operations, preserving their ownership and invocation checks.
export function installDemoChat(app: Application): void {
  const configuration = app.container.resolve(demoConfigurationToken);
  if (!configuration.enabled) return;
  const agents = app.container.resolve(agentsToken);
  const conversations = agents.conversations;
  const unavailable = () =>
    new ApiError({
      status: 'FAILED_PRECONDITION',
      reason: 'DEMO_CHAT_UNAVAILABLE',
      domain: 'demoMode',
      message: 'Demo chat supports online agents and text messages only.',
    });
  const simulated = () => {
    const name = app.container.resolve(demoDataToken).models.serviceName;
    if (!name) throw unavailable();
    return { modelService: name, model: 'demo-chat' };
  };
  const checkAgent = async (userId: string, requested?: string) => {
    const id =
      requested ??
      (await agents.chat.preferences(userId)).defaultAgentId ??
      (await agents.chat.settings()).defaultAgentId;
    if (!id) throw unavailable();
    const agent = await agents.agents.get(id);
    if (
      agent.type !== 'online' ||
      agent.archivedAt ||
      !agents.agents.mayInvoke(agent, userId)
    )
      throw unavailable();
    await configuration.chatModel(simulated());
    return id;
  };
  const checkConversation = async (userId: string, id: string) => {
    const conversation = await conversations.get(userId, id);
    if (conversation.mode !== 'online') throw unavailable();
    await checkAgent(userId, conversation.agent.id);
  };
  const create = conversations.create.bind(conversations);
  conversations.create = async (userId, request) => {
    const agentId = await checkAgent(userId, request.agentId);
    return configuration.runLegacyOnlineConversation(() =>
      create(userId, { ...request, agentId }),
    );
  };
  const send = conversations.send.bind(conversations);
  conversations.send = async (userId, id, request) => {
    await checkConversation(userId, id);
    if (request.attachmentIds?.length) throw unavailable();
    return configuration.runLegacyOnlineConversation(() =>
      send(userId, id, request),
    );
  };
  // The legacy start() calls an internal sendMessage rather than public send().
  const start = conversations.start.bind(conversations);
  conversations.start = async (userId, request) => {
    const agentId = await checkAgent(userId, request.agentId);
    return configuration.runLegacyOnlineConversation(() =>
      start(userId, { ...request, agentId }),
    );
  };
  for (const name of ['markRead', 'stop'] as const) {
    const original = conversations[name].bind(conversations);
    conversations[name] = async (userId, id) => {
      await checkConversation(userId, id);
      return configuration.runLegacyOnlineConversation(() =>
        original(userId, id),
      );
    };
  }
  const update = conversations.update.bind(conversations);
  conversations.update = async (userId, id, patch) => {
    await checkConversation(userId, id);
    return configuration.runLegacyOnlineConversation(() =>
      update(userId, id, patch),
    );
  };

  // Session-bearing calls belong to the online executor; background CRM generation has no session.
  // Resolve policy at every model step, not once when the worker dequeues the run.
  // Removing a tool from model metadata is not an authorization check.
  agents.consultations.start = async () => {
    throw unavailable();
  };
  const languageModel = agents.online.gateway.languageModel.bind(
    agents.online.gateway,
  );
  agents.online.gateway.languageModel = async (_ref, options) => {
    if (!options?.session) return languageModel(simulated(), options);
    const selected = (await configuration.chatModel(simulated()))!;
    const model = await languageModel(selected, options);
    if (typeof model === 'string') throw unavailable();
    return wrapLanguageModel({
      model,
      middleware: {
        specificationVersion: 'v4',
        async transformParams({ params }) {
          const current = await configuration.chatModel(simulated());
          if (
            current?.modelService !== selected.modelService ||
            current?.model !== selected.model
          )
            throw unavailable();
          // Only the sandbox shell and local skill reader are exposed. Business commands still
          // pass CRM authorization and runChatTool; consultations and other tools stay unavailable.
          return {
            ...params,
            tools: params.tools?.filter(
              (tool) =>
                tool.type === 'function' &&
                ['bash', 'skill'].includes(tool.name),
            ),
          };
        },
      },
    });
  };
}
