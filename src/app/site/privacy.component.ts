import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { SETTINGS } from '../core/settings';

@Component({
  selector: 'app-privacy',
  template: `
    <main class="pg">
      <header class="pg-head"><div class="wrap">
        <p class="crumbs"><a href="#/">{{ t('home') }}</a> <span aria-hidden="true">/</span> {{ t('ftPrivacy') }}</p>
        <h1>{{ t('ftPrivacy') }}</h1>
        <p class="demo-note">{{ t('pvDemo') }}</p>
      </div></header>
      <section class="wrap pg-body legal">
        @for (k of [1, 2, 3, 4, 5, 6]; track k) {
          <h2>{{ t('pvH' + k) }}</h2>
          <p>{{ fill(t('pvP' + k)) }}</p>
        }
      </section>
    </main>`,
})
export class PrivacyComponent {
  private i18n = inject(I18nService);
  t = (k: string) => this.i18n.t(k);
  fill(s: string) {
    return s.replace('{company}', SETTINGS.company).replace('{ico}', SETTINGS.ico)
      .replace('{address}', SETTINGS.address).replaceAll('{mail}', SETTINGS.mail);
  }
}
