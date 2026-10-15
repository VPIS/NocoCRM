import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router';

// Auto follow-up became Agent work: its old addresses, from links and
// bookmarks, open the same tab under /crm/agent-work.
export default function AgentWorkRedirect(): ReactElement {
  const { pathname, search, hash } = useLocation();
  const to = pathname.replace(/\/crm\/agents(?=\/|$)/u, '/crm/agent-work');
  return <Navigate replace to={`${to}${search}${hash}`} />;
}
