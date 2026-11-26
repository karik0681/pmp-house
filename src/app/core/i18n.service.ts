import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { Lang, T } from './i18n';
import { PAGES } from './i18n-pages';

/** The site is in Czech only. The language stays a signal so that every template calling t() keeps working. */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>('cs');

  constructor() { inject(DOCUMENT).documentElement.lang = 'cs'; }

  t(key: string): string {
    const l = this.lang();
    return T[l][key] ?? PAGES[l][key] ?? key;
  }
}
