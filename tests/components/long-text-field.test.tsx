import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

// A long text in a record's particulars previews in the column and opens
// beside it, whole, to read and to edit; an empty one opens on its editor.

const { LongTextField } =
  await import('../../client/components/crm/long-text-field.js');

afterEach(cleanup);

const long = `第一段介绍。\n\n${'很长的公司介绍。'.repeat(40)}\n\n最后一句。`;

describe('LongTextField', () => {
  it('opens the whole text beside the field and saves an edit there', async () => {
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
    // it to read; the editor waits behind Edit.
    expect(screen.queryByRole('textbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Introduction' }));
    expect(screen.getAllByText('最后一句。').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /edit|编辑/i }));
    const box = screen.getByRole('textbox', { name: 'Introduction' });
    expect((box as HTMLTextAreaElement).value).toBe(long);
    await userEvent.clear(box);
    await userEvent.type(box, '新的介绍');
    await userEvent.click(screen.getByRole('button', { name: /save|保存/i }));
    expect(onSave).toHaveBeenCalledWith('新的介绍');
    // Saved, it reads again rather than edits.
    expect(screen.queryByRole('textbox')).toBeNull();
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
    await userEvent.click(screen.getByRole('button', { name: /edit|编辑/i }));
    await userEvent.click(screen.getByRole('button', { name: /save|保存/i }));
    expect(onSave).toHaveBeenCalledWith('短介绍');
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
    expect(screen.queryByRole('button', { name: /edit|编辑/i })).toBeNull();
  });
});
