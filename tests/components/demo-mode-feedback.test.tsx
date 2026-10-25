import { ApiClientError } from '@nocobase/app-client';
import { authenticationClientToken } from '@nocobase/app-plugin-authentication/client';
import {
  answerApi,
  renderWithApp,
  type ApiCall,
} from '@nocobase/app-testing/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InlineField } from '#components/crm/inline';
import { MoneyField } from '#components/crm/money-field';
import { LocationField } from '#components/crm/location-field';
import { StageField } from '#components/crm/reasons';
import { RecordForm } from '#components/crm/form';
import { ErrorNotice } from '#components/crm/common';
import { SettingsError } from '../../client/pages/settings/shared.js';
import { ConfirmAction } from '../../client/pages/settings/common/shared.js';
import enUS from '../../client/locales/en-US.js';
import {
  defaultSettings,
  definitions,
} from '../../server/providers/crm/schema.js';

const record = {
  id: 'lead-1',
  name: 'Original name',
  ownerId: 'rep',
  createdById: 'rep',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  source: 'website',
  status: 'new',
  description: 'Original introduction',
};
const metadata = {
  definitions,
  settings: defaultSettings,
  userId: 'rep',
  assistant: false,
  users: [
    {
      id: 'rep',
      name: 'Representative',
      roles: ['sales-representative'],
      disabled: false,
      canApprove: false,
    },
  ],
  permissions: Object.fromEntries(
    Object.keys(definitions).map((entity) => [
      entity,
      { create: { fields: '*' }, update: { fields: '*' } },
    ]),
  ),
};
let reason = 'DEMO_READ_ONLY';
const api = vi.fn(({ method, path }: ApiCall) => {
  if (method !== 'GET')
    return Response.json(
      {
        error: {
          reason,
          status: 'FAILED_PRECONDITION',
          domain: reason === 'DEMO_READ_ONLY' ? 'demoMode' : 'crm',
        },
      },
      { status: 400 },
    );
  if (path === 'workspace') return { data: metadata };
  return { data: [], meta: { total: 0 } };
});
const refusal = () =>
  new ApiClientError('Demo mode', {
    status: 400,
    reason: 'DEMO_READ_ONLY',
    method: 'PATCH',
    url: '/api/leads/lead-1',
    payload: {
      error: {
        reason: 'DEMO_READ_ONLY',
        status: 'FAILED_PRECONDITION',
        domain: 'demoMode',
      },
    },
  });

async function renderFeedback(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithApp(
    <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>,
    {
      namespace: 'crm',
      namespaces: { crm: enUS },
      fetch: answerApi(api),
      services: (app) =>
        app.container.instance(authenticationClientToken, {
          getSession: async () => ({
            data: { user: { id: 'rep', name: 'Representative' } },
          }),
        }),
    },
  );
}

beforeEach(() => {
  reason = 'DEMO_READ_ONLY';
  api.mockClear();
});

describe('demo write feedback', () => {
  it('restores typed text and discards its draft when autosave is refused', async () => {
    await renderFeedback(
      <InlineField
        entity='leads'
        record={record}
        field={{ key: 'name', type: 'text' }}
        label='Name'
        editable
      />,
    );
    await userEvent.dblClick(screen.getByRole('button', { name: 'Name' }));
    const input = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Demo edit');
    fireEvent.blur(input);
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    expect(screen.getByRole('button', { name: 'Name' })).toHaveTextContent(
      record.name,
    );
    expect(screen.queryByText(enUS.crm.errors.demoReadOnly)).toBeNull();
    expect(api).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        path: 'leads/lead-1',
        json: { name: 'Demo edit' },
      }),
    );
    await userEvent.dblClick(screen.getByRole('button', { name: 'Name' }));
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
      record.name,
    );
  });

  it('restores a selection when its immediate save is refused', async () => {
    await renderFeedback(
      <InlineField
        entity='leads'
        record={record}
        field={{ key: 'source', type: 'select', options: ['website', 'other'] }}
        label='Source'
        editable
      />,
    );
    await userEvent.dblClick(screen.getByRole('button', { name: 'Source' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Source' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Other' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Source' })).toHaveTextContent(
        'Website',
      ),
    );
    expect(screen.queryByText(enUS.crm.errors.demoReadOnly)).toBeNull();
  });

  it('restores multiple selections when saving on popup close is refused', async () => {
    await renderFeedback(
      <>
        <InlineField
          entity='leads'
          record={{ ...record, tags: ['website'] }}
          field={{ key: 'tags', type: 'multi', relation: 'users' }}
          choices={[
            { value: 'website', label: 'Website' },
            { value: 'other', label: 'Other' },
          ]}
          label='Tags'
          editable
        />
        <button>Outside</button>
      </>,
    );
    await userEvent.dblClick(screen.getByRole('button', { name: 'Tags' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Tags' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Other' }));
    await userEvent.click(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          json: { tags: ['website', 'other'] },
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tags' })).toHaveTextContent(
        'website',
      ),
    );
    await userEvent.dblClick(screen.getByRole('button', { name: 'Tags' }));
    expect(screen.getByRole('combobox', { name: 'Tags' })).toHaveTextContent(
      'Website',
    );
    expect(
      screen.getByRole('combobox', { name: 'Tags' }),
    ).not.toHaveTextContent('Other');
  });

  it('restores an optional date after its clear is refused', async () => {
    const onSave = vi.fn().mockRejectedValue(refusal());
    await renderFeedback(
      <InlineField
        entity='leads'
        record={{ ...record, day: '2026-10-12T00:00:00Z' }}
        field={{ key: 'day', type: 'date' }}
        label='Date'
        editable
        onSave={onSave}
      />,
    );
    const original = screen.getByRole('button', { name: 'Date' }).textContent;
    await userEvent.dblClick(screen.getByRole('button', { name: 'Date' }));
    await userEvent.click(
      await screen.findByRole('button', { name: /clear/i }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Date' })).toHaveTextContent(
        original!,
      ),
    );
    expect(screen.queryByText(enUS.crm.errors.demoReadOnly)).toBeNull();
  });

  it('finishes editing after a successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await renderFeedback(
      <InlineField
        entity='leads'
        record={record}
        field={{ key: 'name', type: 'text' }}
        label='Name'
        editable
        onSave={onSave}
      />,
    );
    await userEvent.dblClick(screen.getByRole('button', { name: 'Name' }));
    const input = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.type(input, ' changed');
    fireEvent.blur(input);
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('Original name changed'),
    );
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('restores an amount and its currency after a demo refusal', async () => {
    await renderFeedback(
      <MoneyField
        entity='leads'
        record={{ ...record, annualRevenue: 1000, currency: 'USD' }}
        amountKey='annualRevenue'
        label='Annual revenue'
        placeholder='Add amount'
        editable
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Annual revenue' }),
    );
    const input = screen.getByRole('textbox', { name: 'Annual revenue' });
    await userEvent.clear(input);
    await userEvent.type(input, '2500{Enter}');
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    expect(
      screen.getByRole('button', { name: 'Annual revenue' }),
    ).toHaveTextContent('1,000');
    await userEvent.click(
      screen.getByRole('button', { name: 'Annual revenue' }),
    );
    expect(screen.getByRole('textbox', { name: 'Annual revenue' })).toHaveValue(
      '1000',
    );
    expect(screen.queryByText(enUS.crm.errors.demoReadOnly)).toBeNull();
  });

  it('restores a location after a demo refusal', async () => {
    await renderFeedback(
      <>
        <LocationField
          entity='leads'
          record={{ ...record, city: 'Original city' }}
          label='Location'
          countries={[]}
          editable
        />
        <button>Outside</button>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Location' }));
    const input = screen.getByRole('textbox', { name: 'City' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Demo city');
    await userEvent.click(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    expect(screen.getByRole('button', { name: 'Location' })).toHaveTextContent(
      'Original city',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Location' }));
    expect(screen.getByRole('textbox', { name: 'City' })).toHaveValue(
      'Original city',
    );
    expect(screen.queryByText(enUS.crm.errors.demoReadOnly)).toBeNull();
  });

  it('keeps the original status without a local demo error', async () => {
    const onSave = vi.fn().mockRejectedValue(refusal());
    await renderFeedback(
      <StageField
        entity='leads'
        record={record}
        field='status'
        title='Status'
        editable
        onSave={onSave}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Status' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Working', exact: true }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Status' })).toHaveTextContent(
      'New',
    );
    expect(screen.queryByText(enUS.crm.errors.demoReadOnly)).toBeNull();
  });

  it.each(['shortcut', 'outside'] as const)(
    'discards the long-text popup draft after a refused %s save',
    async (gesture) => {
      await renderFeedback(
        <>
          <InlineField
            entity='leads'
            record={record}
            field={{ key: 'description', type: 'textarea' }}
            label='Introduction'
            editable
            longText='popover'
          />
          <button>Outside</button>
        </>,
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Introduction' }),
      );
      await userEvent.dblClick(screen.getAllByText(record.description)[1]);
      const input = screen.getByRole('textbox', { name: 'Introduction' });
      await userEvent.clear(input);
      await userEvent.type(input, 'Demo introduction');
      if (gesture === 'shortcut')
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
      else
        await userEvent.click(screen.getByRole('button', { name: 'Outside' }));
      await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
      expect(
        screen.getByRole('button', { name: 'Introduction' }),
      ).toHaveTextContent(record.description);
      expect(screen.queryByText(enUS.crm.errors.demoReadOnly)).toBeNull();
      await userEvent.click(
        screen.getByRole('button', { name: 'Introduction' }),
      );
      await userEvent.dblClick(screen.getAllByText(record.description)[1]);
      expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveValue(
        record.description,
      );
    },
  );

  it('retains the draft and error for a normal save failure', async () => {
    reason = 'CONVERTED_READ_ONLY';
    await renderFeedback(
      <InlineField
        entity='leads'
        record={record}
        field={{ key: 'name', type: 'text' }}
        label='Name'
        editable
      />,
    );
    await userEvent.dblClick(screen.getByRole('button', { name: 'Name' }));
    const input = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Keep this draft');
    fireEvent.blur(input);
    expect(
      await screen.findByText(enUS.crm.errors.convertedReadOnly),
    ).toBeVisible();
    expect(input).toHaveValue('Keep this draft');
  });

  it('keeps submitted input open without an inline error or success callback', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const view = await renderFeedback(
      <RecordForm
        entity='leads'
        initial={{ name: 'Demo draft', source: 'website', ownerId: 'rep' }}
        onClose={onClose}
        onSaved={onSaved}
      />,
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Save', exact: true }),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', path: 'leads' }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Save', exact: true }),
      ).toBeEnabled(),
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Demo draft');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(view.toasts()).toEqual([]);
  });

  it.each([ErrorNotice, SettingsError])(
    'omits demo errors from the shared notice but retains other failures',
    async (Notice) => {
      const view = await renderFeedback(<Notice error={refusal()} />);
      expect(view.container.textContent).toBe('');
      view.rerender(
        <QueryClientProvider client={new QueryClient()}>
          <Notice error={new Error('Network failure')} />
        </QueryClientProvider>,
      );
      expect(await screen.findByRole('alert')).toBeVisible();
    },
  );

  it('keeps a refused settings confirmation open without a second error', async () => {
    const onConfirm = vi.fn().mockRejectedValue(refusal());
    const onOpenChange = vi.fn();
    await renderFeedback(
      <ConfirmAction
        open
        onOpenChange={onOpenChange}
        title='Delete key'
        description='Delete this key'
        confirmLabel='Delete'
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete', exact: true }),
    );
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
