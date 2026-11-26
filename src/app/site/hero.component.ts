import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { goTo } from '../core/scroll';
import { money } from '../core/format';
import { fromPrice } from '../configurator/model';

/** Top of the home page: the offer over a darkened photo of a real assembly on site. */
@Component({
  selector: 'app-hero',
  template: `
    <section class="hero">
      <picture class="hero-bg" aria-hidden="true">
        <source media="(max-width: 860px)" srcset="/hero/stavba-m.webp">
        <img src="/hero/stavba.webp" width="1672" height="941" alt="" fetchpriority="high">
      </picture>
      <div class="hero-t">
        <h1 class="hero-h1">{{ t('eyebrow') }}</h1>
        <p class="hero-lead">{{ t('lead') }}</p>
        <div class="cta">
          <a class="btn btn-g" href="#konfigurator" (click)="go($event, 'konfigurator')">{{ t('cta') }}</a>
          <a class="btn btn-o" href="#konstrukce" (click)="go($event, 'konstrukce')">{{ t('cta2') }}</a>
        </div>
        <dl class="facts">
          <div><dt>{{ t('f1k') }}</dt><dd>{{ t('f1v') }}</dd></div>
          <div><dt>{{ t('f2k') }}</dt><dd>{{ t('f2v') }}</dd></div>
          <div><dt>{{ t('tFrom') }}</dt><dd>{{ t('from') }} {{ price }}</dd></div>
        </dl>
      </div>
    </section>`,
})
export class HeroComponent {
  private i18n = inject(I18nService);
  /** the published "from" price of a 3 × 6 m Standard */
  readonly price = money(fromPrice('K'));
  t = (k: string) => this.i18n.t(k);
  go = goTo;
}
