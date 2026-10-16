import { beforeEach, expect, it } from 'vitest';
import {
  pageOf,
  stepsToPageBefore,
} from '../../client/components/crm/page-history.js';

// A record page's Back returns to the page before as it was: past the
// record's other tabs and the drawers opened meanwhile (page-history.ts).

const noted = (entries: Record<number, { page: string; drawer: boolean }>) =>
  sessionStorage.setItem('crm.pageHistory', JSON.stringify(entries));
const at = (idx: number) => window.history.replaceState({ idx }, '');

beforeEach(() => sessionStorage.clear());

it('reads a record page as one page whatever its tab', () => {
  expect(pageOf('/crm/leads/l1/tasks')).toBe('/crm/leads/l1');
  expect(pageOf('/crm/leads/l1')).toBe('/crm/leads/l1');
  expect(pageOf('/crm/leads')).toBe('/crm/leads');
});

it('steps back past the record’s tabs and the drawers opened on the way', () => {
  noted({
    0: { page: '/crm/leads', drawer: false },
    1: { page: '/crm/leads', drawer: true },
    2: { page: '/crm/leads/l1', drawer: false },
    3: { page: '/crm/leads/l1', drawer: true },
    4: { page: '/crm/leads/l1', drawer: false },
  });
  at(4);
  expect(stepsToPageBefore('/crm/leads/l1/tasks')).toBe(-4);
});

it('takes an entry nothing noted for a page of its own, and has none to go to first', () => {
  noted({ 2: { page: '/crm/leads/l1', drawer: false } });
  at(2);
  expect(stepsToPageBefore('/crm/leads/l1')).toBe(-1);
  at(0);
  expect(stepsToPageBefore('/crm/leads/l1')).toBeNull();
});
