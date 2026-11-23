import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../core/seo.service';
import { I18nService } from '../core/i18n.service';
import { ModelsComponent } from './models.component';

/** /modely: the best-selling ready models on their own page, linked from the main menu. */
@Component({
  selector: 'app-models-page',
  imports: [RouterLink, ModelsComponent],
  template: `
    <main class="pg">
      <header class="pg-head"><div class="wrap">
        <p class="crumbs"><a routerLink="/">{{ t('home') }}</a> <span aria-hidden="true">/</span> {{ t('navModels') }}</p>
        <h1>{{ t('mdH') }}</h1>
        <p class="sub">{{ t('mdPageSub') }}</p>
      </div></header>
      <app-models [page]="true" />
    </main>`,
})
export class ModelsPageComponent {
  private i18n = inject(I18nService);
  t = (k: string) => this.i18n.t(k);
  constructor() { inject(SeoService).page(this.t('seoModels'), this.t('mdMeta'), { path: '/modely' }); }
}
