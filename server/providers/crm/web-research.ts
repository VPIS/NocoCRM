import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import {
  APICallError,
  generateText,
  type LanguageModel,
  type ToolSet,
} from 'ai';

// Asking a model with its web search on, for what the CRM looks up on the
// web: the company signals (company-signals.ts), with the model their agent
// was given, whichever it is. The pages a search read come back with the
// answer, and a link the CRM keeps is always one of them, never one the
// model wrote (asked for links, it made up plausible ones).
//
// Two ways to search:
// - Qwen through DashScope's own API, which cites the pages it read as
//   [ref_n] and returns them numbered. @temporary(nocobase-official) The
//   Agents plugin's Alibaba provider drops DashScope's `enable_search`, so
//   this calls DashScope with the key of the configured Qwen service
//   (`ai.llmServices`, DASHSCOPE_API_KEY).
// - Any other model through the Agents plugin's model gateway, with its
//   provider's own search tool (OpenAI's, Anthropic's, Google's). Those
//   return the pages they read but number nothing, so the question asks
//   for each event's page URLs (`citesUrls`), and the answer's URLs that
//   are among the pages become [ref_n] marks here; any other URL is
//   dropped. A model whose provider has no search tool is still asked, and
//   its check fails saying so.

// DashScope's native API, China region, where the CRM's keys are. Only it
// returns the pages a search read; its OpenAI-compatible mode does not.
const ENDPOINT =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
// One search's limit; the probe took 10 to 20 seconds.
export const SEARCH_MS = 2 * 60_000;

export type WebSearcher =
  | {
      readonly kind: 'dashscope';
      // The configured service's name, as the usage table records it.
      readonly service: string;
      readonly model: string;
      readonly apiKey: string;
    }
  | {
      readonly kind: 'gateway';
      readonly service: string;
      readonly model: string;
      // The model service's provider, as the Agents plugin names it.
      readonly provider: string;
      readonly languageModel: () => Promise<LanguageModel>;
    };

// Whether the searcher's answers cite pages by URL rather than as [ref_n]:
// the question asks for URLs then (signal-reading.ts).
export function citesUrls(searcher: WebSearcher): boolean {
  return searcher.kind === 'gateway';
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
  if (searcher.kind === 'gateway')
    return searchThroughGateway(searcher, prompt, options);
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

// A provider's own web search, as a tool for the gateway's model; none
// for a provider without one.
function searchTool(provider: string): ToolSet | undefined {
  switch (provider) {
    case 'openai':
      return { web_search: openai.tools.webSearch({}) };
    case 'anthropic':
      return { web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }) };
    case 'google':
      return { google_search: google.tools.googleSearch({}) };
    default:
      return undefined;
  }
}

// A page's address as two answers name it alike: no fragment, no tracking
// parameters, no trailing slash.
function pageKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const name of [...parsed.searchParams.keys()])
      if (name.startsWith('utm_')) parsed.searchParams.delete(name);
    return parsed.toString().replace(/\/$/u, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

// The answer's URLs as [ref_n] marks naming the pages the search read,
// numbered from 1 in the order it returned them; a URL among none of them
// is dropped, with the angle brackets or parentheses around it.
export function citePages(
  text: string,
  sources: readonly { url: string; title?: string | undefined }[],
): { text: string; pages: WebPage[] } {
  const pages: WebPage[] = [];
  const byKey = new Map<string, WebPage>();
  for (const source of sources) {
    if (!/^https?:\/\//iu.test(source.url)) continue;
    const key = pageKey(source.url);
    if (byKey.has(key)) continue;
    const page: WebPage = {
      index: pages.length + 1,
      title: source.title?.trim() || source.url,
      url: source.url,
      site: (() => {
        try {
          return new URL(source.url).hostname.replace(/^www\./u, '');
        } catch {
          return '';
        }
      })(),
    };
    pages.push(page);
    byKey.set(key, page);
  }
  const cited = text.replace(
    /[<([]?(https?:\/\/[^\s<>()\]]+)[>)\]]?/giu,
    (_whole, url: string) => {
      const page = byKey.get(pageKey(url.replace(/[.,;:]+$/u, '')));
      return page ? `[ref_${String(page.index)}]` : '';
    },
  );
  return { text: cited, pages };
}

async function searchThroughGateway(
  searcher: Extract<WebSearcher, { kind: 'gateway' }>,
  prompt: string,
  options: { signal?: AbortSignal; search?: boolean; system?: string },
): Promise<WebAnswer> {
  const search = options.search !== false;
  const tools = search ? searchTool(searcher.provider) : undefined;
  if (search && !tools)
    throw new WebSearchError(
      `The model ${searcher.model} cannot search the web: its provider (${searcher.provider}) has no web search.`,
      false,
    );
  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
      model: await searcher.languageModel(),
      ...(options.system ? { system: options.system } : {}),
      prompt,
      ...(tools ? { tools } : {}),
      maxOutputTokens: 8_000,
      maxRetries: 1,
      abortSignal: options.signal ?? AbortSignal.timeout(SEARCH_MS),
    });
  } catch (error) {
    const status = APICallError.isInstance(error)
      ? error.statusCode
      : undefined;
    throw new WebSearchError(
      error instanceof Error ? error.message : String(error),
      status === undefined || status === 429 || status >= 500,
    );
  }
  const sources = result.sources.flatMap((source) =>
    source.sourceType === 'url'
      ? [{ url: source.url, title: source.title }]
      : [],
  );
  const { text, pages } = search
    ? citePages(result.text, sources)
    : { text: result.text, pages: [] };
  return {
    text,
    pages,
    usage: {
      inputTokens: result.totalUsage.inputTokens ?? 0,
      outputTokens: result.totalUsage.outputTokens ?? 0,
    },
  };
}
