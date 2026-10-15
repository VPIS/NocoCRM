// The signal a timeline line asked to see (crm-detail.tsx's SignalEvent),
// handed to the whole list (company-signals.tsx) that the address then
// opens: it scrolls to that signal and lights it up a while. A module of its
// own, so the timeline need not import the list, which imports the page.
let pending: string | null = null;

export function focusSignal(id: string): void {
  pending = id;
}

// The signal to show, once: the next list to open takes it.
export function takeSignalFocus(): string | null {
  const id = pending;
  pending = null;
  return id;
}
