import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router';
import { currentAddress } from '../components/crm/record-route.js';

// The CRM's pages sat under /crm until 2026-10-19 (record-route.ts). Their
// addresses from before, in links, bookmarks and the notifications and mail
// sent then, open the same page and tab now; each page's own route checks
// access.
export default function LegacyRedirect(): ReactElement {
  const { pathname, search, hash } = useLocation();
  return (
    <Navigate replace to={`${currentAddress(pathname)}${search}${hash}`} />
  );
}
