// Kept separate so the actual keyboard/focus behavior can be exercised without a browser library.
export function trapDrawerFocus(event: KeyboardEvent, items: HTMLElement[], panel: HTMLElement) {
  if (event.key !== "Tab") return;
  if (!items.length) { event.preventDefault(); panel.focus(); return; }
  const first = items[0], last = items[items.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
}
