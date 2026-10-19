import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement, ReactNode } from 'react';

import { NocoCrmLogo } from '#components/brand-logo';
import { AuthSplitLayout } from '#extensions/nocobase-auth-split-layout/auth-split-layout';

import { ActivityPanel } from './activity-panel.js';

export interface AuthPageProps {
  readonly title: ReactNode;
  readonly description: ReactNode;
  readonly children: ReactNode;
}

/**
 * The frame every sign-in, sign-up and password page shares: the form on the left, and on wide screens the CRM's
 * activity on the right (`ActivityPanel`: one deal worked by the CRM's AI agents, as NocoBase Studio's sign-in page
 * shows its AI team at work), in place of the template's NocoBase brand panel.
 */
export function AuthPage({
  children,
  description,
  title,
}: AuthPageProps): ReactElement {
  const { t } = useTranslation();
  return (
    <AuthSplitLayout
      aside={<ActivityPanel />}
      asideLabel={t('auth.about')}
      description={description}
      // The official lockup with the application's name, in place of the
      // template's boxed mark beside the name in text.
      name={
        <NocoCrmLogo
          role='img'
          aria-label={t('app.title')}
          className='h-6 w-auto'
        />
      }
      title={title}
    >
      {children}
    </AuthSplitLayout>
  );
}
