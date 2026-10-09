import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// The assistant's dock at the bottom of the page: what it shows on a page and
// a record, what it asks the panel for, and when it stays out of the way.

const state = vi.hoisted(() => ({
  assistant: true,
  readiness: { state: 'ready' } as
    | { state: 'loading' }
    | { state: 'ready' }
    | { state: 'unavailable'; reason: string },
  panelOpen: false,
  mobile: false,
}));

// The crm locale's English text by its dotted key, with {{name}} filled in.
function english(key: string, options: Record<string, unknown> = {}): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  const textValue = typeof value === 'string' ? value : key;
  return textValue.replace(/\{\{(\w+)\}\}/gu, (_, name: string) =>
    String(options[name] ?? ''),
  );
}

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useMetadata: () => ({ data: { assistant: state.assistant } }),
    useCrmText: () => ({ text: english, language: 'en-US' }),
  };
});
vi.mock('../../client/components/crm/assistant-state.js', () => ({
  useAssistantReadiness: () => state.readiness,
  usePanelOpen: () => state.panelOpen,
}));
vi.mock('../../client/hooks/use-mobile.js', () => ({
  useIsMobile: () => state.mobile,
}));

const { AssistantDock } =
  await import('../../client/components/crm/assistant-dock.js');
const { useAnnounceRecord } =
  await import('../../client/components/crm/current-record.js');

function RecordPage({ name }: { name?: string }) {
  useAnnounceRecord({ entity: 'leads', recordId: 'l1', name });
  return null;
}

const events: Record<string, unknown>[] = [];
const listen = (event: Event): void => {
  events.push((event as CustomEvent<Record<string, unknown>>).detail);
};

function renderDock(path = '/', record?: { name?: string }) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {record && <RecordPage name={record.name} />}
      <AssistantDock />
    </MemoryRouter>,
  );
}

describe('the assistant dock', () => {
  beforeEach(() => {
    state.assistant = true;
    state.readiness = { state: 'ready' };
    state.panelOpen = false;
    state.mobile = false;
    events.length = 0;
    window.addEventListener('crm-assistant', listen);
  });
  afterEach(() => window.removeEventListener('crm-assistant', listen));

  it("shows the page's suggested questions when focused, and sends one with a click", async () => {
    const user = userEvent.setup();
    renderDock('/');
    const input = screen.getByRole('textbox', {
      name: english('dock.placeholder'),
    });
    expect(screen.queryByRole('list')).toBeNull();
    await user.click(input);
    const list = screen.getByRole('list', {
      name: english('dock.suggestions'),
    });
    expect(list.querySelectorAll('li')).toHaveLength(3);
    await user.click(
      screen.getByRole('button', { name: english('dock.q.home.focus') }),
    );
    expect(events).toEqual([
      {
        prompt: english('dock.q.home.focus'),
        send: true,
        newConversation: true,
      },
    ]);
  });

  it("asks about the page's record, its kind named in the placeholder, and clears itself", async () => {
    const user = userEvent.setup();
    renderDock('/crm/leads/l1', { name: 'Tang Rui' });
    const input = screen.getByRole('textbox', {
      name: 'Ask anything about this lead…',
    });
    await user.click(input);
    // The lead's own questions.
    expect(
      screen.getByRole('button', { name: english('dock.q.lead.summary') }),
    ).toBeTruthy();
    const send = screen.getByRole('button', { name: english('send') });
    expect(send).toBeDisabled();
    await user.type(input, 'Who decides?');
    // Typing hides the suggestions.
    expect(screen.queryByRole('list')).toBeNull();
    await user.click(send);
    expect(events).toEqual([
      {
        prompt: 'Who decides?',
        send: true,
        newConversation: true,
        entity: 'leads',
        recordId: 'l1',
        name: 'Tang Rui',
      },
    ]);
    expect(input).toHaveValue('');
  });

  it('sends with Enter, but not while an input method is composing', async () => {
    const user = userEvent.setup();
    renderDock('/crm/tasks');
    const input = screen.getByRole('textbox');
    await user.type(input, '逾期');
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
    expect(events).toHaveLength(0);
    await user.keyboard('{Enter}');
    expect(events).toHaveLength(1);
    expect(events[0]?.prompt).toBe('逾期');
  });

  it('moves from the input to the suggestions with Tab', async () => {
    const user = userEvent.setup();
    renderDock('/');
    await user.click(screen.getByRole('textbox'));
    // The send button is disabled while the box is empty, so Tab skips it.
    await user.tab();
    expect(
      screen.getByRole('button', { name: english('dock.q.home.focus') }),
    ).toHaveFocus();
    expect(screen.getByRole('list')).toBeTruthy();
  });

  it('keeps the text when Esc closes the suggestions', async () => {
    const user = userEvent.setup();
    renderDock('/crm/leads');
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(screen.getByRole('list')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('list')).toBeNull();
    expect(input).toHaveFocus();
    await user.type(input, 'draft');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('draft');
  });

  it('stays out of the way: assistant off, chat loading, panel open, filled pages', () => {
    state.assistant = false;
    const off = renderDock('/');
    expect(screen.queryByRole('textbox')).toBeNull();
    off.unmount();

    state.assistant = true;
    state.readiness = { state: 'loading' };
    const loading = renderDock('/');
    expect(screen.queryByRole('textbox')).toBeNull();
    loading.unmount();

    state.readiness = { state: 'ready' };
    for (const path of ['/crm/mail', '/inbox']) {
      const page = renderDock(path);
      expect(screen.queryByRole('textbox')).toBeNull();
      page.unmount();
    }
    const accounts = renderDock('/crm/mail/accounts');
    expect(screen.getByRole('textbox')).toBeTruthy();
    accounts.unmount();

    state.panelOpen = true;
    renderDock('/');
    // Hidden, not unmounted, so text being typed survives.
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(
      screen.getByRole('textbox', { hidden: true }).closest('[hidden]'),
    ).toBeTruthy();
  });

  it('says why when the chat cannot start, and sends nothing', async () => {
    const user = userEvent.setup();
    state.readiness = { state: 'unavailable', reason: 'No model is enabled.' };
    renderDock('/');
    const input = screen.getByRole('textbox', { name: 'No model is enabled.' });
    expect(input).toBeDisabled();
    await user.click(input);
    expect(screen.queryByRole('list')).toBeNull();
    expect(events).toHaveLength(0);
  });

  it('is a round button on a phone that opens a new conversation from the record', async () => {
    const user = userEvent.setup();
    state.mobile = true;
    renderDock('/crm/leads/l1', { name: 'Tang Rui' });
    expect(screen.queryByRole('textbox')).toBeNull();
    await user.click(
      screen.getByRole('button', { name: english('dock.open') }),
    );
    expect(events).toEqual([
      {
        prompt: '',
        newConversation: true,
        entity: 'leads',
        recordId: 'l1',
        name: 'Tang Rui',
      },
    ]);
  });

  it('asks about the newest record when one record page replaces another', async () => {
    const user = userEvent.setup();
    function Swap({ first }: { first: boolean }) {
      return (
        <>
          {first ? (
            <RecordPage key='a' name='Lin Yue' />
          ) : (
            <RecordPage key='b' name='Wu Yichen' />
          )}
          <AssistantDock />
        </>
      );
    }
    const { rerender } = render(
      <MemoryRouter initialEntries={['/crm/leads/l1']}>
        <Swap first />
      </MemoryRouter>,
    );
    act(() =>
      rerender(
        <MemoryRouter initialEntries={['/crm/leads/l1']}>
          <Swap first={false} />
        </MemoryRouter>,
      ),
    );
    const input = screen.getByRole('textbox', {
      name: 'Ask anything about this lead…',
    });
    await user.type(input, 'Next?{Enter}');
    // The page that went away withdrew only its own announcement.
    expect(events[0]?.name).toBe('Wu Yichen');
  });
});
