import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { RecordForm } from '../../client/components/crm/form.js';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import { crmEn, crmZh } from '../../client/locales/crm/index.js';
import { csvCell, parseCsv } from '../../client/components/crm/csv.js';
// The task form's search chips read through React Query.
const withQueries = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);
const state = vi.hoisted(() => ({
  api: vi.fn(),
  refresh: vi.fn(),
  locale: 'en',
  assistant: false,
  // Further people, such as an approver, for the tests that need them.
  extraUsers: [] as {
    id: string;
    name: string;
    roles: string[];
    disabled: boolean;
    canApprove: boolean;
  }[],
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmApi: () => state.api,
    useCrmScopeKey: () => ['test'],
    useRefresh: () => state.refresh,
    // A picker names its preset value through one record read.
    useRecord: (entity: string, id: unknown) => ({
      data:
        entity && id
          ? {
              record: { id, name: id === 'lead-a' ? 'Lead A' : String(id) },
              titles: {},
              names: {},
            }
          : undefined,
    }),
    useCrmQuery: () => ({
      data: [{ value: 'CN-11', label: 'Beijing' }],
    }),
    useCrmText: () => ({
      text: (key: string): string => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            state.locale === 'zh' ? crmZh : crmEn,
          );
        return typeof value === 'string' ? value : key;
      },
      language: state.locale === 'zh' ? 'zh-CN' : 'en-US',
    }),
    useMetadata: () => ({
      data: {
        userId: 'rep',
        assign: false,
        assistant: state.assistant,
        settings: defaultSettings,
        definitions,
        users: [
          {
            id: 'rep',
            name: 'Representative',
            roles: ['sales-representative'],
            disabled: false,
            canApprove: false,
          },
          ...state.extraUsers,
        ],
        permissions: Object.fromEntries(
          Object.keys(definitions).map((entity) => [
            entity,
            { create: { fields: '*' }, update: { fields: '*' } },
          ]),
        ),
      },
    }),
  };
});
vi.mock('../../client/components/crm/common.js', () => ({
  Loading: () => null,
  ErrorNotice: ({ error }: { error?: unknown }) =>
    error ? <p role='alert'>Could not save</p> : null,
}));
beforeEach(() => {
  state.api.mockReset();
  state.refresh.mockReset();
  state.locale = 'en';
  state.assistant = false;
  state.extraUsers = [];
});
describe('CRM forms and file interchange', () => {
  it('lets the AI follow a new lead up at once, unless unticked', async () => {
    state.assistant = true;
    state.api.mockResolvedValue({ data: { id: 'saved', name: 'Ada' } });
    render(<RecordForm entity='leads' onClose={vi.fn()} />);
    const option = screen.getByRole('checkbox', {
      name: 'AI follows up at once',
    });
    expect(option).toBeChecked();
    await userEvent.click(option);
    await userEvent.type(screen.getByLabelText('Name'), 'Ada');
    await userEvent.click(screen.getByRole('combobox', { name: 'Source' }));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Website' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Save', exact: true }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'leads?followUp=false',
        'POST',
        expect.objectContaining({ name: 'Ada' }),
      ),
    );
  });

  it('offers no follow-up while the AI is off', () => {
    render(<RecordForm entity='leads' onClose={vi.fn()} />);
    expect(
      screen.queryByRole('checkbox', { name: 'AI follows up at once' }),
    ).toBeNull();
  });

  it('saves a lead, refreshes lists and closes', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    state.api.mockResolvedValue({ data: { id: 'saved', name: 'Ada' } });
    render(<RecordForm entity='leads' onClose={onClose} onSaved={onSaved} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Ada');
    // Source has no default: saving without one is refused on the client.
    await userEvent.click(
      screen.getByRole('button', { name: 'Save', exact: true }),
    );
    expect(state.api).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Source' }));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Website' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Save', exact: true }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'leads',
        'POST',
        expect.objectContaining({
          name: 'Ada',
          ownerId: 'rep',
          source: 'website',
        }),
      ),
    );
    // A new lead is new; the server sets that, the form does not ask.
    expect(state.api.mock.calls[0][2]).not.toHaveProperty('status');
    expect(
      screen.queryByRole('combobox', { name: 'Status' }),
    ).not.toBeInTheDocument();
    expect(state.refresh).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith({ id: 'saved', name: 'Ada' });
  });
  it("asks an opportunity's amount as one field, its currency leading the number", () => {
    render(<RecordForm entity='opportunities' onClose={vi.fn()} />);
    const amount = screen.getByLabelText('Amount');
    const currency = screen.getByRole('combobox', { name: 'Currency' });
    // One label, Amount; the currency sits in the same block, before it.
    expect(
      screen.queryByText('Currency', { selector: 'label span' }),
    ).toBeNull();
    const block = amount.closest('.space-y-1\\.5') as HTMLElement;
    expect(block.contains(currency)).toBe(true);
    expect(
      currency.compareDocumentPosition(amount) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
  it("puts a contact's yes / no fields side by side in one cell", () => {
    render(<RecordForm entity='contacts' onClose={vi.fn()} />);
    const employed = screen.getByRole('checkbox', { name: /^Employed/ });
    const primary = screen.getByRole('checkbox', { name: /^Primary contact/ });
    // The grid's cell that holds the box.
    const cell = (box: HTMLElement): Element | null => {
      let node: Element | null = box;
      while (node && !node.parentElement?.classList.contains('grid'))
        node = node.parentElement;
      return node;
    };
    expect(cell(employed)).not.toBeNull();
    expect(cell(employed)).toBe(cell(primary));
  });
  // Editing keeps the whole form, a task opened from a lead keeps its lead.
  it('keeps a lead task linked in the whole form when editing it', () => {
    render(
      <RecordForm
        entity='tasks'
        id='task-a'
        initial={{ leadId: 'lead-a', name: 'Call back' }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Lead' })).toBeInTheDocument();
  });
  it('creates a task from a title and chips', async () => {
    state.locale = 'en';
    state.api.mockResolvedValue({ data: { id: 'saved', name: 'Call back' } });
    const onClose = vi.fn();
    render(<RecordForm entity='tasks' onClose={onClose} />, {
      wrapper: withQueries,
    });
    const add = screen.getByRole('button', { name: 'Add' });
    expect(add).toBeDisabled();
    for (const chip of ['Time', 'Record', 'Participants'])
      expect(screen.getByRole('button', { name: chip })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Call back' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), {
      target: { value: 'About the quote' },
    });
    await userEvent.click(add);
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'tasks',
        'POST',
        expect.objectContaining({
          name: 'Call back',
          description: 'About the quote',
          // Whoever sells owns what they create.
          ownerId: 'rep',
        }),
      ),
    );
    expect(onClose).toHaveBeenCalled();
  });
  // A new approval opens as a new task does: a title and a description
  // over chips, saved as a draft or submitted to its approver at once.
  it('creates an approval from a title and chips, submitting it once an approver is picked', async () => {
    state.extraUsers = [
      {
        id: 'mgr',
        name: 'Manager',
        roles: ['sales-manager'],
        disabled: false,
        canApprove: true,
      },
    ];
    state.api.mockResolvedValue({ data: { id: 'ap-1', name: 'Discount' } });
    const run = vi.fn().mockResolvedValue(undefined);
    render(
      <RecordForm
        entity='approvals'
        initial={{ opportunityId: 'deal-1' }}
        titles={{ 'deal-1': 'Big deal' }}
        andThen={{ label: 'Save and submit', run }}
        onClose={vi.fn()}
      />,
      { wrapper: withQueries },
    );
    const draft = screen.getByRole('button', { name: 'Save draft' });
    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(draft).toBeDisabled();
    // Opened from the deal: the deal is that one.
    expect(screen.getByRole('button', { name: 'Big deal' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Subject' }), {
      target: { value: '15% discount' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Approval topic' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Discount' }),
    );
    expect(draft).toBeEnabled();
    // Submitting needs an approver.
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Approver' }));
    await userEvent.click(
      await screen.findByRole('button', { name: 'Manager' }),
    );
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'approvals',
        'POST',
        expect.objectContaining({
          name: '15% discount',
          topic: 'discount',
          opportunityId: 'deal-1',
          approverId: 'mgr',
        }),
      ),
    );
    await waitFor(() => expect(run).toHaveBeenCalled());
  });
  it('shows a task time as a date and a 24-hour time of day, with no end', async () => {
    state.locale = 'en';
    const dueAt = new Date(2026, 8, 24, 14, 30).toISOString();
    render(
      <RecordForm entity='tasks' initial={{ dueAt }} onClose={vi.fn()} />,
      {
        wrapper: withQueries,
      },
    );
    const time = screen.getByRole('button', { name: 'Time' });
    expect(time).toHaveTextContent('2026-09-24 14:30');
    await userEvent.click(time);
    // Picked from an hour and a minute column, not typed or a native
    // control, whose clock would read 02:30 PM in English.
    const hours = await screen.findByRole('listbox', { name: 'Hour' });
    const minutes = screen.getByRole('listbox', { name: 'Minute' });
    expect(
      within(hours).getByRole('option', { selected: true }),
    ).toHaveTextContent('14');
    expect(
      within(minutes).getByRole('option', { selected: true }),
    ).toHaveTextContent('30');
    expect(screen.queryByLabelText('End time')).not.toBeInTheDocument();
  });
  it('renders Chinese labels and keeps a failed submission editable', async () => {
    state.locale = 'zh';
    state.api.mockRejectedValue(new Error('failed'));
    const onClose = vi.fn();
    render(<RecordForm entity='leads' onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('姓名'), {
      target: { value: '新线索' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: '保存', exact: true }),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Could not save'),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('姓名')).toHaveValue('新线索');
  });
  it('opens a lead the AI captured prefilled, marking its doubts', async () => {
    state.api.mockResolvedValue({ data: { id: 'captured' } });
    render(
      <RecordForm
        entity='leads'
        initial={{ name: 'Zhou Li', source: 'exhibition' }}
        review={['name']}
        notice={<p>Filled in by the AI</p>}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Filled in by the AI')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Zhou Li');
    // The doubt sits beside its field.
    expect(screen.getAllByText('Check')).toHaveLength(1);
    await userEvent.click(
      screen.getByRole('button', { name: 'Save', exact: true }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'leads',
        'POST',
        expect.objectContaining({ name: 'Zhou Li', source: 'exhibition' }),
      ),
    );
  });
  it('tells an AI-filled form which required fields are still empty', async () => {
    render(
      <RecordForm
        entity='leads'
        initial={{ name: 'Wang Lei' }}
        review={[]}
        notice={(unfilled) => <p>Still needed: {unfilled.join(', ')}</p>}
        onClose={vi.fn()}
      />,
    );
    // The owner defaults to the reader; the source is the one left empty.
    expect(screen.getByText('Still needed: source')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Source' }));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Website' }),
    );
    expect(screen.getByText('Still needed:')).toBeInTheDocument();
  });
  it('opens a new lead with the main fields, the rest behind More', async () => {
    render(
      <RecordForm
        entity='leads'
        initial={{ city: 'Hangzhou' }}
        onClose={vi.fn()}
      />,
    );
    // A field with a value stays out; an empty one waits behind More.
    expect(screen.getByLabelText('City')).toHaveValue('Hangzhou');
    expect(screen.queryByLabelText('Website')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^More:/ }));
    expect(screen.getByLabelText('Website')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fewer fields' }));
    expect(screen.queryByLabelText('Website')).not.toBeInTheDocument();
  });
  it('preserves CSV text and neutralizes spreadsheet formulas', () => {
    const values = [
      'Jane, Doe',
      'A "quoted" company',
      'Line one\nLine two',
      '中文',
    ];
    expect(
      parseCsv('\uFEFF' + values.map(csvCell).join(',') + '\r\n')[0],
    ).toEqual(values);
    expect(csvCell('=HYPERLINK("bad")')).toMatch(/^"'/);
    expect(() => parseCsv('"unfinished')).toThrow('invalidCsv');
  });
});
