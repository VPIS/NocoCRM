import { ApiClientError } from '@nocobase/app-client';
import { useAuthentication } from '@nocobase/app-plugin-authentication/client';
import { AlertCircleIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '#components/ui/alert';
import { Button } from '#components/ui/button';
import { useCrmText } from '../api.js';

// The WhatsApp page's failed loads (S4): a passing failure offers Retry; a
// missing grant says so; a conversation gone or no longer readable says so
// and leads back to the list (R3); an ended session offers to sign in again.
export function WhatsAppFailure({
  error,
  what,
  onRetry,
  back,
}: {
  error: unknown;
  // The list's or the conversation's.
  what: 'list' | 'conversation';
  onRetry: () => void;
  back?: string;
}): ReactElement {
  const { text } = useCrmText();
  const { refresh } = useAuthentication();
  const status = error instanceof ApiClientError ? error.status : 0;
  const title =
    what === 'list' ? 'whatsapp.loadFailed' : 'whatsapp.conversationFailed';
  const body =
    status === 401
      ? 'whatsapp.sessionEnded'
      : status === 403
        ? 'whatsapp.forbidden'
        : status === 404
          ? 'whatsapp.notFound'
          : 'whatsapp.network';
  const action =
    status === 401 ? (
      <Button variant='outline' size='sm' onClick={() => void refresh()}>
        {text('whatsapp.signIn')}
      </Button>
    ) : status === 404 && back ? (
      <Button
        variant='outline'
        size='sm'
        nativeButton={false}
        render={<Link to={back} />}
      >
        {text('whatsapp.backToList')}
      </Button>
    ) : status === 403 || status === 404 ? null : (
      <Button variant='outline' size='sm' onClick={onRetry}>
        {text('whatsapp.retry')}
      </Button>
    );
  return (
    <Alert variant='destructive'>
      <AlertCircleIcon />
      <AlertTitle>{text(title)}</AlertTitle>
      <AlertDescription>{text(body)}</AlertDescription>
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
  );
}
