/** In-page scrolling without touching the URL hash, which the router uses. */
export function scrollToId(id: string, e?: Event) {
  e?.preventDefault();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

/** Template helper for links: (click)="go($event, 'konfigurator')". */
export const goTo = (e: Event, id: string) => scrollToId(id, e);
