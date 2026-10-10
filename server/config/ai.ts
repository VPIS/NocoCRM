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
  // The CRM's three services, so a deployment supplies only their keys
  // through the environment variables below (a hosting platform's variables
  // page, NocoBase Studio's included); config.yml may still change or add
  // services. One left without a key is not created.
  defaults: {
    llmServices: {
      qwen: {
        title: 'Qwen',
        provider: 'dashscope',
        enabledModels: [
          { label: 'Qwen3.8-Max', value: 'qwen3.8-max' },
          { label: 'Qwen3.8-Flash', value: 'qwen3.8-flash' },
          { label: 'Qwen3.7-Plus', value: 'qwen3.7-plus' },
        ],
        enabled: true,
        sort: 5,
      },
      openai: {
        title: 'OpenAI',
        provider: 'openai',
        enabledModels: [
          { label: 'GPT-6 Astra', value: 'gpt-6-astra' },
          { label: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
          { label: 'GPT-5.6 Luna', value: 'gpt-5.6-luna' },
          { label: 'GPT-5.5', value: 'gpt-5.5' },
        ],
        enabled: true,
        sort: 10,
      },
      deepseek: {
        title: 'DeepSeek',
        provider: 'deepseek',
        enabledModels: [
          { label: 'DeepSeek-V4.1-Flash', value: 'deepseek-flash' },
        ],
        enabled: true,
        sort: 20,
      },
    },
  },
  // The CRM's services in config.yml (qwen, openai, deepseek) take their
  // keys from the environment (.env.local in development). Each is optional:
  // a service without its key is left out, and the AI is off without any
  // (crm-agents/model-services.ts), so a deployment platform such as
  // NocoBase Studio must not hold a release back for them.
  env: {
    DASHSCOPE_API_KEY: envString('llmServices.qwen.options.apiKey', {
      description: "The Qwen (DashScope) model service's API key.",
      secret: true,
      required: false,
    }),
    OPENAI_API_KEY: envString('llmServices.openai.options.apiKey', {
      description: "The OpenAI model service's API key.",
      secret: true,
      required: false,
    }),
    OPENAI_BASE_URL: envString('llmServices.openai.options.baseURL', {
      description: "The OpenAI model service's base URL.",
      required: false,
    }),
    DEEPSEEK_API_KEY: envString('llmServices.deepseek.options.apiKey', {
      description: "The DeepSeek model service's API key.",
      secret: true,
      required: false,
    }),
  },
});

export default ai;
