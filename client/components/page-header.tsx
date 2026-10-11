import { useContext, type ReactElement, type ReactNode } from 'react';

import { PageFrameContext } from './page-frame.js';

export interface PageHeaderProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  /** Page-level actions, aligned to the right of the title from the `sm` breakpoint up. */
  readonly actions?: ReactNode;
}

/** The heading of a page: its only `h1`, an optional description, and the actions that apply to the whole page. */
export function PageHeader({
  actions,
  description,
  title,
}: PageHeaderProps): ReactElement {
  // Application change: inside a page that gathers pages under tabs, its
  // title and tabs lead, and this page's description and actions follow on
  // a row of their own (page-frame.ts).
  const frame = useContext(PageFrameContext);
  if (frame)
    return (
      <header className='space-y-4'>
        <h1 className='font-heading text-2xl font-semibold tracking-[-0.035em]'>
          {frame.title}
        </h1>
        {frame.tabs}
        {description || actions ? (
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            {description ? (
              <p className='max-w-2xl text-sm leading-6 text-muted-foreground'>
                {description}
              </p>
            ) : (
              <span />
            )}
            {actions ? (
              <div className='flex shrink-0 items-center gap-2'>{actions}</div>
            ) : null}
          </div>
        ) : null}
      </header>
    );
  return (
    <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
      <div className='min-w-0'>
        <h1 className='font-heading text-2xl font-semibold tracking-[-0.035em]'>
          {title}
        </h1>
        {description ? (
          <p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className='flex shrink-0 items-center gap-2'>{actions}</div>
      ) : null}
    </header>
  );
}
