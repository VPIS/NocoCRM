// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  citedFindings,
  keptResearch,
  lookUpTarget,
  researchDue,
  researchQuestion,
} from '../../server/providers/crm/lead-research.js';

// A lead follow-up's web look-up of its company
// (server/providers/crm/lead-research.ts): when it is due, what it asks,
// what the card keeps and which suggested values may name a web page.

const DAY = 86_400_000;
const now = Date.parse('2026-10-19T08:00:00Z');

describe('when a lead follow-up looks its company up', () => {
  const due = (input: {
    trigger?: string;
    revision?: boolean;
    lastAt?: number;
    changedAt?: number;
  }) => researchDue({ revision: false, now, ...input });

  it('looks up a company never looked up, and never for a revision', () => {
    expect(due({ trigger: 'created' })).toBe(true);
    expect(due({})).toBe(true);
    expect(due({ revision: true })).toBe(false);
    expect(due({ revision: true, trigger: 'companyChanged' })).toBe(false);
  });

  it('always looks up again when the company changed or a review is due', () => {
    const lastAt = now - DAY;
    expect(due({ trigger: 'companyChanged', lastAt })).toBe(true);
    expect(due({ trigger: 'nurtureDue', lastAt })).toBe(true);
  });

  it('looks up a quiet lead after 30 days, any other after 90', () => {
    expect(due({ trigger: 'silent', lastAt: now - 20 * DAY })).toBe(false);
    expect(due({ trigger: 'silent', lastAt: now - 31 * DAY })).toBe(true);
    expect(due({ trigger: 'uncontacted', lastAt: now - 31 * DAY })).toBe(true);
    expect(due({ trigger: 'customerReplied', lastAt: now - 31 * DAY })).toBe(
      false,
    );
    expect(due({ trigger: 'taskDone', lastAt: now - 91 * DAY })).toBe(true);
    expect(due({ lastAt: now - 91 * DAY })).toBe(true);
    // A person's recent change to the company's particulars is as good as
    // a look-up.
    expect(due({ lastAt: now - 91 * DAY, changedAt: now - 10 * DAY })).toBe(
      false,
    );
  });
});

describe("a lead follow-up's look-up question", () => {
  it('goes on the company, its website and a company email domain', () => {
    expect(
      lookUpTarget({ id: 'l', company: ' Acme ', email: 'a@acme.example' }),
    ).toEqual({ company: 'Acme', website: '', domain: 'acme.example' });
    expect(lookUpTarget({ id: 'l', email: 'wang@QQ.com' })).toBeNull();
    expect(lookUpTarget({ id: 'l', email: 'x@gmail.com' })).toBeNull();
    expect(lookUpTarget({ id: 'l', website: 'https://b.example' })).toEqual({
      company: '',
      website: 'https://b.example',
      domain: '',
    });
    expect(lookUpTarget({ id: 'l', name: 'Someone' })).toBeNull();
  });

  it('asks who it is, what changed lately and whether it uses NocoBase', () => {
    const lead = { id: 'l', company: '调研精工', city: '杭州' };
    const target = { company: '调研精工', website: '', domain: 'r.example' };
    const refs = researchQuestion(lead, target, {
      chinese: true,
      cite: 'refs',
      today: '2026-10-19',
    });
    expect(refs.split('\n')[0]).toBe(
      'Look up this company on the web: 调研精工',
    );
    expect(refs).toContain('City: 杭州');
    expect(refs).toContain('Its email domain: r.example');
    expect(refs).toContain('Today is 2026-10-19');
    expect(refs).toContain('last 90 days');
    expect(refs).toContain('NocoBase');
    expect(refs).toContain('Do not look up any person');
    expect(refs).toContain('Write the whole answer in Chinese');
    expect(refs).toContain('as [ref_n]');
    const urls = researchQuestion(lead, target, {
      chinese: false,
      cite: 'urls',
      today: '2026-10-19',
    });
    expect(urls).toContain('full URL of every page');
    expect(urls).not.toContain('[ref_n]');
  });
});

describe('what a look-up leaves on the card', () => {
  const pages = [
    { index: 1, title: 'Unused', url: 'https://u.example', site: 'u' },
    { index: 2, title: 'About', url: 'https://acme.example/about', site: 'a' },
    { index: 3, title: 'Jobs', url: 'https://jobs.example/1', site: 'j' },
  ];

  it('keeps the answer with its pages, the cited ones first', () => {
    const kept = keptResearch(
      { text: ' Acme makes anvils [ref_2]. Hiring [ref_3]. ', pages },
      new Date('2026-10-19T08:00:00Z'),
    );
    expect(kept).toEqual({
      at: '2026-10-19T08:00:00.000Z',
      text: 'Acme makes anvils [ref_2]. Hiring [ref_3].',
      pages: [pages[1], pages[2], pages[0]],
    });
  });

  it('offers a value from the web only with a page the look-up read', () => {
    const found = [
      { field: 'website', value: 'https://acme.example', source: 'ref_2' },
      { field: 'city', value: 'Hangzhou', source: '[ref_3]' },
      {
        field: 'industry',
        value: 'manufacturing',
        source: 'https://acme.example/about/',
      },
      { field: 'employees', value: '51-200', source: 'https://made.up/x' },
      { field: 'address', value: '1 Road', source: 'ref_9' },
      { field: 'jobTitle', value: 'IT manager', source: 'Original message' },
    ];
    expect(citedFindings(found, pages)).toEqual([
      {
        field: 'website',
        value: 'https://acme.example',
        source: 'https://acme.example/about',
      },
      { field: 'city', value: 'Hangzhou', source: 'https://jobs.example/1' },
      {
        field: 'industry',
        value: 'manufacturing',
        source: 'https://acme.example/about',
      },
      { field: 'jobTitle', value: 'IT manager', source: 'Original message' },
    ]);
    // No look-up this time: nothing from the web at all.
    expect(citedFindings(found, [])).toEqual([found[5]]);
  });
});
