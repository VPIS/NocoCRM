import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';

// A long page's own navigation (the overview): a row of its sections that
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
      // row sticks to that column's top.
      className='sticky top-0 z-30 -mx-4 flex gap-1 overflow-x-auto border-b border-border/60 bg-background/85 px-4 py-2 backdrop-blur-xl scroll-quiet md:-mx-8 md:px-8'
    >
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
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1 text-sm whitespace-nowrap transition-colors ${
            active === section.id
              ? 'border-transparent bg-card font-medium text-foreground shadow-xs'
              : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground'
          }`}
        >
          {section.icon && (
            <section.icon aria-hidden className='size-3.5 shrink-0' />
          )}
          {section.label}
        </a>
      ))}
    </nav>
  );
}
