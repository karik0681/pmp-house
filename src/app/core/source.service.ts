import { Injectable } from '@angular/core';

const KEY = 'pmp-source';

/** Remembers where the visitor came from (ad campaign, click id, referrer) for the first visit of the session. */
@Injectable({ providedIn: 'root' })
export class SourceService {
  readonly label: string = captureSource();
}

/** Called in main.ts before Angular starts, because the router rewrites the URL and drops ?utm_… */
export function captureSource(): string {
  {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) return saved;
    } catch { /* private mode */ }
    const q = new URLSearchParams(location.search);
    const src = q.get('utm_source'), camp = q.get('utm_campaign');
    let label = 'Web';
    if (src) label = camp ? `${src} · ${camp}` : src;
    else if (q.get('gclid')) label = 'Google Ads';
    else if (q.get('fbclid')) label = 'Facebook';
    else if (document.referrer) { try { label = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch { /* bad referrer */ } }
    try { sessionStorage.setItem(KEY, label); } catch { /* private mode */ }
    return label;
  }
}
