import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crmZh } from '../../client/locales/crm/index.js';

// The demo banner: offered to whoever may import the dataset while none is
// imported, linking to the settings page's demo tab, and dismissed for good
// in this browser.

const state = vi.hoisted(() => ({
  metadata: {} as { settingsAccess?: boolean; demoPresent?: boolean },
}));

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useMetadata: () => ({ data: state.metadata }),
    useCrmText: () => ({
      text: (key: string): string => {
        const value = (crmZh as unknown as Record<string, unknown>)[key];
        return typeof value === 'string' ? value : key;
      },
      language: 'zh-CN',
    }),
  };
});

const { DemoBanner } =
  await import('../../client/components/crm/demo-banner.js');

const renderBanner = () =>
  render(
    <MemoryRouter>
      <DemoBanner />
    </MemoryRouter>,
  );

describe('the demo banner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers the import to an administrator while no demo data is imported', () => {
    state.metadata = { settingsAccess: true, demoPresent: false };
    renderBanner();
    expect(screen.getByText(crmZh.demoBanner)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: crmZh.demoBannerAction })
        .getAttribute('href'),
    ).toBe('/settings/crm?section=demoData');
  });

  it('hides once the demo data is imported, and from those who cannot import', () => {
    state.metadata = { settingsAccess: true, demoPresent: true };
    const { unmount } = renderBanner();
    expect(screen.queryByText(crmZh.demoBanner)).toBeNull();
    unmount();
    state.metadata = { settingsAccess: false };
    renderBanner();
    expect(screen.queryByText(crmZh.demoBanner)).toBeNull();
  });

  it('stays dismissed in this browser', async () => {
    state.metadata = { settingsAccess: true, demoPresent: false };
    const { unmount } = renderBanner();
    await userEvent.click(
      screen.getByRole('button', { name: crmZh.demoBannerDismiss }),
    );
    expect(screen.queryByText(crmZh.demoBanner)).toBeNull();
    unmount();
    renderBanner();
    expect(screen.queryByText(crmZh.demoBanner)).toBeNull();
  });
});
