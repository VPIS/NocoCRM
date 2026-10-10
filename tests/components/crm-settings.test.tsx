import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';
import { defaultSettings } from '../../server/providers/crm/schema.js';

// The settings page's in-app notification switches: each kind of message
// the CRM sends, on by default, saved with the rest of the settings.

const state = vi.hoisted(() => ({
  api: vi.fn(),
}));

const lookup = (key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[part]
          : undefined,
      crmEn,
    );

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmQuery: () => ({
      isLoading: false,
      data: {
        settings: defaultSettings,
        demo: { present: false, createdAt: null, records: 0, accounts: [] },
      },
    }),
    useCrmApi: () => state.api,
    useRefresh: () => async () => undefined,
    useCrmText: () => ({
      text: (key: string): string => {
        const value = lookup(key);
        return typeof value === 'string' ? value : key;
      },
      language: 'en-US',
    }),
  };
});

const { default: SettingsPage } =
  await import('../../client/pages/crm-settings.js');

describe('the settings page', () => {
  it('switches a kind of in-app message off and saves it with the settings', async () => {
    const user = userEvent.setup();
    state.api.mockResolvedValue({ data: {} });
    render(
      <MemoryRouter initialEntries={['/settings/crm?section=reminders']}>
        <SettingsPage />
      </MemoryRouter>,
    );
    const approvals = screen.getByRole('switch', {
      name: crmEn.notifications.notifyApprovals,
    });
    for (const name of [
      crmEn.notifications.notifyApprovals,
      crmEn.notifications.notifyRecordChanges,
      crmEn.notifications.notifyTaskReminders,
    ])
      expect(
        screen.getByRole('switch', { name }).getAttribute('aria-checked'),
      ).toBe('true');
    await user.click(approvals);
    expect(approvals.getAttribute('aria-checked')).toBe('false');
    await user.click(screen.getByRole('button', { name: crmEn.save }));
    expect(state.api).toHaveBeenCalledWith(
      'settings',
      'PUT',
      expect.objectContaining({
        notifyApprovals: false,
        notifyRecordChanges: true,
        notifyTaskReminders: true,
      }),
    );
  });
});
