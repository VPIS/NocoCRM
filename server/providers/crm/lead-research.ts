import { readEntry } from './ai-entries.js';
import { toText, type CrmRecord } from './schema.js';
import type { CrmService } from './service.js';
import { jsonValue } from './values.js';
import type { WebPage } from './web-research.js';

// A lead follow-up's web look-up of the lead's company (lead-evaluation.ts):
// who it is, what changed there lately and whether it uses NocoBase, asked
// once with the Company research agent's web search (company-signals.ts's
// `lookUp`) before the follow-up's model, which cannot search, weighs the
// lead. The answer cites the pages it read as [ref_n]; it is kept on the
// card with those pages, so a later follow-up that does not look the
// company up again reads it as an earlier look-up.

const DAY = 86_400_000;
// How long a look-up counts as recent: after this any follow-up looks the
// company up again.
export const RESEARCH_FRESH_MS = 90 * DAY;
// A lead gone quiet (lead-signals.ts) has its company looked up again once
// the last look-up is this old: what changed there may be a reason to call.
export const NEWS_FRESH_MS = 30 * DAY;
// The developments a look-up asks about, back from today.
export const NEWS_WINDOW_DAYS = 90;
// The look-up's answer as kept on the card: its text, every page it cites
// (a DeepSeek look-up cited 42), and pages it read without citing them
// only up to a few.
const TEXT_MAX = 6000;
const CITED_MAX = 80;
const PAGES_MAX = 20;

// The triggers that always look the company up: a person changed which
// company it is, or a nurtured lead's review came round.
const ALWAYS = new Set(['companyChanged', 'nurtureDue']);
const QUIET = new Set(['uncontacted', 'silent']);

// The company's particulars on a lead, whose change by a person counts as
// fresh information.
export const COMPANY_FIELDS = [
  'company',
  'website',
  'industry',
  'employees',
  'country',
  'state',
  'city',
  'address',
  'companyDescription',
] as const;

export interface LeadResearch {
  at: string;
  // The answer, its points citing `pages` as [ref_n].
  text: string;
  pages: WebPage[];
}

// Why a follow-up that should have looked the company up did not, shown on
// its card: no model of the Company research agent can search, or the
// search failed.
export type ResearchMiss = 'unavailable' | 'failed';

// Whether this follow-up looks the company up: never for a revision (it
// changes the card as asked); always when the company changed or a
// nurtured lead's review is due; when it was never looked up; when the
// last look-up, or a person's change to its particulars, is over 90 days
// old; and for a lead gone quiet, when the last look-up is over 30 days old.
export function researchDue(input: {
  trigger?: string | undefined;
  revision: boolean;
  lastAt?: number | undefined;
  changedAt?: number | undefined;
  now: number;
}): boolean {
  const { trigger, revision, lastAt, changedAt, now } = input;
  if (revision) return false;
  if (trigger && ALWAYS.has(trigger)) return true;
  if (!lastAt) return true;
  if (trigger && QUIET.has(trigger) && now - lastAt > NEWS_FRESH_MS)
    return true;
  return now - Math.max(lastAt, changedAt ?? 0) > RESEARCH_FRESH_MS;
}

// What the lead's look-ups so far tell: when the company was last looked up
// (an older card's `researchedAt` included, from before look-ups were kept),
// when a person last changed its particulars, and the latest look-up kept.
// `currentId` is the run itself, left out.
export async function researchHistory(
  service: CrmService,
  leadId: string,
  currentId: string,
): Promise<{
  lastAt?: number;
  changedAt?: number;
  latest?: LeadResearch;
}> {
  const rows = await service.database
    .query()
    .selectFrom('crmHistory')
    .selectAll()
    .where('entity', '=', 'leads')
    .where('recordId', '=', leadId)
    .where('action', 'in', ['ai', 'updated'])
    .orderBy('createdAt', 'desc')
    .execute();
  let lastAt = 0;
  let changedAt = 0;
  let latest: LeadResearch | undefined;
  for (const row of rows) {
    if (toText(row.id) === currentId) continue;
    if (row.action === 'ai') {
      const { ai } = readEntry(row);
      const at = ai.researchedAt ? Date.parse(ai.researchedAt) : NaN;
      if (Number.isFinite(at)) lastAt = Math.max(lastAt, at);
      if (!latest && ai.research?.text) latest = ai.research;
    } else {
      const changes = jsonValue(row.changes);
      if (
        changes &&
        typeof changes === 'object' &&
        COMPANY_FIELDS.some((key) => key in changes)
      )
        changedAt = Math.max(changedAt, Date.parse(toText(row.createdAt)));
    }
  }
  return {
    ...(lastAt ? { lastAt } : {}),
    ...(changedAt ? { changedAt } : {}),
    ...(latest ? { latest } : {}),
  };
}

// Mail services whose addresses name no company.
const PUBLIC_MAIL =
  /^(gmail|googlemail|outlook|hotmail|live|msn|yahoo|icloud|me|mac|aol|proton|protonmail|qq|foxmail|163|126|yeah|sina|sohu|139|189|aliyun|tom|21cn|naver|yandex|gmx|mail|zoho)\./iu;

// What the look-up has to go on: the company's name, its website and the
// domain of the person's address; null when the lead names no company in
// any of them (a private address alone).
export function lookUpTarget(lead: CrmRecord): {
  company: string;
  website: string;
  domain: string;
} | null {
  const company = toText(lead.company ?? '').trim();
  const website = toText(lead.website ?? '').trim();
  const email = toText(lead.email ?? '').trim();
  const at = email.lastIndexOf('@');
  const host = at > 0 ? email.slice(at + 1).toLowerCase() : '';
  const domain = host && !PUBLIC_MAIL.test(host) ? host : '';
  return company || website || domain ? { company, website, domain } : null;
}

// The look-up's question: the company as the lead names it (with where it
// is and what it does, to tell it from others of the name), the three
// things to find, cited by [ref_n] or by URL as the searcher cites. It
// opens on the company and names NocoBase only in the last point: the
// search is formed from the question, and one that opened on the
// salesperson's product searched for the product (seen with Qwen).
export function researchQuestion(
  lead: CrmRecord,
  target: { company: string; website: string; domain: string },
  input: { chinese: boolean; cite: 'refs' | 'urls'; today: string },
): string {
  const name = target.company || target.website || target.domain;
  const known = [
    target.website && `Its website: ${target.website}`,
    target.domain && `Its email domain: ${target.domain}`,
    ...(['industry', 'city', 'country'] as const).map((key) => {
      const value = toText(lead[key] ?? '').trim();
      return value && `${key[0].toUpperCase()}${key.slice(1)}: ${value}`;
    }),
  ].filter(Boolean);
  return [
    `Look up this company on the web: ${name}`,
    known.join('\n'),
    `Today is ${input.today}. Find, about ${name} itself:`,
    '1. Who it is: its official name and website, industry, number of employees, headquarters and address, and what it does.',
    `2. What changed there in the last ${String(NEWS_WINDOW_DAYS)} days: hiring for IT or digitalisation roles, new business or products, funding, acquisitions, large contracts, reorganisation, new executives, layoffs or other trouble; each with the date it happened.`,
    `3. Whether ${name} uses or has looked at NocoBase, the open-source low-code platform: a code repository, a forum post, an article or a case study naming both.`,
    'Prefer its own website, its filings and reputable sources, and use only pages about this company. Leave out a page that may be about another company of the same name, and say so when you cannot tell which company is meant. Do not look up any person. Never guess; for what you cannot find, say it was not found.',
    `Write the whole answer in ${input.chinese ? 'Chinese' : 'English'}, whatever language the pages are in, as short points under the three headings.`,
    input.cite === 'urls'
      ? 'After each point write the full URL of every page that states it, exactly as the search returned it.'
      : 'After each point cite the pages that state it as [ref_n].',
  ]
    .filter(Boolean)
    .join('\n');
}

// The look-up as the card keeps it: the answer within its length, the pages
// it cites, so each of its marks links its page, then others it read while
// there are fewer than 20.
export function keptResearch(
  answer: { text: string; pages: readonly WebPage[] },
  at: Date,
): LeadResearch {
  const text = answer.text.trim().slice(0, TEXT_MAX);
  const cited = new Set(
    [...text.matchAll(/\[ref_(\d+)\]/gu)].map((match) => Number(match[1])),
  );
  return {
    at: at.toISOString(),
    text,
    pages: [
      ...answer.pages
        .filter((page) => cited.has(page.index))
        .slice(0, CITED_MAX),
      ...answer.pages.filter((page) => !cited.has(page.index)),
    ]
      .filter(
        (_page, i) => i < Math.max(PAGES_MAX, Math.min(cited.size, CITED_MAX)),
      )
      .map(({ index, title, url, site }) => ({ index, title, url, site })),
  };
}

// The model's suggested values with a web page as their source made to
// name that page by its address: `ref_2` (or `[ref_2]`, or the address
// itself) among the look-up's pages. One whose page is none of them, or
// any web source when no look-up was made this time, is dropped: a value
// from the web is offered only with the page that states it.
export function citedFindings<
  T extends { field: string; value: string; source: string | null },
>(found: readonly T[], pages: readonly WebPage[]): T[] {
  const out: T[] = [];
  for (const item of found) {
    const source = toText(item.source ?? '').trim();
    const ref = /^\[?ref_?(\d+)\]?$/iu.exec(source);
    const web = ref || /^https?:\/\//iu.test(source);
    if (!web) {
      out.push(item);
      continue;
    }
    const page = ref
      ? pages.find((p) => p.index === Number(ref[1]))
      : pages.find(
          (p) =>
            p.url.replace(/\/$/u, '').toLowerCase() ===
            source.replace(/\/$/u, '').toLowerCase(),
        );
    if (page) out.push({ ...item, source: page.url });
  }
  return out;
}
