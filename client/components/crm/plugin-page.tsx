import type { ComponentType, ReactElement } from 'react';

// The Agents plugin's pages (Agents, Skills, Models, Usage) carry their own
// copies of the shadcn primitives, styled as the registry writes them: a
// table with a bare header in a plain bordered box, cards drawn by a ring,
// settings boxes without a ground. Wrapped in this, they take the CRM's look
// through the `.crm-plugin-page` rules in client/styles.css: white cards
// with the faint border and shadow, a table's header on the menu's band,
// and the chart in the primary colour, as the CRM's own pages draw them.
// The plugin is not changed; the wrapper is a `display: contents` element,
// so the pages lay out exactly as before. Their covering child pages render
// in the page's own outlet, inside it, so they follow too.
export function withCrmStyle(Page: ComponentType): ComponentType {
  function CrmStyledPage(): ReactElement {
    return (
      <div className='crm-plugin-page contents'>
        <Page />
      </div>
    );
  }
  return CrmStyledPage;
}
