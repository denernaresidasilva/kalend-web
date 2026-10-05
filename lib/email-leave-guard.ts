import type { useRouter } from 'next/navigation';

const warning = 'Sair desta seção? Os campos editados que ainda não foram salvos serão descartados.';
const guards = new Set<() => boolean>();
type NavigationEntry = { url: string | null; index: number };
type BrowserNavigation = EventTarget & { currentEntry?: NavigationEntry; entries?: () => NavigationEntry[] };
type NavigateEvent = Event & { destination: { url: string }; navigationType: string; hashChange?: boolean; downloadRequest?: string | null };
let approvedDestination: string | null = null;
let removeListeners: (() => void) | undefined;
const pending = () => [...guards].some(guard => guard());
const navigation = () => (window as Window & { navigation?: BrowserNavigation }).navigation;
const href = (url: string) => new URL(url, window.location.href).href;

export function confirmEmailLeave() {
  approvedDestination = null;
  return !pending() || window.confirm(warning);
}
function allowDestination(destination?: string) {
  if (!confirmEmailLeave()) return false;
  if (destination && pending()) approvedDestination = href(destination);
  return true;
}

// Guard at the public App Router call site, before React commits a new route.
// Authentication/authorization redirects deliberately continue to use the native router.
export function guardEmailRouter(router: ReturnType<typeof useRouter>): ReturnType<typeof useRouter> {
  return {
    ...router,
    push: (...args) => { if (allowDestination(args[0])) router.push(...args); },
    replace: (...args) => { if (allowDestination(args[0])) router.replace(...args); },
    back: () => traverse(-1, () => router.back()),
    forward: () => traverse(1, () => router.forward()),
  };
}
function traverse(delta: number, work: () => void) {
  const nav = typeof window === 'undefined' ? undefined : navigation();
  const index = nav?.currentEntry?.index;
  const destination = index === undefined ? undefined : nav?.entries?.().find(entry => entry.index === index + delta)?.url;
  if (allowDestination(destination ?? undefined)) work();
}

// No history writes, synthetic entries, popstate restoration, or Next.js internals.
export function installEmailLeaveGuard(isPending: () => boolean) {
  guards.add(isPending);
  if (!removeListeners) {
    const unload = (event: BeforeUnloadEvent) => {
      if (pending()) { event.preventDefault(); event.returnValue = ''; }
    };
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest('a');
      const logout = target?.closest('button[aria-label="Sair"]');
      if ((!link && !logout) || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0 || link?.target === '_blank' || link?.hasAttribute('download')) return;
      if (link && href(link.href) === window.location.href) return;
      if (!allowDestination(link?.href)) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const navigate = (event: Event) => {
      const e = event as NavigateEvent;
      if (!e.cancelable || e.navigationType === 'reload' || e.downloadRequest != null) return;
      const approved = approvedDestination === e.destination.url;
      approvedDestination = null;
      if (!approved && pending() && !window.confirm(warning)) e.preventDefault();
    };
    const committed = () => { approvedDestination = null; };
    const nav = navigation();
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    nav?.addEventListener('navigate', navigate);
    nav?.addEventListener('currententrychange', committed);
    removeListeners = () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
      nav?.removeEventListener('navigate', navigate);
      nav?.removeEventListener('currententrychange', committed);
    };
  }
  return () => {
    guards.delete(isPending);
    if (!guards.size) { removeListeners?.(); removeListeners = undefined; approvedDestination = null; }
  };
}
