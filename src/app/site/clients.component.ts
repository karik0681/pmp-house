import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';

/** A quiet strip of customers under the hero: logos in grey, in colour on hover (files in public/clients/).
    The UN, UNICEF and Manchester United allow their emblems only with written permission, so they are written as plain names. */
@Component({
  selector: 'app-clients',
  template: `
    <section class="clients" [attr.aria-label]="t('clH')"><div class="wrap">
      <p class="clients-h">{{ t('clH') }}</p>
      <ul>
        @for (c of list; track c.n) {
          @if (c.f) { <li><img [src]="'/clients/' + c.f + '.webp'" [alt]="c.n" [style.height.px]="c.h" loading="lazy" decoding="async"></li> }
          @else { <li class="clients-txt">{{ c.k ? t(c.k) : c.n }}</li> }
        }
      </ul>
    </div></section>`,
})
export class ClientsComponent {
  private i18n = inject(I18nService);
  t = (k: string) => this.i18n.t(k);
  /* h: the height that gives every logo about the same visual weight (wide wordmarks lower, round crests higher) */
  readonly list: { f?: string; n: string; h?: number; k?: string }[] = [
    { n: 'OSN', k: 'clUN' },
    { n: 'UNICEF' },
    { f: 'mvcr', n: 'Ministerstvo vnitra České republiky', h: 34 },
    { f: 'dhl', n: 'DHL', h: 20 },
    { f: 'bp', n: 'bp', h: 38 },
    { f: 'flixbus', n: 'FlixBus', h: 24 },
    { n: 'Manchester United' },
    { f: 'asta', n: 'Asta Italia', h: 32 },
  ];
}
