import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// A comment's box lists colleagues on @ and remembers whom a pick names; only
// those whose "@Name" the text still holds are sent with the comment.

const users = [
  { id: 'me', name: 'Ada', disabled: false, roles: ['sales-representative'] },
  { id: 'li', name: 'Li Ming', disabled: false, roles: ['sales-manager'] },
  {
    id: 'wang',
    name: 'Wang Fang',
    disabled: false,
    roles: ['sales-representative'],
  },
  {
    id: 'gone',
    name: 'Lin Old',
    disabled: true,
    roles: ['sales-representative'],
  },
  { id: 'norole', name: 'Liu Guest', disabled: false, roles: [] },
];

vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useMetadata: () => ({ data: { userId: 'me', users } }),
}));

const { MentionTextarea } =
  await import('../../client/components/crm/mention-textarea.js');
const { mentionsIn } = await import('../../client/components/crm/mentions.js');

let sent: { text: string; mentions: string[] } | undefined;
function Box(): ReactElement {
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  return (
    <>
      <MentionTextarea
        aria-label='Comment'
        value={text}
        onChange={setText}
        mentions={mentions}
        onMentionsChange={setMentions}
      />
      <button
        type='button'
        onClick={() => {
          sent = { text, mentions: mentionsIn(text, mentions, users) };
        }}
      >
        Add
      </button>
    </>
  );
}

afterEach(() => {
  cleanup();
  sent = undefined;
});

describe('MentionTextarea', () => {
  it('lists active colleagues with a role, other than the writer, on @', async () => {
    render(<Box />);
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Comment' }),
      'Hi @L',
    );
    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names).toEqual(['Li Ming']);
  });

  // Chinese text runs on without a space before the @, at the end or in the
  // middle of what is written; an email address is no mention.
  it('lists them after Chinese text and in the middle, not inside an email address', async () => {
    render(<Box />);
    const box = screen.getByRole('textbox', { name: 'Comment' });
    await userEvent.type(box, '请@L');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Li Ming',
    ]);
    await userEvent.keyboard('{Escape}');
    await userEvent.clear(box);
    await userEvent.type(box, '跟进后告诉我');
    // Back into the middle of the text, after 跟进.
    (box as HTMLTextAreaElement).setSelectionRange(2, 2);
    await userEvent.type(box, '@L', {
      initialSelectionStart: 2,
      initialSelectionEnd: 2,
    });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.keyboard('{Escape}');
    await userEvent.clear(box);
    await userEvent.type(box, 'mail li@L');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('writes the picked name and sends whom the text still names', async () => {
    render(<Box />);
    const box = screen.getByRole('textbox', { name: 'Comment' });
    await userEvent.type(box, 'Ask @wa');
    await userEvent.keyboard('{Enter}');
    expect((box as HTMLTextAreaElement).value).toBe('Ask @Wang Fang ');
    expect(screen.queryByRole('listbox')).toBeNull();
    // The layer under the box draws the mention, in its colour, where its
    // text lies.
    const mark = document.querySelector('[aria-hidden] span.text-info');
    expect(mark?.textContent).toBe('@Wang Fang');
    await userEvent.type(box, 'and @li');
    await userEvent.click(screen.getByRole('option', { name: 'Li Ming' }));
    expect((box as HTMLTextAreaElement).value).toBe(
      'Ask @Wang Fang and @Li Ming ',
    );
    // A name taken out of the text is not sent.
    await userEvent.clear(box);
    await userEvent.type(box, 'Only @Li Ming now');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(sent?.mentions).toEqual(['li']);
  });

  it('closes the list on Escape without leaving the box', async () => {
    render(<Box />);
    const box = screen.getByRole('textbox', { name: 'Comment' });
    await userEvent.type(box, '@');
    expect(screen.getByRole('listbox')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(box);
  });
});
