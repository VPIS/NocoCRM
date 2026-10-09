import type { ReactElement } from 'react';
import { Navigate, useSearchParams } from 'react-router';

// Waiting on me's old address: its suggestions are the inbox's To do view
// now (client/components/crm/inbox-decisions.tsx), the one asked for, by its
// former `entry`, opened there.
export default function DecisionsRedirect(): ReactElement {
  const [params] = useSearchParams();
  const next = new URLSearchParams({
    view: 'todo',
    kind: 'crm-decisions',
  });
  const entry = params.get('entry');
  if (entry) next.set('decision', entry);
  return <Navigate replace to={`/inbox?${next.toString()}`} />;
}
