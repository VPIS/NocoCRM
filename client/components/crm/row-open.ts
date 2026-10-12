import type { MouseEvent } from 'react';

// A list row opens its record when its empty space is clicked: not a link,
// a button or a control inside it, nor a click in a dialog the row opened
// (React carries those up through the portal), nor the end of a text
// selection. A click with ⌘ or Ctrl held is left to the name's link, which
// opens a new tab.
export function openOnRowClick(
  path: string,
  navigate: (path: string) => void,
): (event: MouseEvent<HTMLElement>) => void {
  return (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const target = event.target as Element;
    if (!event.currentTarget.contains(target)) return;
    if (
      target.closest(
        'a,button,input,textarea,select,label,[role="checkbox"],[role="menuitem"],[role="combobox"]',
      )
    )
      return;
    if (window.getSelection()?.toString()) return;
    if (event.metaKey || event.ctrlKey) return;
    navigate(path);
  };
}
