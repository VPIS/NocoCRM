// Every scrollbar in the application shows only while what it belongs to
// scrolls (client/styles.css draws a bar under `[data-scrolling]` alone):
// one listener on the document, in the capture phase since a scroll does
// not bubble, marks the element that scrolls, or the page's root for the
// page itself, until it has been still for a moment. Installed once, as
// the client starts (client/index.tsx).
const STILL_MS = 800;
const timers = new WeakMap<Element, number>();

export function revealScrollbarsWhileScrolling(): void {
  document.addEventListener(
    'scroll',
    (event) => {
      const element =
        event.target instanceof Element
          ? event.target
          : document.scrollingElement;
      if (!(element instanceof HTMLElement)) return;
      element.dataset.scrolling = '';
      window.clearTimeout(timers.get(element));
      timers.set(
        element,
        window.setTimeout(() => {
          delete element.dataset.scrolling;
        }, STILL_MS),
      );
    },
    { capture: true, passive: true },
  );
}
