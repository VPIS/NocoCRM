import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A record's location reads as one line, as an address is written, and is
// edited in a pop-up: a province found by name fills country and province,
// the city and street are typed, and all are saved together.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  language: 'en-US',
}));

vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmApi: () => state.api,
  useRefresh: () => () => Promise.resolve(),
  useCrmText: () => ({
    text: (key: string, values?: Record<string, unknown>) =>
      values?.field ? `${key}:${String(values.field)}` : key,
    language: state.language,
  }),
  useCrmQuery: (path: string, enabled = true) =>
    !enabled
      ? { data: undefined }
      : path.startsWith('geography/places')
        ? {
            data: [{ country: 'CN', state: 'CN-32', label: 'Jiangsu, China' }],
          }
        : path.startsWith('geography/subdivisions?country=CN')
          ? {
              data: [
                { value: 'CN-32', label: 'Jiangsu' },
                { value: 'CN-33', label: 'Zhejiang' },
              ],
            }
          : { data: undefined },
}));

const { LocationField } =
  await import('../../client/components/crm/location-field.js');

const record = {
  id: 'lead-1',
  country: 'CN',
  state: 'CN-33',
  city: 'Hangzhou',
  address: '592 Linping Ave',
};

beforeEach(() => {
  state.api.mockReset();
  state.api.mockResolvedValue({ data: {} });
  state.language = 'en-US';
});
afterEach(cleanup);

describe('LocationField', () => {
  it('reads as an address is written in each language', () => {
    const { container } = render(
      <LocationField
        entity='leads'
        record={record}
        editable={false}
        label='Region'
        countries={['CN']}
      />,
    );
    // The region first, the street under it.
    expect(container.textContent).toBe(
      'Hangzhou, Zhejiang, China592 Linping Ave',
    );
    cleanup();
    state.language = 'zh-CN';
    const { container: zh } = render(
      <LocationField
        entity='leads'
        record={record}
        editable={false}
        label='Region'
        countries={['CN']}
      />,
    );
    expect(zh.textContent).toBe('中国 Zhejiang Hangzhou592 Linping Ave');
  });

  it('fills country and province from a search, and saves them all together', async () => {
    render(
      <LocationField
        entity='leads'
        record={record}
        editable
        label='Region'
        countries={['CN']}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Region' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: 'regionSearch' }),
      'jiang',
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Jiangsu, China' }),
    );
    const city = screen.getByRole('textbox', { name: 'fields.city' });
    await userEvent.clear(city);
    // Enter in the city saves, as an inline field does.
    await userEvent.type(city, 'Suzhou{Enter}');
    expect(state.api).toHaveBeenCalledWith('leads/lead-1', 'PATCH', {
      country: 'CN',
      state: 'CN-32',
      city: 'Suzhou',
      address: '592 Linping Ave',
    });
  });
});
