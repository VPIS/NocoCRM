import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import {
  currentAddress,
  recordOf,
} from '../../client/components/crm/record-route.js';
import { pageOf } from '../../client/components/crm/page-history.js';
import LegacyRedirect from '../../client/pages/crm-legacy-redirect.js';

// The CRM's addresses since its pages left /crm (2026-10-19): a record's
// page read from its address, and every address from before leading to its
// page now.

describe("a record page's address", () => {
  it('names its kind, id and tab, and nothing else', () => {
    expect(recordOf('/leads/l1')).toEqual({ entity: 'leads', id: 'l1' });
    expect(recordOf('/companies/c1/contacts')).toEqual({
      entity: 'companies',
      id: 'c1',
      tab: 'contacts',
    });
    expect(recordOf('/leads')).toBeUndefined();
    expect(recordOf('/settings/users')).toBeUndefined();
    expect(recordOf('/whatsapp/w1')).toBeUndefined();
    expect(recordOf('/crm/leads/l1')).toBeUndefined();
  });

  it('is one page in the history whatever its tab', () => {
    expect(pageOf('/companies/c1/contacts')).toBe('/companies/c1');
    expect(pageOf('/companies/c1')).toBe('/companies/c1');
    expect(pageOf('/whatsapp/w1/link')).toBe('/whatsapp/w1/link');
  });
});

describe('an address from before', () => {
  it('leads to its page now, older names too', () => {
    expect(currentAddress('/crm/leads')).toBe('/leads');
    expect(currentAddress('/crm/companies/c1/signals')).toBe(
      '/companies/c1/signals',
    );
    expect(currentAddress('/crm/whatsapp/w1')).toBe('/whatsapp/w1');
    expect(currentAddress('/crm')).toBe('/');
    expect(currentAddress('/crm/accounts/a1/contacts')).toBe(
      '/companies/a1/contacts',
    );
    expect(currentAddress('/crm/agents/companies')).toBe(
      '/agent-work/companies',
    );
  });

  it('opens the page with its query, from a notice sent before', async () => {
    function Where(): ReactElement {
      const { pathname, search } = useLocation();
      return <output>{pathname + search}</output>;
    }
    render(
      <MemoryRouter initialEntries={['/crm/leads/l1/history?open=x']}>
        <Routes>
          <Route path='/crm/*' element={<LegacyRedirect />} />
          <Route path='*' element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    expect((await screen.findByRole('status')).textContent).toBe(
      '/leads/l1/history?open=x',
    );
  });
});
