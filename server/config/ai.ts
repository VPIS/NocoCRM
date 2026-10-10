import {
  defineAppConfig,
  envString,
  type AppConfigFactory,
} from '@nocobase/app-server/config';

// A model service as config.yml declares it under `ai.llmServices`, keyed by
// its name.
export interface CrmModelService {
  title?: string;
  provider?: string;
  enabled?: boolean;
  sort?: number;
  options?: Record<string, unknown>;
  enabledModels?: { value: string; label?: string }[];
}

export interface CrmAiConfig {
  llmServices: Record<string, CrmModelService>;
}

/**
 * The model services a deployment configures for the CRM's AI, which
 * server/providers/crm-agents/model-services.ts creates on the Agents
 * plugin's Models page at start when they are not there yet. Application
 * section: the AI Employee plugin that once owned `ai` is gone, and the
 * Agents plugin reads its services only from that page.
 */
const ai: AppConfigFactory<CrmAiConfig> = defineAppConfig({
  defaults: { llmServices: {} },
  // The CRM's services in config.yml (qwen, openai, deepseek) take their
  // keys from the environment (.env.local in development).
  env: {
    DASHSCOPE_API_KEY: envString('llmServices.qwen.options.apiKey', {
      description: "The Qwen (DashScope) model service's API key.",
      secret: true,
    }),
    OPENAI_API_KEY: envString('llmServices.openai.options.apiKey', {
      description: "The OpenAI model service's API key.",
      secret: true,
    }),
    OPENAI_BASE_URL: envString('llmServices.openai.options.baseURL', {
      description: "The OpenAI model service's base URL.",
    }),
    DEEPSEEK_API_KEY: envString('llmServices.deepseek.options.apiKey', {
      description: "The DeepSeek model service's API key.",
      secret: true,
    }),
  },
});

export default ai;
