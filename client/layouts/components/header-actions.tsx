import type { ReactElement } from 'react';
import { DemoModeMenu } from '@nocobase/app-plugin-demo-mode/client/menu';
import { TooltipProvider } from '#components/ui/tooltip';

import { AssistantHeaderButton } from '../../components/crm/assistant-header-button.js';
import { ThemeSettings } from '../../theme/index.js';
import { UserMenu } from './user-menu.js';

/**
 * The header's right-hand actions, shared by every authenticated page.
 * Application change: the CRM's assistant leads them, reachable from every
 * page, the ones without the floating dock included (assistant-header-button.tsx).
 */
export function HeaderActions(): ReactElement {
  return (
    <TooltipProvider>
      <div className='flex shrink-0 items-center gap-2'>
        {/* Application change: the plugin's standalone demo entry belongs
            before the assistant and account controls. */}
        <DemoModeMenu />
        <AssistantHeaderButton />
        <ThemeSettings />
        <UserMenu />
      </div>
    </TooltipProvider>
  );
}
