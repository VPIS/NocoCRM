import { z } from 'zod';
import { jsonIn } from './ai-model.js';
import type { WebAnswer, WebPage } from './web-research.js';

// Reading a company's news into signals (company-signals.ts): the question
// asked with the web search on, and what of the answer is kept. A signal is
// kept only when it cites pages the search returned, happened on a real day
// within the window and is of a kind the CRM tracks; its links are those
// pages, never one the model wrote. Pure, so the rules are tested without a
// model.

export const SIGNAL_TYPES = [
  'funding',
  'hiring',
  'leadership',
  'business',
  'risk',
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

// How far back an event may lie to be news.
export const SIGNAL_WINDOW_DAYS = 30;
const DAY = 86_400_000;

export interface SignalSource {
  title: string;
  url: string;
  site: string;
}

export interface FoundSignal {
  type: SignalType;
  title: string;
  summary: string;
  occurredOn: string;
  sources: SignalSource[];
  eventKey: string;
}

export interface CompanyFacts {
  name: string;
  website?: string | null;
  industry?: string | null;
  city?: string | null;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// The day `days` before `today` (YYYY-MM-DD, UTC).
export function dayBefore(today: string, days: number): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) - days * DAY)
    .toISOString()
    .slice(0, 10);
}

// The question: the company as the CRM knows it, the window, the events
// already known, and the rules the reading holds the answer to whatever the
// method says: only the five kinds, cited pages, real days, the JSON shape.
// In the AI's language, the language its titles come back in. The method
// (the company-signals skill, ai/skills, which an administrator may edit:
// what counts and what to leave out) goes beside it as the system message
// (company-signals.ts), never in it: the search is formed from this
// question, and a method in it turned the search to the method's words.
// Without one (`guided` false), the question says what to leave out. A
// model that cites by URL (`urls`, web-research.ts's gateway search) is
// asked for a report naming each event's pages, which its URLs then mark
// as [ref_n] and a second, unsearched ask puts into the JSON.
export function signalQuestion(
  company: CompanyFacts,
  today: string,
  known: readonly string[],
  chinese: boolean,
  guided = false,
  cite: 'refs' | 'urls' = 'refs',
): string {
  const since = dayBefore(today, SIGNAL_WINDOW_DAYS);
  const facts = [
    company.website ? `website ${company.website}` : '',
    company.industry ? `industry ${company.industry}` : '',
    company.city ? `based in ${company.city}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  return [
    `Today is ${today}. Search the web for what happened to the company "${company.name}"${facts ? ` (${facts})` : ''} from ${since} to ${today}.`,
    `Report only events of these kinds, the ones a salesperson selling to this company would act on: ${SIGNAL_TYPES.join(', ')}.`,
    guided
      ? ''
      : 'Leave out routine news: monthly sales or delivery figures, share price moves, awards, rankings, speeches, marketing campaigns, events about other companies with a similar name.',
    cite === 'urls'
      ? 'Every event must come from the search results: after each event, write the full URL of every page you found that states it, in angle brackets. Give the date the event happened, not the date of the article, and leave out events before the window or without a date. When nothing qualifies, say so.'
      : 'Every event must come from the search results: cite the pages that state it as [ref_n] in its "refs" (the numbers only). Give the date the event happened, not the date of the article, and leave out events before the window or without a date. Never write a URL. When nothing qualifies, return an empty list.',
    known.length
      ? `Already known, do not report again: ${known.map((k) => `"${k}"`).join('; ')}.`
      : '',
    `Write "title" (one sentence) and "summary" (at most two sentences) in ${chinese ? 'Simplified Chinese' : 'English'}.`,
    cite === 'urls'
      ? 'Answer as a short report, one paragraph per event, giving its kind (funding, hiring, leadership, business or risk), its date (YYYY-MM-DD), its title and its summary.'
      : 'Return only one JSON object: {"events":[{"type":"funding|hiring|leadership|business|risk","title":"...","summary":"...","date":"YYYY-MM-DD","refs":[1]}]}',
  ]
    .filter(Boolean)
    .join('\n');
}

const answerShape = z.preprocess(
  // A bare list of events, as the model sometimes answers, is the list.
  (value) => (Array.isArray(value) ? { events: value } : value),
  z.object({
    events: z
      .array(
        z.object({
          type: z.string(),
          title: z.string(),
          summary: z.string().optional().default(''),
          date: z.string(),
          refs: z.array(z.coerce.number()).default([]),
        }),
      )
      .default([]),
  }),
);

// When the searched answer came back as prose: asked without searching, to
// put the same events into the JSON the reading takes, keeping each one's
// [ref_n] marks, which still name the first answer's pages.
export function signalJsonQuestion(prose: string): string {
  return [
    'Below is a report of events about a company, citing its sources as [ref_n].',
    'Put the events it reports into one JSON object and return nothing else: {"events":[{"type":"funding|hiring|leadership|business|risk","title":"...","summary":"...","date":"YYYY-MM-DD","refs":[1]}]}',
    "Keep the wording's language, take each event's refs from the [ref_n] marks beside it (the numbers only), and leave out an event with no date or no ref. Add nothing the report does not say.",
    '',
    prose.slice(0, 12_000),
  ].join('\n');
}

// A key that is the same for the same event worded differently: its kind,
// its month and its title without spaces or punctuation, cut short.
export function eventKey(type: string, occurredOn: string, title: string) {
  const words = title
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .slice(0, 40);
  return `${type}:${occurredOn.slice(0, 7)}:${words}`.slice(0, 200);
}

export interface ReadResult {
  signals: FoundSignal[];
  // Events the answer gave that were not kept, and why: for the run's log.
  dropped: { title: string; reason: string }[];
  // The answer held no readable JSON.
  unreadable: boolean;
}

// The answer's events that stand, newest first, against the search's pages,
// the window ending `today`, and the events already known (their keys).
export function readSignals(
  answer: WebAnswer,
  today: string,
  knownKeys: ReadonlySet<string>,
): ReadResult {
  const parsed = answerShape.safeParse(jsonIn(answer.text));
  if (!parsed.success) return { signals: [], dropped: [], unreadable: true };
  const pages = new Map<number, WebPage>(answer.pages.map((p) => [p.index, p]));
  const since = dayBefore(today, SIGNAL_WINDOW_DAYS);
  const signals: FoundSignal[] = [];
  const dropped: ReadResult['dropped'] = [];
  const keys = new Set(knownKeys);
  for (const event of parsed.data.events) {
    const title = event.title.trim().slice(0, 500);
    const drop = (reason: string) => dropped.push({ title, reason });
    if (!(SIGNAL_TYPES as readonly string[]).includes(event.type)) {
      drop('type');
      continue;
    }
    const day = event.date.trim().slice(0, 10);
    if (!ISO_DAY.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) {
      drop('date');
      continue;
    }
    if (day < since || day > today) {
      drop('window');
      continue;
    }
    const sources = [...new Set(event.refs)]
      .map((ref) => pages.get(ref))
      .filter((page): page is WebPage => Boolean(page))
      .map(({ title: name, url, site }) => ({ title: name, url, site }));
    if (!title || !sources.length) {
      drop('sources');
      continue;
    }
    const key = eventKey(event.type, day, title);
    if (keys.has(key)) {
      drop('known');
      continue;
    }
    keys.add(key);
    signals.push({
      type: event.type as SignalType,
      title,
      summary: event.summary.trim().slice(0, 1000),
      occurredOn: day,
      sources,
      eventKey: key,
    });
  }
  signals.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
  return { signals, dropped, unreadable: false };
}
