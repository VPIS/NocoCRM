import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router';

// Accounts became companies: the old addresses, from links, bookmarks and
// the notifications sent before, open the same list, record or tab under
// /crm/companies.
export default function CompaniesRedirect(): ReactElement {
  const { pathname, search, hash } = useLocation();
  const to = pathname.replace(/\/crm\/accounts(?=\/|$)/u, '/crm/companies');
  return <Navigate replace to={`${to}${search}${hash}`} />;
}
