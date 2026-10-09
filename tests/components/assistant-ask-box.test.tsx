import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// The overview's ask box: its suggested questions always shown, what it asks
// the panel for, and how it waits for the metadata and the chat.

const state = vi.hoisted(() => ({
  meta: { assistant: true } as { assistant: boolean } | undefined,
  readiness: { state: 'ready' } as
    | { state: 'loading' }
    | { state: 'ready' }
    | { state: 'unavailable'; reason: string },
  panelOpen: false,
  uploads: [] as string[],
}));

// The crm locale's English text by its dotted key.
function english(key: string): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  return typeof value === 'string' ? value : key;
}

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useMetadata: () => ({ data: state.meta }),
    useCrmText: () => ({ text: english, language: 'en-US' }),
  };
});
vi.mock('../../client/components/crm/assistant-state.js', () => ({
  CRM_ASSISTANT: 'crm-assistant',
  useAssistantReadiness: () => state.readiness,
  usePanelOpen: () => state.panelOpen,
}));
// The AI Employee plugin's service: the CRM employee with two models, and an
// upload that answers with the stored file.
const models = [
  { llmService: 'qwen', value: 'qwen-max', label: 'Qwen Max' },
  { llmService: 'openai', value: 'gpt-5', label: 'GPT 5' },
];
vi.mock(
  '../../client/extensions/nocobase-ai/index.js',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../../client/extensions/nocobase-ai/index.js')
      >();
    return {
      ...actual,
      useAI: () => ({
        employees: [{ username: 'crm-assistant', nickname: 'Noco' }],
        models,
        uploadFile: (file: File) => {
          state.uploads.push(file.name);
          return Promise.resolve({
            id: `f-${file.name}`,
            filename: file.name,
            mimetype: file.type,
            size: file.size,
            url: `/files/${file.name}`,
          });
        },
      }),
    };
  },
);

const { AssistantAskBox } =
  await import('../../client/components/crm/assistant-ask-box.js');

const events: Record<string, unknown>[] = [];
const listen = (event: Event): void => {
  events.push((event as CustomEvent<Record<string, unknown>>).detail);
};
const suggestion = (key: string) =>
  screen.getByRole('button', { name: english(`dock.q.${key}`) });

describe("the overview's ask box", () => {
  beforeEach(() => {
    state.meta = { assistant: true };
    state.readiness = { state: 'ready' };
    state.panelOpen = false;
    state.uploads = [];
    events.length = 0;
    localStorage.clear();
    window.addEventListener('crm-assistant', listen);
  });
  afterEach(() => window.removeEventListener('crm-assistant', listen));

  it('lays out its three questions and sends one with a click', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    const list = screen.getByRole('list', {
      name: english('dock.suggestions'),
    });
    expect(list.querySelectorAll('li')).toHaveLength(3);
    await user.click(suggestion('home.deals'));
    await user.click(suggestion('home.followUp'));
    expect(events).toEqual([
      {
        prompt: english('dock.q.home.deals'),
        send: true,
        newConversation: true,
        model: { llmService: 'qwen', model: 'qwen-max' },
      },
      {
        prompt: english('dock.q.home.followUp'),
        send: true,
        newConversation: true,
        model: { llmService: 'qwen', model: 'qwen-max' },
      },
    ]);
  });

  it('sends what is typed with Enter, not while an input method composes, and clears itself', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    const input = screen.getByRole('textbox', {
      name: english('dock.placeholder'),
    });
    await user.type(input, '本月');
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
    expect(events).toHaveLength(0);
    await user.keyboard('{Enter}');
    expect(events).toEqual([
      {
        prompt: '本月',
        send: true,
        newConversation: true,
        model: { llmService: 'qwen', model: 'qwen-max' },
      },
    ]);
    expect(input).toHaveValue('');
  });

  it('moves from the box through its tools to the questions with Tab', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    await user.click(screen.getByRole('textbox'));
    // Then the paperclip and the model; the send button is disabled while
    // the box is empty, so Tab skips it.
    await user.tab();
    expect(
      screen.getByRole('button', { name: english('dock.attach') }),
    ).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole('combobox', { name: english('dock.model') }),
    ).toHaveFocus();
    await user.tab();
    expect(suggestion('home.focus')).toHaveFocus();
  });

  it('keeps its place disabled while the metadata or the chat loads, and goes only when the assistant is off', () => {
    state.meta = undefined;
    const pending = render(<AssistantAskBox />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(suggestion('home.focus')).toBeDisabled();
    pending.unmount();

    state.meta = { assistant: true };
    state.readiness = { state: 'loading' };
    const loading = render(<AssistantAskBox />);
    expect(
      screen.getByRole('textbox', { name: english('dock.placeholder') }),
    ).toBeDisabled();
    loading.unmount();

    state.meta = { assistant: false };
    state.readiness = { state: 'ready' };
    render(<AssistantAskBox />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('says why when the chat cannot start, and sends nothing', async () => {
    const user = userEvent.setup();
    state.readiness = { state: 'unavailable', reason: 'No model is enabled.' };
    render(<AssistantAskBox />);
    expect(
      screen.getByRole('textbox', { name: 'No model is enabled.' }),
    ).toBeDisabled();
    expect(suggestion('home.focus')).toBeDisabled();
    await user.click(suggestion('home.focus'));
    expect(events).toHaveLength(0);
  });

  it('takes focus back when the panel closes with focus left in it', () => {
    state.panelOpen = true;
    const panel = document.createElement('div');
    panel.setAttribute('data-crm-assistant-panel', '');
    const composer = document.createElement('textarea');
    panel.append(composer);
    document.body.append(panel);
    const { rerender } = render(<AssistantAskBox />);
    composer.focus();
    state.panelOpen = false;
    act(() => rerender(<AssistantAskBox />));
    expect(
      screen.getByRole('textbox', { name: english('dock.placeholder') }),
    ).toHaveFocus();
    panel.remove();
  });

  it('grows past one line: Shift+Enter breaks the line, Enter sends both', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    const input = screen.getByRole('textbox', {
      name: english('dock.placeholder'),
    });
    expect(input.tagName).toBe('TEXTAREA');
    await user.type(input, 'First{Shift>}{Enter}{/Shift}second');
    expect(events).toHaveLength(0);
    expect(input).toHaveValue('First\nsecond');
    await user.keyboard('{Enter}');
    expect(events[0]?.prompt).toBe('First\nsecond');
  });

  it('uploads files as they are picked and sends them with the question', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    await user.upload(
      screen.getByTestId('ask-files'),
      new File(['x'], 'brief.pdf', { type: 'application/pdf' }),
    );
    expect(state.uploads).toEqual(['brief.pdf']);
    expect(await screen.findByText('brief.pdf')).toBeTruthy();
    // A file alone is enough to send.
    const send = screen.getByRole('button', { name: english('send') });
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      prompt: '',
      send: true,
      newConversation: true,
      attachments: [
        { uid: 'f-brief.pdf', filename: 'brief.pdf', status: 'done' },
      ],
    });
    // Sent files leave the box.
    expect(screen.queryByText('brief.pdf')).toBeNull();
  });

  it('runs the new conversation on the model picked, remembered in the browser', async () => {
    const user = userEvent.setup();
    const first = render(<AssistantAskBox />);
    await user.click(
      screen.getByRole('combobox', { name: english('dock.model') }),
    );
    await user.click(await screen.findByRole('option', { name: 'GPT 5' }));
    await user.click(suggestion('home.focus'));
    expect(events[0]?.model).toEqual({ llmService: 'openai', model: 'gpt-5' });
    first.unmount();
    render(<AssistantAskBox />);
    expect(
      screen.getByRole('combobox', { name: english('dock.model') }),
    ).toHaveTextContent('GPT 5');
  });
});
