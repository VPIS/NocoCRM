import { MailAccountsPage } from '@nocobase/app-plugin-mail/client';
import type { ReactElement } from 'react';

// The Mail plugin's account page: connect a mailbox (an IMAP/SMTP server from
// `mail.providers`, or Google and Microsoft through OAuth, which return here
// through `mail.oauthReturnUrl`), set its first sync date, signatures,
// templates and labels, and suspend or remove it. Credentials stay on the
// server; the page shows none.
// The plugin's page ends with little room at its bottom; 6rem more lets its
// last row scroll above the assistant's dock.
export default function CrmMailAccountsPage(): ReactElement {
  return (
    <div className='pb-24'>
      <MailAccountsPage />
    </div>
  );
}
