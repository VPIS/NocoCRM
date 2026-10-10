import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// The overview's ask box: its suggested questions always shown, what it asks
// the panel for, and how it waits for the metadata and the chat.

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
    useCrmText: () => ({ text: english, language: 'en-US' }),
  };
});
// The assistant on the Agents plugin, with two models (tests/setup/agent-chat-fake).
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) =>
  (await import('../setup/agent-chat-fake.js')).fakeChatModule(
    await importOriginal(),
  ),
);
const { chatFake } = await import('../setup/agent-chat-fake.js');
const QWEN = { modelService: 'qwen', model: 'qwen-max' };

const { AssistantAskBox } =
  await import('../../client/components/crm/assistant-ask-box.js');

// What was asked of the assistant: each question as created and sent.
function asked(): Record<string, unknown>[] {
  return chatFake.sent.map((message, index) => ({
    text: message.content,
    model: chatFake.created[index]?.model,
    files: message.attachmentIds ?? [],
  }));
}
const suggestion = (key: string) =>
  screen.getByRole('button', { name: english(`dock.q.${key}`) });

describe("the overview's ask box", () => {
  beforeEach(() => {
    chatFake.open = false;
    chatFake.reset();
    localStorage.clear();
  });

  it('lays out its three questions and sends one with a click', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    const list = screen.getByRole('list', {
      name: english('dock.suggestions'),
    });
    expect(list.querySelectorAll('li')).toHaveLength(3);
    await user.click(suggestion('home.deals'));
    // One question at a time: the box waits until it went.
    await waitFor(() => expect(asked()).toHaveLength(1));
    await waitFor(() => expect(suggestion('home.followUp')).toBeEnabled());
    await user.click(suggestion('home.followUp'));
    await waitFor(() =>
      expect(asked()).toEqual([
        { text: english('dock.q.home.deals'), model: QWEN, files: [] },
        { text: english('dock.q.home.followUp'), model: QWEN, files: [] },
      ]),
    );
  });

  it('sends what is typed with Enter, not while an input method composes, and clears itself', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    const input = screen.getByRole('textbox', {
      name: english('dock.placeholder'),
    });
    await user.type(input, '本月');
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true });
    expect(chatFake.created).toHaveLength(0);
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('');
    await waitFor(() =>
      expect(asked()).toEqual([{ text: '本月', model: QWEN, files: [] }]),
    );
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

  it('keeps its place disabled while the agents load', () => {
    chatFake.loading = true;
    render(<AssistantAskBox />);
    expect(
      screen.getByRole('textbox', { name: english('dock.placeholder') }),
    ).toBeDisabled();
    expect(suggestion('home.focus')).toBeDisabled();
  });

  it('says why when the chat cannot start, and sends nothing', async () => {
    const user = userEvent.setup();
    // No agent at all: the assistant is not set up.
    chatFake.agents = [];
    render(<AssistantAskBox />);
    expect(
      screen.getByRole('textbox', { name: english('agentPanel.notSetUp') }),
    ).toBeDisabled();
    expect(suggestion('home.focus')).toBeDisabled();
    await user.click(suggestion('home.focus'));
    expect(chatFake.created).toHaveLength(0);
  });

  it('takes focus back when the panel closes with focus left in it', () => {
    chatFake.open = true;
    const panel = document.createElement('div');
    panel.setAttribute('data-crm-agent-panel', '');
    const composer = document.createElement('textarea');
    panel.append(composer);
    document.body.append(panel);
    const { rerender } = render(<AssistantAskBox />);
    composer.focus();
    // The panel unmounts as it closes, taking the focused composer along.
    chatFake.open = false;
    panel.remove();
    act(() => rerender(<AssistantAskBox />));
    expect(
      screen.getByRole('textbox', { name: english('dock.placeholder') }),
    ).toHaveFocus();
  });

  it('grows past one line: Shift+Enter breaks the line, Enter sends both', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    const input = screen.getByRole('textbox', {
      name: english('dock.placeholder'),
    });
    expect(input.tagName).toBe('TEXTAREA');
    await user.type(input, 'First{Shift>}{Enter}{/Shift}second');
    expect(chatFake.created).toHaveLength(0);
    expect(input).toHaveValue('First\nsecond');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(asked()[0]?.text).toBe('First\nsecond'));
  });

  it('uploads files as they are picked and sends them with the question', async () => {
    const user = userEvent.setup();
    render(<AssistantAskBox />);
    await user.upload(
      screen.getByTestId('ask-files'),
      new File(['x'], 'brief.pdf', { type: 'application/pdf' }),
    );
    expect(await screen.findByText('brief.pdf')).toBeTruthy();
    // A file alone is enough to send.
    const send = screen.getByRole('button', { name: english('send') });
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);
    await waitFor(() =>
      expect(asked()).toEqual([
        { text: '', model: QWEN, files: ['f-brief.pdf'] },
      ]),
    );
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
    await waitFor(() =>
      expect(asked()[0]?.model).toEqual({
        modelService: 'openai',
        model: 'gpt-5',
      }),
    );
    first.unmount();
    render(<AssistantAskBox />);
    expect(
      screen.getByRole('combobox', { name: english('dock.model') }),
    ).toHaveTextContent('GPT 5');
  });
});
