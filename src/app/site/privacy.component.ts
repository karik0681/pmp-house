import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../core/seo.service';
import { I18nService } from '../core/i18n.service';
import { SETTINGS } from '../core/settings';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  template: `
    <main class="pg">
      <header class="pg-head"><div class="wrap">
        <p class="crumbs"><a routerLink="/">{{ t('home') }}</a> <span aria-hidden="true">/</span> {{ t('ftPrivacy') }}</p>
        <h1>{{ t('ftPrivacy') }}</h1>
        <p class="mute">{{ t('pvUpdated') }}</p>
      </div></header>
      <section class="wrap pg-body legal">
        @for (k of parts; track k) {
          <h2>{{ t('pvH' + k) }}</h2>
          @for (line of fill(t('pvP' + k)).split('\n'); track $index) { <p>{{ line }}</p> }
        }
        <p><a [href]="terms" target="_blank" rel="noopener">{{ t('pvTerms') }} ↗</a></p>
      </section>
    </main>`,
})
export class PrivacyComponent {
  private i18n = inject(I18nService);
  t = (k: string) => this.i18n.t(k);
  readonly parts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  /** the company's terms of sale, published on its older website */
  readonly terms = 'https://pmp-house.cz/polices';
  constructor() { inject(SeoService).page(this.t('ftPrivacy'), this.t('pvP2')); }
  fill(s: string) {
    return s.replace('{company}', SETTINGS.company).replace('{ico}', SETTINGS.ico)
      .replace('{address}', SETTINGS.address).replaceAll('{mail}', SETTINGS.mail).replace('{phone}', SETTINGS.phone);
  }
}
