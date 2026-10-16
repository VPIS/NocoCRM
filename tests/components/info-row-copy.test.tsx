import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Each particular of a record copies as it reads, from a button its row
// shows on hover.

const { InfoRow } = await import('../../client/pages/crm-detail.js');

afterEach(cleanup);

describe('InfoRow', () => {
  it('copies the value as it reads', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(
      <dl>
        <InfoRow field='phone' label='Phone'>
          <div>13800005217</div>
        </InfoRow>
      </dl>,
    );
    const button = screen.getByRole('button', { name: /copy/i });
    await userEvent.click(button);
    expect(writeText).toHaveBeenCalledWith('13800005217');
    expect(await screen.findByRole('button', { name: /copied/i })).toBeTruthy();
  });

  it("copies what the value says to copy, a website's whole address", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(
      <dl>
        <InfoRow field='website' label='Website'>
          <a
            href='https://www.robam.com/zh'
            data-copy='https://www.robam.com/zh'
          >
            robam.com
          </a>
        </InfoRow>
      </dl>,
    );
    await userEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith('https://www.robam.com/zh');
  });

  it('opens an editable value’s editor from its pencil, as a double-click or Enter does', async () => {
    const opened = vi.fn();
    render(
      <dl>
        <InfoRow field='phone' label='Phone'>
          <div
            role='button'
            tabIndex={0}
            data-edit-trigger=''
            onKeyDown={(event) => {
              if (event.key === 'Enter') opened();
            }}
          >
            13800005217
          </div>
        </InfoRow>
      </dl>,
    );
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(opened).toHaveBeenCalled();
  });
});
