import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// A note's box lists colleagues on @ and remembers whom a pick names; only
// those whose "@Name" the text still holds are sent with the note.

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
        aria-label='Note'
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
      screen.getByRole('textbox', { name: 'Note' }),
      'Hi @L',
    );
    const names = screen.getAllByRole('option').map((o) => o.textContent);
    expect(names).toEqual(['Li Ming']);
  });

  it('writes the picked name and sends whom the text still names', async () => {
    render(<Box />);
    const box = screen.getByRole('textbox', { name: 'Note' });
    await userEvent.type(box, 'Ask @wa');
    await userEvent.keyboard('{Enter}');
    expect((box as HTMLTextAreaElement).value).toBe('Ask @Wang Fang ');
    expect(screen.queryByRole('listbox')).toBeNull();
    // The layer under the box marks the mention where its text lies.
    const mark = document.querySelector('[aria-hidden] span.bg-info\\/15');
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
    const box = screen.getByRole('textbox', { name: 'Note' });
    await userEvent.type(box, '@');
    expect(screen.getByRole('listbox')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(box);
  });
});
