import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';
import { defaultSettings } from '../../server/providers/crm/schema.js';

// The settings page's in-app notification switches: each kind of message
// the CRM sends, on by default, saved by the reminders card's own Save with
// that card's settings alone; and the business guidance page, the shipped
// guidance until an administrator writes over it.

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
    useCrmQuery: (path: string) => ({
      isLoading: false,
      data:
        path === 'systemSettings'
          ? defaultSettings
          : { present: false, createdAt: null, records: 0, accounts: [] },
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
const { default: GuidancePage } =
  await import('../../client/pages/crm-guidance.js');

describe('the settings page', () => {
  it("switches a kind of in-app message off and saves it with the reminders card's settings", async () => {
    const user = userEvent.setup();
    state.api.mockResolvedValue({ data: {} });
    render(
      <MemoryRouter initialEntries={['/settings/crm']}>
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
    const card = document.getElementById('settings-reminders') as HTMLElement;
    const save = within(card).getByRole('button', { name: crmEn.save });
    // Nothing to save until something on the card changes.
    expect(save).toHaveProperty('disabled', true);
    await user.click(approvals);
    expect(approvals.getAttribute('aria-checked')).toBe('false');
    await user.click(save);
    expect(state.api).toHaveBeenCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({
        notifyApprovals: false,
        notifyRecordChanges: true,
        notifyTaskReminders: true,
      }),
    );
    // The business card's settings are its own Save's.
    expect(state.api.mock.lastCall?.[2]).not.toHaveProperty('currency');
  });

  it('shows the shipped business guidance, saves one written over it, and restores the default', async () => {
    const user = userEvent.setup();
    state.api.mockReset();
    state.api.mockResolvedValue({ data: {} });
    render(
      <MemoryRouter initialEntries={['/crm/guidance']}>
        <GuidancePage />
      </MemoryRouter>,
    );
    const box = screen.getByRole('textbox', { name: crmEn.guidance });
    // The shipped guidance, in the AI language (English by default).
    expect((box as HTMLTextAreaElement).value).toContain('Company: NocoBase');
    expect(screen.getByText(crmEn.guidanceShipped)).toBeTruthy();
    const restore = screen.getByRole('button', {
      name: crmEn.guidanceRestore,
    });
    expect(restore).toHaveProperty('disabled', true);
    await user.clear(box);
    await user.type(box, '# Our rules{Enter}- Quote list prices only');
    expect(screen.getByText(crmEn.guidanceCustom)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: crmEn.save }));
    expect(state.api).toHaveBeenLastCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({
        businessGuidance: '# Our rules\n- Quote list prices only',
      }),
    );
    // Back to the shipped one: saved as empty.
    await user.click(restore);
    expect((box as HTMLTextAreaElement).value).toContain('Company: NocoBase');
    await user.click(screen.getByRole('button', { name: crmEn.save }));
    expect(state.api).toHaveBeenLastCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({ businessGuidance: '' }),
    );
  });
});
