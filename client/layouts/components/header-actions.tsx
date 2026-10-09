import { useTranslation } from '@nocobase/i18n/client';
import { Settings } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

import { ThemeSettings } from '../../theme/index.js';
import { UserMenu } from './user-menu.js';
// Application change to the template's header: the AI assistant's entry, just
// left of the account menu on every surface (client/components/crm/ai-chat.tsx).
import { AssistantButton } from '../../components/crm/ai-chat.js';

const ACTION_LINK_CLASS =
  'inline-flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

/**
 * Keep header entries visible on their destination pages so navigation stays consistent across surfaces. Application
 * changes: the settings link is marked while the settings surface is shown, the AI assistant's button sits just left
 * of the account menu, and the inbox has no button here: it leads the menu's Action section (`client/routes.ts`).
 */
export function HeaderActions({
  showSettings,
}: {
  readonly showSettings: boolean;
}): ReactElement {
  const { t } = useTranslation();
  const onSettings = useLocation().pathname.startsWith('/settings');

  return (
    <TooltipProvider>
      <div className='flex shrink-0 items-center gap-2'>
        {showSettings ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  to='/settings'
                  aria-current={onSettings ? 'page' : undefined}
                  className={`${ACTION_LINK_CLASS} ${onSettings ? 'bg-muted' : ''}`}
                />
              }
              aria-label={t('settings.title', { defaultValue: 'Settings' })}
            >
              <Settings className='size-5' />
            </TooltipTrigger>
            <TooltipContent side='bottom'>
              {t('settings.title', { defaultValue: 'Settings' })}
            </TooltipContent>
          </Tooltip>
        ) : null}
        <ThemeSettings />
        <AssistantButton className={ACTION_LINK_CLASS} />
        <UserMenu />
      </div>
    </TooltipProvider>
  );
}
