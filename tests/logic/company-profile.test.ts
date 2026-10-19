// @vitest-environment node
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import {
  PROFILE_URL_FIELDS,
  profileQuestion,
  readProfile,
} from '../../server/providers/crm/company-profile.js';
import {
  citePages,
  searchWeb,
  type WebSearcher,
} from '../../server/providers/crm/web-research.js';

// New company with the AI (server/providers/crm/company-profile.ts) asked
// through the model gateway: the answer's JSON names the company's website
// and LinkedIn page by URL, and those stay the form's values even when the
// search read the same pages, while the URLs in its "sources" become the
// pages it cites.

const searcher = (model: MockLanguageModelV4): WebSearcher => ({
  kind: 'gateway',
  service: 'svc',
  model: 'm',
  provider: 'openai',
  languageModel: () => Promise.resolve(model),
});

const answer = (text: string, sources: { url: string; title: string }[]) =>
  new MockLanguageModelV4({
    doGenerate: {
      content: [
        { type: 'text', text },
        ...sources.map((source, i) => ({
          type: 'source' as const,
          sourceType: 'url' as const,
          id: String(i),
          ...source,
        })),
      ],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: {
        inputTokens: { total: 12, noCache: 12, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      warnings: [],
    },
  });

describe('a company profile searched through the model gateway', () => {
  it('keeps the website and LinkedIn page and cites the pages in its sources', async () => {
    const model = answer(
      JSON.stringify({
        name: 'Acme',
        website: 'https://www.acme.example/',
        linkedin: 'https://www.linkedin.com/company/acme',
        industry: null,
        description: 'Makes anvils, see https://made-up.example/anvils.',
        uncertain: [],
        sources: [
          'https://www.acme.example/about?utm_source=openai',
          'https://news.example/acme',
          'https://made-up.example/x',
        ],
      }),
      [
        { url: 'https://www.acme.example/', title: 'Acme' },
        { url: 'https://www.acme.example/about', title: 'About Acme' },
        { url: 'https://news.example/acme', title: 'Acme in the news' },
      ],
    );
    const result = await searchWeb(
      searcher(model),
      profileQuestion({ name: 'Acme', note: '' }, false, 'urls'),
      { urlFields: PROFILE_URL_FIELDS },
    );
    const profile = readProfile(result);
    expect(profile?.input).toEqual({
      name: 'Acme',
      website: 'https://www.acme.example/',
      linkedin: 'https://www.linkedin.com/company/acme',
      description: 'Makes anvils, see',
    });
    expect(profile?.sources).toEqual([
      {
        title: 'About Acme',
        url: 'https://www.acme.example/about',
        site: 'acme.example',
      },
      {
        title: 'Acme in the news',
        url: 'https://news.example/acme',
        site: 'news.example',
      },
    ]);
  });

  it('ends a URL at a double quote, so JSON around it stays JSON', () => {
    const { text } = citePages(
      '{"website":"https://a.example/","sources":["https://a.example","https://b.example/x"]}',
      [{ url: 'https://a.example/' }],
    );
    expect(JSON.parse(text)).toEqual({
      website: '[ref_1]',
      sources: ['[ref_1]', ''],
    });
  });

  it('leaves the named fields as written, however they are spaced', () => {
    const { text } = citePages(
      '{\n  "website" : "https://a.example/",\n  "note": "https://a.example/"\n}',
      [{ url: 'https://a.example/' }],
      ['website'],
    );
    expect(JSON.parse(text)).toEqual({
      website: 'https://a.example/',
      note: '[ref_1]',
    });
  });
});
