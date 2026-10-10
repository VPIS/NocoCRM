// Lights up what a jump lands on (a timeline entry a link or a notification
// names, the message a reply answers, a mail conversation) for a few
// seconds, then lets it fade (`.crm-flash` in client/styles.css), so the
// eye finds it where the page moved to.
export function flash(nodes: Iterable<Element>): void {
  for (const node of nodes) {
    node.classList.remove('crm-flash');
    // Restarts the animation when it is pointed out again.
    void (node as HTMLElement).offsetWidth;
    node.classList.add('crm-flash');
    node.addEventListener(
      'animationend',
      () => node.classList.remove('crm-flash'),
      { once: true },
    );
  }
}
