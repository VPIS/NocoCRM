import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

// A long text in a record's particulars previews in the column and opens
// beside it, whole, to read and to edit; an empty one opens on its editor.

const { FoldingText, LongTextField } =
  await import('../../client/components/crm/long-text-field.js');

afterEach(cleanup);

const long = `第一段介绍。\n\n${'很长的公司介绍。'.repeat(40)}\n\n最后一句。`;

describe('LongTextField', () => {
  it('opens the whole text beside the field and saves an edit there on Cmd+Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(
      <LongTextField
        value={long}
        label='Introduction'
        editable
        onSave={onSave}
      />,
    );
    // The last sentence is in the preview's text but only the pop-up shows
    // it to read; a double-click there edits it, as every field.
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Introduction' }));
    const [, whole] = screen.getAllByText('最后一句。');
    await userEvent.dblClick(whole);
    const box = screen.getByRole('textbox', { name: 'Introduction' });
    expect((box as HTMLTextAreaElement).value).toBe(long);
    await userEvent.clear(box);
    await userEvent.type(box, '新的介绍');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(onSave).toHaveBeenCalledWith('新的介绍');
    // Saved, it reads again rather than edits.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('leaves the text as it was on Escape', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(
      <LongTextField
        value='短介绍'
        label='Introduction'
        editable
        onSave={onSave}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Introduction' }));
    const [, whole] = screen.getAllByText('短介绍');
    await userEvent.dblClick(whole);
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Introduction' }),
      '改了',
    );
    await userEvent.keyboard('{Escape}');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('edits on a double-click in the pop-up, as every field does', async () => {
    render(
      <LongTextField
        value={long}
        label='Introduction'
        editable
        onSave={vi.fn().mockResolvedValue(true)}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Introduction' }));
    const [, whole] = screen.getAllByText('最后一句。');
    await userEvent.dblClick(whole);
    expect(screen.getByRole('textbox', { name: 'Introduction' })).toBeTruthy();
  });

  it('keeps the editor open when the save is refused', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(
      <LongTextField
        value='短介绍'
        label='Introduction'
        editable
        error='Too long'
        onSave={onSave}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Introduction' }));
    const [, whole] = screen.getAllByText('短介绍');
    await userEvent.dblClick(whole);
    const box = screen.getByRole('textbox', { name: 'Introduction' });
    await userEvent.type(box, '加长');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(onSave).toHaveBeenCalledWith('短介绍加长');
    expect(screen.getByRole('textbox', { name: 'Introduction' })).toBeTruthy();
  });

  it('opens an empty one straight into its editor, and offers no edit to a reader', async () => {
    render(
      <LongTextField
        value=''
        label='Introduction'
        editable
        placeholder='Add Introduction'
        onSave={vi.fn().mockResolvedValue(true)}
      />,
    );
    await userEvent.click(screen.getByText('Add Introduction'));
    expect(screen.getByRole('textbox', { name: 'Introduction' })).toBeTruthy();
    cleanup();
    render(
      <LongTextField
        value={long}
        label='Introduction'
        editable={false}
        onSave={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Introduction' }));
    const [, whole] = screen.getAllByText('最后一句。');
    await userEvent.dblClick(whole);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

// A long text with room unfolds in place on a click and folds back on
// another; a double-click, the field's edit, leaves it as it was.
describe('FoldingText', () => {
  it('unfolds on a click, folds on another, and stays put on a double-click', async () => {
    // Laid out as overflowing: taller than its five lines.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly report: () => void) {}
        observe(): void {
          this.report();
        }
        disconnect(): void {}
      },
    );
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
    try {
      render(<FoldingText value={long} />);
      const text = screen.getByText('最后一句。').closest('[aria-expanded]')!;
      expect(text.getAttribute('aria-expanded')).toBe('false');
      await userEvent.click(text);
      await vi.waitFor(() =>
        expect(text.getAttribute('aria-expanded')).toBe('true'),
      );
      await userEvent.click(text);
      await vi.waitFor(() =>
        expect(text.getAttribute('aria-expanded')).toBe('false'),
      );
      await userEvent.dblClick(text);
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(text.getAttribute('aria-expanded')).toBe('false');
    } finally {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});
