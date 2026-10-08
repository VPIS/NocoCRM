import { MailWorkspacePage } from '@nocobase/app-plugin-mail/client';
import type { ReactElement } from 'react';

// The Mail plugin's workspace, as the CRM's Mailbox page: the signed-in
// user's connected mailboxes, read, searched, written and sent from here. The
// plugin owns the page and its wording (its own locale namespace); its
// mailboxes are connected on the Mail accounts page beside it.
export default function CrmMailPage(): ReactElement {
  return <MailWorkspacePage />;
}
