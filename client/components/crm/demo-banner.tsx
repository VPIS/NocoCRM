import { useState, type ReactElement } from 'react';
import { Link } from 'react-router';
import { Database, X } from 'lucide-react';
import { Button, buttonVariants } from '../ui/button.js';
import { useCrmText, useMetadata } from './api.js';

// The banner at the top of the CRM's pages that offers the demo dataset,
// shown only to whoever may import it (the settings capability) while none
// is imported. It links to the settings page's demo tab and goes away by
// itself once the import is done; dismissed, it stays away in this browser.
// The dismissal is a convenience kept in the browser, so a blocked or
// cleared storage only means the banner shows again.
const DISMISSED_KEY = 'nococrm:demo-banner-dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function DemoBanner(): ReactElement | null {
  const { text } = useCrmText();
  const metadata = useMetadata().data;
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed || !metadata?.settingsAccess || metadata.demoPresent !== false)
    return null;
  const dismiss = (): void => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Storage unavailable: hidden until the page is loaded again.
    }
    setDismissed(true);
  };
  return (
    <div
      role='region'
      aria-label={text('demoData')}
      className='flex items-center gap-3 border-b bg-info/10 px-4 py-2 text-sm sm:px-6'
    >
      <Database className='size-4 shrink-0 text-info' aria-hidden />
      <p className='min-w-0 flex-1 text-foreground'>{text('demoBanner')}</p>
      {/* A link drawn as a button: it goes to another page. */}
      <Link
        to='/settings/crm?section=demoData'
        className={buttonVariants({ size: 'sm', className: 'shrink-0' })}
      >
        {text('demoBannerAction')}
      </Link>
      <Button
        size='icon'
        variant='ghost'
        className='size-8 shrink-0 text-muted-foreground'
        aria-label={text('demoBannerDismiss')}
        onClick={dismiss}
      >
        <X />
      </Button>
    </div>
  );
}
