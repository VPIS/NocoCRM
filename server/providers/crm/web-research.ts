import type { CrmModelService } from '../../config/ai.js';

// Asking Qwen with its web search on, for what the CRM looks up on the web:
// the company signals (company-signals.ts). The answer cites the pages it
// read as [ref_n], and the call returns those pages, so a link the CRM
// keeps is always one the search found, never one the model wrote (asked
// for links, it made up plausible ones).
//
// @temporary(nocobase-official) The Agents plugin's model gateway, through
// which every other model call goes (ai-model.ts), has no web search, and
// its Alibaba provider drops DashScope's `enable_search`; so this calls
// DashScope's own API with the key of the configured Qwen service
// (`ai.llmServices`, DASHSCOPE_API_KEY). Replace it once the gateway can
// search. Checklist: a search is a model call the gateway makes and
// records; its answer carries the pages it read with their titles and
// URLs; without a searching service the company signals stay off.

// DashScope's native API, China region, where the CRM's keys are. Only it
// returns the pages a search read; its OpenAI-compatible mode does not.
const ENDPOINT =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
// The model searched with, when the service offers it: fast, and asked
// without reasoning, which took minutes and no better answer.
const PREFERRED_MODEL = 'qwen3.8-flash';
// One search's limit; the probe took 10 to 20 seconds.
export const SEARCH_MS = 2 * 60_000;

export interface WebSearcher {
  // The configured service's name, as the usage table records it.
  readonly service: string;
  readonly model: string;
  readonly apiKey: string;
}

export interface WebPage {
  readonly index: number;
  readonly title: string;
  readonly url: string;
  readonly site: string;
}

export interface WebAnswer {
  readonly text: string;
  readonly pages: readonly WebPage[];
  readonly usage: { inputTokens: number; outputTokens: number };
}

// The Qwen service the configuration declares with a key, or null: then
// nothing searches.
export function webSearcher(
  services: Record<string, CrmModelService | undefined> | undefined,
): WebSearcher | null {
  for (const [name, service] of Object.entries(services ?? {})) {
    const apiKey = service?.options?.apiKey;
    if (
      service?.provider !== 'dashscope' ||
      service.enabled === false ||
      typeof apiKey !== 'string' ||
      !apiKey
    )
      continue;
    const models = (service.enabledModels ?? []).map((m) => m.value);
    return {
      service: name,
      model: models.includes(PREFERRED_MODEL)
        ? PREFERRED_MODEL
        : (models[0] ?? PREFERRED_MODEL),
      apiKey,
    };
  }
  return null;
}

export class WebSearchError extends Error {
  constructor(
    message: string,
    // Worth trying again on a later pass: a timeout, the provider busy or
    // failing. A refused key or request is not.
    public readonly transient: boolean,
  ) {
    super(message);
    this.name = 'WebSearchError';
  }
}

// One question answered from a fresh web search; with `search: false`, the
// same model asked without one (to reshape an answer it gave).
export async function searchWeb(
  searcher: WebSearcher,
  prompt: string,
  options: {
    signal?: AbortSignal;
    fetch?: typeof fetch;
    search?: boolean;
    // How to judge what is found (a method skill), sent as the system
    // message: the search is formed from the user's message, and a method
    // in it turned the search to the method's own words.
    system?: string;
  } = {},
): Promise<WebAnswer> {
  const search = options.search !== false;
  const call = options.fetch ?? fetch;
  let response: Response;
  try {
    response = await call(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${searcher.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: searcher.model,
        input: {
          messages: [
            ...(options.system
              ? [{ role: 'system', content: [{ text: options.system }] }]
              : []),
            { role: 'user', content: [{ text: prompt }] },
          ],
        },
        parameters: {
          result_format: 'message',
          enable_thinking: false,
          enable_search: search,
          ...(search
            ? {
                search_options: {
                  forced_search: true,
                  enable_source: true,
                  enable_citation: true,
                  citation_format: '[ref_<number>]',
                  search_strategy: 'max',
                },
              }
            : {}),
        },
      }),
      signal: options.signal ?? AbortSignal.timeout(SEARCH_MS),
    });
  } catch (error) {
    throw new WebSearchError(
      error instanceof Error ? error.message : String(error),
      true,
    );
  }
  const body = (await response.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
    output?: {
      choices?: { message?: { content?: unknown } }[];
      search_info?: { search_results?: Record<string, unknown>[] };
    };
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  if (!response.ok)
    throw new WebSearchError(
      `${response.status} ${body.code ?? ''} ${body.message ?? ''}`.trim(),
      response.status === 429 || response.status >= 500,
    );
  const content = body.output?.choices?.[0]?.message?.content;
  const text = Array.isArray(content)
    ? content
        .map((part) =>
          typeof (part as { text?: unknown }).text === 'string'
            ? (part as { text: string }).text
            : '',
        )
        .join('')
    : typeof content === 'string'
      ? content
      : '';
  const pages: WebPage[] = [];
  for (const page of body.output?.search_info?.search_results ?? []) {
    const url = typeof page.url === 'string' ? page.url : '';
    if (!/^https?:\/\//i.test(url) || !Number.isInteger(page.index)) continue;
    pages.push({
      index: page.index as number,
      title: typeof page.title === 'string' ? page.title : url,
      url,
      site: typeof page.site_name === 'string' ? page.site_name : '',
    });
  }
  return {
    text,
    pages,
    usage: {
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0,
    },
  };
}
