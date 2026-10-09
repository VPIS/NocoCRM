import { MailWorkspacePage } from '@nocobase/app-plugin-mail/client';
import { AtSign } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button.js';
import { toText, useCrmText } from '../../components/crm/api.js';

// The Mail plugin's workspace, as the CRM's Mailbox page: the signed-in
// user's connected mailboxes, read, searched, written and sent from here. The
// plugin owns the page and its wording (its own locale namespace). Its
// mailboxes are connected on the Mail accounts page, which has no menu entry
// of its own: "Manage mail accounts" leads there, first among the page's
// header actions, before the plugin's Compose. The workspace takes no header
// actions of its own (a slot is asked of the plugin), so the button is
// rendered into a node placed at the start of the plugin header's action
// row, found by the header's structure (`header > div:last-child`); if a
// plugin update changes that structure, the button does not show and this
// is the place to adjust.
export default function CrmMailPage(): ReactElement {
  const { text } = useCrmText();
  const rootRef = useRef<HTMLDivElement>(null);
  // The node the button renders into, made once; attached to the plugin's
  // header once that has rendered, and taken out again when the page goes.
  const [slot] = useState(() => {
    const node = document.createElement('span');
    node.className = 'contents';
    return node;
  });
  useLayoutEffect(() => {
    rootRef.current
      ?.querySelector<HTMLElement>('header > div:last-child')
      ?.prepend(slot);
    return () => slot.remove();
  }, [slot]);
  return (
    <div ref={rootRef} className='contents'>
      <MailWorkspacePage />
      {createPortal(
        <Button
          variant='outline'
          // The plugin's header buttons are its own, taller ones: this one
          // takes their height and padding so the row lines up.
          size='lg'
          className='gap-2 px-4'
          render={<Link to='/crm/mail/accounts' />}
          nativeButton={false}
        >
          <AtSign />
          {toText(text('mailManageAccounts'))}
        </Button>,
        slot,
      )}
    </div>
  );
}
