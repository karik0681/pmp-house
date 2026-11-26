import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';

/** A quiet strip of customers' logos under the hero: grey, in colour on hover. Files are in public/clients/. */
@Component({
  selector: 'app-clients',
  template: `
    <section class="clients" [attr.aria-label]="t('clH')"><div class="wrap">
      <p class="clients-h">{{ t('clH') }}</p>
      <ul>
        @for (c of list; track c.f) { <li><img [src]="'/clients/' + c.f + '.webp'" [alt]="c.n" [style.height.px]="c.h" loading="lazy" decoding="async"></li> }
      </ul>
    </div></section>`,
})
export class ClientsComponent {
  private i18n = inject(I18nService);
  t = (k: string) => this.i18n.t(k);
  /* h: the height that gives every logo about the same visual weight (wide wordmarks lower, round crests higher) */
  readonly list = [
    { f: 'un', n: 'United Nations', h: 34 },
    { f: 'unicef', n: 'UNICEF', h: 30 },
    { f: 'mvcr', n: 'Ministerstvo vnitra České republiky', h: 34 },
    { f: 'dhl', n: 'DHL', h: 20 },
    { f: 'bp', n: 'bp', h: 38 },
    { f: 'flixbus', n: 'FlixBus', h: 24 },
    { f: 'manutd', n: 'Manchester United', h: 40 },
    { f: 'asta', n: 'Asta Italia', h: 32 },
  ];
}
