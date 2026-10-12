// Lights up what a jump lands on (a timeline entry a link or a notification
// names, the message a reply answers, a mail conversation) for a few
// seconds, then lets it fade (`.crm-flash` in client/styles.css), so the
// eye finds it where the page moved to: in the AI's tint for the AI's work
// (a follow-up's card), in the info blue for anything else.
export function flash(nodes: Iterable<Element>, tone?: 'ai'): void {
  for (const node of nodes) {
    node.classList.remove('crm-flash', 'crm-flash-ai');
    // Restarts the animation when it is pointed out again.
    void (node as HTMLElement).offsetWidth;
    node.classList.add('crm-flash');
    if (tone === 'ai') node.classList.add('crm-flash-ai');
    node.addEventListener(
      'animationend',
      () => node.classList.remove('crm-flash', 'crm-flash-ai'),
      { once: true },
    );
  }
}

// Picking the item already shown in the inbox's pane again: the pane's
// timeline brings its entry back into view and lights it up anew.
export const REFOCUS_EVENT = 'crm:refocus';
export function refocus(): void {
  window.dispatchEvent(new Event(REFOCUS_EVENT));
}
