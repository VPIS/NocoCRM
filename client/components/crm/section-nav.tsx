import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';

// A long page's own navigation (the reports): a row of its sections that
// stays under the header as the page scrolls, marks the one being read and
// scrolls to one at a click. The sections carry the ids it names and a top
// scroll margin clearing the row.

export interface PageSection {
  readonly id: string;
  readonly label: string;
  // Drawn before the label.
  readonly icon?: LucideIcon;
}

export function SectionNav({
  sections,
  label,
}: {
  sections: readonly PageSection[];
  // The row's name for screen readers.
  label: string;
}): ReactElement {
  const [active, setActive] = useState(sections[0]?.id);
  const ids = sections.map((s) => s.id).join(' ');
  // The section being read: the last whose top has passed under the row.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          visible.set(entry.target.id, entry.isIntersecting);
        const first = ids.split(' ').find((id) => visible.get(id));
        if (first) setActive(first);
      },
      // The band just under the header and the row.
      { rootMargin: '-100px 0px -55% 0px' },
    );
    for (const id of ids.split(' ')) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [ids]);
  return (
    <nav
      aria-label={label}
      // The page scrolls in the layout's column under the header, so the
      // row sticks to that column's top; it sits close under the heading,
      // as every page's tabs do, and keeps a band of its ground under its
      // rule, so the content scrolling beneath stays clear of it.
      className='sticky top-0 z-30 -mx-4 -mt-4 mb-3 pb-3 bg-background/85 px-4 backdrop-blur-xl md:-mx-8 md:px-8'
    >
      {/* Drawn as the application's tabs (LinkTabs, a record page's):
          underlined on a thin rule, the one being read in the foreground
          over a 2px line of it, the others muted until hovered. */}
      <div className='flex gap-x-5 overflow-x-auto border-b border-border'>
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={active === section.id ? 'true' : undefined}
            onClick={(event) => {
              event.preventDefault();
              setActive(section.id);
              document
                .getElementById(section.id)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
              active === section.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {section.icon && (
              <section.icon aria-hidden className='size-4 shrink-0' />
            )}
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
