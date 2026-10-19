import { MailAccountsPage } from '@nocobase/app-plugin-mail/client';
import type { ReactElement } from 'react';
import { BackButton } from '../../components/back-button.js';

// The Mail plugin's account page: connect a mailbox (an IMAP/SMTP server from
// `mail.providers`, or Google and Microsoft through OAuth, which return here
// through `mail.oauthReturnUrl`), set its first sync date, signatures,
// templates and labels, and suspend or remove it. Credentials stay on the
// server; the page shows none. It is reached from the Mailbox page, without a
// menu entry of its own, so it leads back there above the plugin's page (in
// the plugin page's own padding, the page pulled up under it). The plugin's
// page ends with little room at its bottom; 6rem more lets its last row
// scroll above the assistant's dock.
export default function CrmMailAccountsPage(): ReactElement {
  return (
    <>
      <div className='px-6 pt-6 md:px-8 md:pt-8'>
        <BackButton to='/mail' />
      </div>
      <div className='-mt-4 pb-24 md:-mt-6'>
        <MailAccountsPage />
      </div>
    </>
  );
}
