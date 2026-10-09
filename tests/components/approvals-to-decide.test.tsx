import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

// The count beside Approvals in the menu: the approvals submitted to the
// reader and not yet decided, for whoever may decide them.

const state = vi.hoisted(() => ({ api: vi.fn(), canApprove: true }));

vi.mock('@nocobase/app-plugin-authorization/client', () => ({
  useCan: () => ({ can: true }),
}));
vi.mock('@nocobase/app-plugin-notification-in-app/client/inbox', () => ({
  useInboxRefresh: () => undefined,
  useInboxUnreadCount: () => ({ data: 0 }),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmApi: () => state.api,
  useCrmScopeKey: () => ['crm', 'mgr'],
  useMetadata: () => ({
    data: {
      userId: 'mgr',
      users: [{ id: 'mgr', canApprove: state.canApprove }],
    },
  }),
}));

const { useApprovalsToDecide } =
  await import('../../client/components/crm/waiting-count.js');

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  state.api.mockReset();
  state.api.mockResolvedValue({ data: [], total: 3 });
  state.canApprove = true;
});

it('counts the pending approvals submitted to the reader', async () => {
  const { result } = renderHook(() => useApprovalsToDecide(), { wrapper });
  await waitFor(() => expect(result.current).toBe(3));
  expect(state.api).toHaveBeenCalledWith(
    'approvals?approverId=mgr&status=pending&pageSize=1',
  );
});

it('asks nothing for someone who does not decide approvals', () => {
  state.canApprove = false;
  const { result } = renderHook(() => useApprovalsToDecide(), { wrapper });
  expect(result.current).toBe(0);
  expect(state.api).not.toHaveBeenCalled();
});
