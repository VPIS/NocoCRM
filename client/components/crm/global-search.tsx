import {
  useEffect,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import { GlobalSearchContext } from './global-search-state.js';

// The global search, ported from NocoITAM's: a dialog (search-dialog.tsx,
// in the application layout) that ⌘K or the menu's Search opens, finding
// records by keyword through GET /api/search, or handing the question to
// The assistant in its panel (agent-chat/). This provider holds the state above the
// dialog; it wraps the application, so what was typed outlives a move to
// settings.

export function GlobalSearchProvider({
  children,
}: PropsWithChildren): ReactElement {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  // ⌘K / Ctrl+K toggles the dialog, but never opens it over another one.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key.toLowerCase() !== 'k' ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey ||
        event.isComposing
      )
        return;
      // Only where the dialog is (the application layout), and never over
      // another dialog.
      if (!document.querySelector('[data-crm-search-host]')) return;
      if (
        document.querySelector(
          '[role="dialog"]:not([data-crm-search]), [role="alertdialog"]',
        )
      )
        return;
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return (
    <GlobalSearchContext value={{ open, setOpen, value, setValue }}>
      {children}
    </GlobalSearchContext>
  );
}
