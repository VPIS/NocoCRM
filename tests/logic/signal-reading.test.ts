// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  dayBefore,
  eventKey,
  readSignals,
  signalQuestion,
} from '../../server/providers/crm/signal-reading.js';
import { webSearcher } from '../../server/providers/crm/web-research.js';

// The company signals' reading of a web search's answer
// (server/providers/crm/signal-reading.ts): only events that cite the
// search's own pages, happened on a real day within the last 30 days and
// are of a tracked kind are kept, their links taken from those pages.

const pages = [
  {
    index: 1,
    title: 'Acme raises Series B',
    url: 'https://news.example.cn/acme-b',
    site: 'Example News',
  },
  {
    index: 2,
    title: 'Acme names a new CTO',
    url: 'https://tech.example.cn/acme-cto',
    site: 'Example Tech',
  },
];
const answer = (events: unknown[], text?: string) => ({
  text: text ?? `\`\`\`json\n${JSON.stringify({ events })}\n\`\`\``,
  pages,
  usage: { inputTokens: 3000, outputTokens: 400 },
});
const TODAY = '2026-10-14';

describe('reading company signals', () => {
  it('keeps sourced events within the window, linking the search pages, newest first', () => {
    const result = readSignals(
      answer([
        {
          type: 'funding',
          title: 'Acme raised a Series B of 200 million yuan.',
          summary: 'Led by Example Capital.',
          date: '2026-10-02',
          refs: [1],
        },
        {
          type: 'leadership',
          title: 'Acme appointed a new CTO.',
          date: '2026-10-10',
          refs: [2, 2, 9],
        },
      ]),
      TODAY,
      new Set(),
    );
    expect(result.unreadable).toBe(false);
    expect(result.signals.map((s) => s.type)).toEqual([
      'leadership',
      'funding',
    ]);
    expect(result.signals[0]!.sources).toEqual([
      {
        title: 'Acme names a new CTO',
        url: 'https://tech.example.cn/acme-cto',
        site: 'Example Tech',
      },
    ]);
    expect(result.signals[1]!.summary).toBe('Led by Example Capital.');
  });

  it('drops events without a search page, outside the window, undated or of another kind', () => {
    const result = readSignals(
      answer([
        // A link the model made up is not a source.
        { type: 'funding', title: 'Made up', date: '2026-10-01', refs: [] },
        { type: 'business', title: 'Wrong ref', date: '2026-10-01', refs: [7] },
        { type: 'business', title: 'Too old', date: '2026-08-01', refs: [1] },
        { type: 'business', title: 'Future', date: '2026-11-01', refs: [1] },
        { type: 'risk', title: 'No date', date: 'last week', refs: [1] },
        { type: 'award', title: 'An award', date: '2026-10-01', refs: [1] },
      ]),
      TODAY,
      new Set(),
    );
    expect(result.signals).toEqual([]);
    expect(result.dropped.map((d) => d.reason)).toEqual([
      'sources',
      'sources',
      'window',
      'window',
      'date',
      'type',
    ]);
  });

  it('does not keep an event already known, nor the same event twice', () => {
    const known = eventKey('funding', '2026-10-02', 'Acme raised a Series B.');
    const result = readSignals(
      answer([
        {
          type: 'funding',
          title: 'Acme raised a Series B.',
          date: '2026-10-02',
          refs: [1],
        },
        {
          type: 'leadership',
          title: 'Acme appointed a new CTO',
          date: '2026-10-10',
          refs: [2],
        },
        {
          type: 'leadership',
          title: 'Acme appointed a new CTO!',
          date: '2026-10-11',
          refs: [2],
        },
      ]),
      TODAY,
      new Set([known]),
    );
    expect(result.signals.map((s) => s.title)).toEqual([
      'Acme appointed a new CTO',
    ]);
    expect(result.dropped.map((d) => d.reason)).toEqual(['known', 'known']);
  });

  it('reports an answer without JSON as unreadable', () => {
    expect(
      readSignals(answer([], 'Acme had a busy month.'), TODAY, new Set())
        .unreadable,
    ).toBe(true);
  });

  it('asks about the window, the kinds of event and what is already known', () => {
    expect(dayBefore(TODAY, 30)).toBe('2026-09-14');
    const question = signalQuestion(
      { name: 'Acme', website: 'acme.cn', city: 'Hangzhou' },
      TODAY,
      ['Acme raised a Series B.'],
      true,
    );
    expect(question).toContain('"Acme" (website acme.cn, based in Hangzhou)');
    expect(question).toContain('from 2026-09-14 to 2026-10-14');
    expect(question).toContain('"Acme raised a Series B."');
    expect(question).toContain('Simplified Chinese');
    expect(question).toContain('Never write a URL');
    // With the method (the company-signals skill) as the system message,
    // the question keeps the rules and leaves what to omit to it.
    const guided = signalQuestion({ name: 'Acme' }, TODAY, [], false, true);
    expect(guided).toContain('funding, hiring, leadership, business, risk');
    expect(guided).toContain('cite the pages that state it as [ref_n]');
    expect(guided).not.toContain('Leave out routine news');
    expect(question).toContain('Leave out routine news');
  });

  it('searches with the configured Qwen service that has a key, its fast model first', () => {
    expect(
      webSearcher({
        openai: { provider: 'openai', options: { apiKey: 'x' } },
        qwen: {
          provider: 'dashscope',
          options: { apiKey: 'key' },
          enabledModels: [{ value: 'qwen3.8-max' }, { value: 'qwen3.8-flash' }],
        },
      }),
    ).toEqual({ service: 'qwen', model: 'qwen3.8-flash', apiKey: 'key' });
    expect(
      webSearcher({ qwen: { provider: 'dashscope', options: {} } }),
    ).toBeNull();
    expect(webSearcher(undefined)).toBeNull();
  });
});
