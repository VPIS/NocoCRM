import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crmZh } from '../../client/locales/crm/index.js';

// An email follow-up step on its card: the draft changed there, sent to the
// record's people (a deal's primary contact, the others copied) through the
// Mail plugin as the person, which accepts the card; without a mailbox, the
// draft is only copied.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  sendMessage: vi.fn(),
  compose: vi.fn(),
  senders: [{ id: 'acc-1', address: 'me@example.com' }] as {
    id: string;
    address: string;
  }[],
}));

vi.mock('@nocobase/app-plugin-mail/client', () => ({
  useMailClient: () => ({
    listIdentities: async () => [
      { id: 'id-1', isPrimary: true, canSend: true, address: 'me@example.com' },
    ],
    sendMessage: state.sendMessage,
  }),
  plainTextToMailHtml: (text: string) => `<p>${text}</p>`,
}));
vi.mock('@nocobase/app-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nocobase/app-client')>()),
  useToaster: () => ({ show: vi.fn() }),
}));
vi.mock('../../client/components/crm/mail.js', () => ({
  useMailSetup: () => ({ senders: state.senders }),
  useMailComposer: () => ({ compose: state.compose, composer: null }),
}));
vi.mock('../../client/components/crm/common.js', () => ({
  ErrorNotice: ({ error }: { error?: unknown }) =>
    error ? <p role='alert'>{String(error)}</p> : null,
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmApi: () => state.api,
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
  };
});

const { EmailStep } = await import('../../client/components/crm/email-step.js');

beforeEach(() => {
  state.api.mockReset();
  state.sendMessage.mockReset();
  state.compose.mockReset();
  state.senders = [{ id: 'acc-1', address: 'me@example.com' }];
  state.sendMessage.mockResolvedValue({ id: 's1', status: 'pending' });
  state.api.mockImplementation(async (path: string) => {
    if (path === 'opportunities/deal-1')
      return {
        data: {
          record: {
            id: 'deal-1',
            contacts: [
              { contactId: 'c-2', primary: false },
              { contactId: 'c-1', primary: true },
            ],
          },
        },
      };
    if (path === 'contacts/c-1')
      return { data: { record: { name: '王芳', email: 'wang@acme.cn' } } };
    if (path === 'contacts/c-2')
      return { data: { record: { name: '李雷', email: 'li@acme.cn' } } };
    if (path === 'leads/lead-1')
      return {
        data: { record: { name: '周晓', email: 'zhou@example.cn' } },
      };
    return { data: {} };
  });
});
afterEach(cleanup);

describe('EmailStep', () => {
  it("sends a deal's email to its primary contact, copying the others, as changed on the card", async () => {
    const onSent = vi.fn().mockResolvedValue(undefined);
    render(
      <EmailStep
        entity='opportunities'
        recordId='deal-1'
        draft={{ subject: '方案沟通', body: '王女士，您好：\n\n……' }}
        editable
        onSent={onSent}
      />,
    );
    const to = screen.getByRole('textbox', { name: '收件人' });
    await waitFor(() =>
      expect((to as HTMLInputElement).value).toBe('王芳 <wang@acme.cn>'),
    );
    expect(
      (screen.getByRole('textbox', { name: '抄送' }) as HTMLInputElement).value,
    ).toBe('李雷 <li@acme.cn>');
    const subject = screen.getByRole('textbox', { name: '主题' });
    await userEvent.clear(subject);
    await userEvent.type(subject, '方案沟通（更新）');
    await userEvent.click(screen.getByRole('button', { name: '发送邮件' }));
    await waitFor(() => expect(onSent).toHaveBeenCalled());
    const sent = state.sendMessage.mock.calls[0][0] as Record<string, unknown>;
    expect(sent).toMatchObject({
      accountId: 'acc-1',
      identityId: 'id-1',
      to: [{ address: 'wang@acme.cn', name: '王芳' }],
      cc: [{ address: 'li@acme.cn', name: '李雷' }],
      subject: '方案沟通（更新）',
    });
    expect(typeof sent.idempotencyKey).toBe('string');
  });

  it('does not accept the card when the provider refuses the email', async () => {
    state.sendMessage.mockResolvedValue({ id: 's1', status: 'failed' });
    const onSent = vi.fn();
    render(
      <EmailStep
        entity='leads'
        recordId='lead-1'
        draft={{ subject: '您好', body: '周先生，您好：' }}
        editable
        onSent={onSent}
      />,
    );
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox', { name: '收件人' }) as HTMLInputElement)
          .value,
      ).toBe('周晓 <zhou@example.cn>'),
    );
    await userEvent.click(screen.getByRole('button', { name: '发送邮件' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onSent).not.toHaveBeenCalled();
  });

  // The plugin's composer takes bare addresses: a name sent with one ends
  // up in the address, which the provider refuses.
  it('opens the composer with bare addresses', async () => {
    render(
      <EmailStep
        entity='opportunities'
        recordId='deal-1'
        draft={{ subject: '方案沟通', body: '……' }}
        editable
        onSent={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox', { name: '收件人' }) as HTMLInputElement)
          .value,
      ).toBe('王芳 <wang@acme.cn>'),
    );
    await userEvent.click(
      screen.getByRole('button', { name: '在邮件窗口中编辑' }),
    );
    expect(state.compose.mock.calls[0][0]).toMatchObject({
      to: 'wang@acme.cn',
      cc: 'li@acme.cn',
    });
  });

  it('offers only to copy the draft without a mailbox', () => {
    state.senders = [];
    render(
      <EmailStep
        entity='leads'
        recordId='lead-1'
        draft={{ subject: '您好', body: '……' }}
        editable
        onSent={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: '发送邮件' })).toBeNull();
    expect(screen.getByRole('button', { name: /复制/u })).toBeTruthy();
  });
});
