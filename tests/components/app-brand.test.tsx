import {
  TestI18nProvider,
  createTestI18nRuntime,
} from '@nocobase/i18n/testing';
import { render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AppBrand } from '../../client/layouts/components/app-brand.js';
import enUS from '../../client/locales/en-US.js';

// The header's brand: the official NocoBase lockup with "CRM" for the
// product, and the mark alone when the sidebar is collapsed.

const runtime = await createTestI18nRuntime({
  application: { namespace: '@nocobase/app-template-default', resources: enUS },
});

function Wrapper({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <TestI18nProvider runtime={runtime}>
      <MemoryRouter>{children}</MemoryRouter>
    </TestI18nProvider>
  );
}

describe('AppBrand', () => {
  it('links home with the lockup: the mark, Noco and CRM, in the text colour', () => {
    render(<AppBrand />, { wrapper: Wrapper });
    const link = screen.getByRole('link', {
      name: enUS['navigation.brandHome'],
    });
    expect(link).toHaveAttribute('href', '/');
    const svg = link.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'currentColor');
    expect(svg?.querySelectorAll('path')).toHaveLength(3);
    // No images: one drawing serves light and dark.
    expect(link.querySelector('img')).toBeNull();
    expect(link).not.toHaveTextContent('NocoCRM');
  });

  it('shows the mark alone when compact', () => {
    render(<AppBrand compact />, { wrapper: Wrapper });
    const link = screen.getByRole('link', {
      name: enUS['navigation.brandHome'],
    });
    expect(link.querySelectorAll('svg path')).toHaveLength(1);
  });
});
