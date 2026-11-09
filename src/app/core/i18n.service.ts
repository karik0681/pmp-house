import { Injectable, signal, effect } from '@angular/core';
import { Lang, T } from './i18n';
import { PAGES } from './i18n-pages';
import { SETTINGS } from './settings';

const KEY = 'pmp-lang';

/** Current language as a signal: every template that calls t() re-renders when it changes. */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(this.initial());

  constructor() {
    effect(() => {
      const l = this.lang();
      document.documentElement.lang = l;
      document.title = T[l]['title'];
      try { localStorage.setItem(KEY, l); } catch { /* private mode */ }
    });
  }

  t(key: string): string {
    const l = this.lang();
    return T[l][key] ?? PAGES[l][key] ?? key;
  }

  private initial(): Lang {
    const ok = SETTINGS.languages;
    try {
      const s = localStorage.getItem(KEY) as Lang;
      if (ok.includes(s)) return s;
    } catch { /* private mode */ }
    const browser = (navigator.language || 'cs').slice(0, 2) as Lang;
    return ok.includes(browser) ? browser : ok[0];
  }
}
