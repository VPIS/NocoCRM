import { z } from 'zod';
import { jsonIn } from './ai-model.js';
import { countryCodes, subdivisionCode } from './geography.js';
import { currencies, employeeRanges, industries } from './schema.js';
import type { WebAnswer, WebPage } from './web-research.js';

// New company with the AI: what the web says of a company named by the
// person creating it, read into the company form (company-signals.ts's
// `profile`, the Company signals agent's search). Nothing is saved: the
// person reviews the form and creates it.

export const PROFILE_FIELDS = [
  'name',
  'website',
  'linkedin',
  'industry',
  'employees',
  'annualRevenue',
  'currency',
  'country',
  'state',
  'city',
  'address',
  'description',
] as const;
type ProfileField = (typeof PROFILE_FIELDS)[number];

// The fields whose URLs are the company's own pages, not the pages the
// answer cites: kept as written (web-research.ts's `urlFields`).
export const PROFILE_URL_FIELDS = ['website', 'linkedin'] as const;

// The question: the company to look up, what the person added, and the
// answer's JSON; cited by [ref_n] or by URL as the searcher cites.
export function profileQuestion(
  input: { name: string; note: string },
  chinese: boolean,
  cite: 'refs' | 'urls',
): string {
  return [
    `Look up this company on the web: ${input.name}`,
    input.note ? `What the user adds about it: ${input.note}` : '',
    'Find its official name, website, LinkedIn page, industry, size, annual revenue, headquarters and what it does. Prefer its own website, its filings and reputable business sources. Leave out what you cannot find; never guess a number.',
    `Write everything in ${chinese ? 'Chinese' : 'English'}: the name as the company calls itself in that language, the description, the address, the state or province and the city, never translated or romanised into another script.`,
    'Reply with JSON only, in this shape:',
    JSON.stringify({
      name: 'official name',
      website: 'https://… or null',
      linkedin: 'https://www.linkedin.com/company/… or null',
      industry: `one of ${industries.join(', ')}, or null`,
      employees: `one of ${employeeRanges.join(', ')}, or null`,
      annualRevenue: 'a number in the currency below, or null',
      currency: `one of ${currencies.join(', ')}, or null`,
      country: 'ISO 3166-1 alpha-2 code of its headquarters, or null',
      state: 'state or province, or null',
      city: 'city, or null',
      address: 'street address, or null',
      description:
        'two or three short paragraphs: what it does, its scale and where, what is notable',
      uncertain: ['the fields above you are not sure of'],
      sources:
        cite === 'refs'
          ? ['the [ref_n] numbers of the pages you used, as numbers']
          : ['the URLs of the pages you used'],
    }),
  ]
    .filter(Boolean)
    .join('\n');
}

// A prose answer reshaped into the JSON, without searching again.
export function profileJsonQuestion(prose: string): string {
  return `Turn this into JSON of the shape {"name","website","linkedin","industry","employees","annualRevenue","currency","country","state","city","address","description","uncertain":[],"sources":[]}, keeping its [ref_n] marks as numbers in "sources". Reply with JSON only.\n\n${prose}`;
}

const answerShape = z
  .object({
    name: z.unknown(),
    website: z.unknown(),
    linkedin: z.unknown(),
    industry: z.unknown(),
    employees: z.unknown(),
    annualRevenue: z.unknown(),
    currency: z.unknown(),
    country: z.unknown(),
    state: z.unknown(),
    city: z.unknown(),
    address: z.unknown(),
    description: z.unknown(),
    uncertain: z.array(z.unknown()),
    sources: z.array(z.unknown()),
  })
  .partial();

export interface CompanyProfile {
  // The form's values, those found alone.
  input: Partial<Record<ProfileField, string | number>>;
  uncertain: ProfileField[];
  // The pages it read, those it cited first.
  sources: { title: string; url: string; site: string }[];
}

const text = (value: unknown, max = 500): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || /^(null|n\/a|unknown|none)$/iu.test(trimmed))
    return undefined;
  return trimmed.slice(0, max);
};
const url = (value: unknown): string | undefined => {
  const found = text(value, 500);
  return found && /^https?:\/\/\S+$/iu.test(found) ? found : undefined;
};
const among = (value: unknown, list: readonly string[]): string | undefined => {
  const found = text(value, 100);
  if (!found) return undefined;
  return list.find((item) => item.toLowerCase() === found.toLowerCase());
};

// The answer as the form's values: each field kept only when it is of the
// field's kind (an option among the field's, a number, an address), the
// province turned into its code, the pages cited as sources (all it read
// when it cited none). Undefined when the answer holds no readable JSON.
export function readProfile(answer: WebAnswer): CompanyProfile | undefined {
  const parsed = answerShape.safeParse(jsonIn(answer.text));
  if (!parsed.success) return undefined;
  const found = parsed.data;
  const input: CompanyProfile['input'] = {};
  const name = text(found.name, 255);
  if (name) input.name = name;
  const website = url(found.website);
  if (website) input.website = website;
  const linkedin = url(found.linkedin);
  if (linkedin && /linkedin\.com\//iu.test(linkedin)) input.linkedin = linkedin;
  const industry = among(found.industry, industries);
  if (industry) input.industry = industry;
  const employees = among(found.employees, employeeRanges);
  if (employees) input.employees = employees;
  const revenue =
    typeof found.annualRevenue === 'number'
      ? found.annualRevenue
      : Number(text(found.annualRevenue, 40)?.replace(/[,\s]/gu, ''));
  const currency = among(found.currency, currencies);
  if (Number.isFinite(revenue) && revenue > 0 && currency) {
    input.annualRevenue = Math.round(revenue);
    input.currency = currency;
  }
  const country = among(found.country, countryCodes);
  if (country) {
    input.country = country;
    const state = text(found.state, 100);
    const code = state ? subdivisionCode(country, state) : undefined;
    if (code) input.state = code;
  }
  const city = text(found.city, 100);
  if (city) input.city = city;
  const address = text(found.address, 500);
  if (address) input.address = address;
  const description = text(found.description, 5000);
  if (description) input.description = description;
  const uncertain = (found.uncertain ?? [])
    .map((key) => text(key, 40))
    .filter((key): key is ProfileField =>
      (PROFILE_FIELDS as readonly string[]).includes(key ?? ''),
    )
    .filter((key) => input[key] !== undefined);
  const pages = new Map<number, WebPage>(answer.pages.map((p) => [p.index, p]));
  const cited: WebPage[] = [];
  for (const source of found.sources ?? []) {
    const page =
      typeof source === 'number'
        ? pages.get(source)
        : answer.pages.find(
            (p) =>
              typeof source === 'string' &&
              (p.url === source ||
                source.includes(`ref_${String(p.index)}`) ||
                source === String(p.index)),
          );
    if (page && !cited.includes(page)) cited.push(page);
  }
  const sources = (cited.length ? cited : answer.pages)
    .slice(0, 8)
    .map(({ title, url: address, site }) => ({ title, url: address, site }));
  return { input, uncertain, sources };
}
