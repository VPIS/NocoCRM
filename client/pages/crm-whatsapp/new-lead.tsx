import { useToaster } from '@nocobase/app-client';
import type { ReactElement } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router';
import { toText, useCrmApi, useCrmText } from '../../components/crm/api.js';
import { RecordForm } from '../../components/crm/form.js';
import type { Conversation } from '../../components/crm/whatsapp/api.js';
import type { ConversationContext } from './conversation.js';

// A lead made from a WhatsApp customer (…/:conversationId/new-lead): the
// CRM's lead form, its own dialog, with the customer's name and number filled
// in and the source left for the person to choose, as everywhere; once
// created, the customer is linked to it.

export default function NewLeadFromConversation(): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const toaster = useToaster();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { conversation, settle, focusName } =
    useOutletContext<ConversationContext>();
  const back = () =>
    void navigate({
      pathname: `/crm/whatsapp/${encodeURIComponent(conversation.id)}`,
      search: params.toString() ? `?${params.toString()}` : '',
    });
  return (
    <RecordForm
      entity='leads'
      initial={{
        name: conversation.contact.name,
        ...(conversation.contact.phone
          ? { phone: conversation.contact.phone }
          : {}),
      }}
      onClose={back}
      onSaved={(lead) => {
        const name = toText(lead.name);
        void api<{ data: Conversation }>(
          `whatsapp/conversations/${encodeURIComponent(conversation.id)}/link`,
          'POST',
          { leadId: toText(lead.id) },
        )
          .then(({ data }) => {
            settle(data);
            toaster.show({
              type: 'success',
              title: toText(text('whatsapp.leadCreated', { name })),
            });
            focusName();
          })
          .catch(() => {
            settle();
            toaster.show({
              type: 'error',
              title: toText(text('whatsapp.leadNotLinked')),
            });
          });
      }}
    />
  );
}
