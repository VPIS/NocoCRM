import type { ReactElement } from 'react';
import { PanelRightOpen } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#components/ui/empty';
import { useCrmText } from './api.js';

// The inbox's detail pane while one of the CRM's notifications is picked:
// the record it is about opens in the drawer over the inbox (client/pages/
// inbox.tsx), so the pane only says so.
export function CrmNoticeHint(): ReactElement {
  const { text } = useCrmText();
  return (
    <div className='flex h-full items-center justify-center p-6'>
      <Empty className='min-h-48'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <PanelRightOpen />
          </EmptyMedia>
          <EmptyTitle>{text('notice.hint')}</EmptyTitle>
          <EmptyDescription>{text('notice.hintBody')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
