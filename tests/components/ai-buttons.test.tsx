import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { crmZh } from '../../client/locales/crm/index.js';

// The buttons asking the AI to work on a card or its chip: without a model
// they stay, greyed, their hover saying why, and asking nothing.

vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({
    text: (key: string): string => {
      const value = key
        .split('.')
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown>)?.[part],
          crmZh,
        );
      return typeof value === 'string' ? value : key;
    },
    language: 'zh-CN',
  }),
}));

const { RunButton, RerunButton } =
  await import('../../client/components/crm/ai-buttons.js');

const reason = '还没有配置 AI 模型，请联系管理员。';

describe('a button asking the AI', () => {
  it('runs it the first time when there is a model', async () => {
    const ask = vi.fn();
    render(
      <RunButton asks busy={false} onAsk={ask}>
        运行 线索跟进
      </RunButton>,
    );
    const button = screen.getByRole('button', { name: '运行 线索跟进' });
    expect(button.getAttribute('aria-disabled')).toBeNull();
    await userEvent.click(button);
    expect(ask).toHaveBeenCalledOnce();
  });

  it('stays greyed without a model, its hover saying why', async () => {
    const ask = vi.fn();
    render(
      <RunButton asks={false} busy={false} onAsk={ask}>
        运行 线索跟进
      </RunButton>,
    );
    const button = screen.getByRole('button', { name: '运行 线索跟进' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    await userEvent.click(button);
    expect(ask).not.toHaveBeenCalled();
    await userEvent.hover(button);
    expect(await screen.findByText(reason)).toBeTruthy();
  });

  it('runs it again at the chip, or says why it cannot', async () => {
    const ask = vi.fn();
    const { unmount } = render(
      <RerunButton
        asks
        busy={false}
        onAsk={ask}
        label='重新运行线索跟进'
        hint='重新运行线索跟进'
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: '重新运行线索跟进' }),
    );
    expect(ask).toHaveBeenCalledOnce();
    unmount();

    render(
      <RerunButton
        asks={false}
        busy={false}
        onAsk={ask}
        label='重新运行线索跟进'
        hint='重新运行线索跟进'
      />,
    );
    const again = screen.getByRole('button', { name: '重新运行线索跟进' });
    expect(again.getAttribute('aria-disabled')).toBe('true');
    await userEvent.click(again);
    expect(ask).toHaveBeenCalledOnce();
    await userEvent.hover(again);
    expect(await screen.findByText(reason)).toBeTruthy();
  });
});
