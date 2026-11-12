import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { dim } from '../core/format';
import { Kind, sizesOf } from '../configurator/model';
import { OPTS, Opt, baseKey } from './quote';
import { PricesService } from './prices.service';

/** The price list of the company: base prices by type and size, surcharges, delivery and services. */
@Component({
  selector: 'app-price-list',
  template: `
    <section class="pl">
      <h2>{{ t('pl_title') }}</h2>
      <p class="note">{{ t('pl_hint') }} {{ t('pl_demo') }}</p>

      <h3>{{ t('pl_base') }}</h3>
      <p class="note">{{ t('pl_baseNote') }}</p>
      <div class="pl-types">
        @for (k of types; track k) {
          <div class="pl-box">
            <h4>{{ t(k) }}</h4>
            @for (z of sizes(k); track z.key) {
              <label class="pl-row"><span>{{ z.label }}</span>
                <input type="number" inputmode="numeric" min="0" step="1000" [value]="shown(prices.list().base[z.key])" (change)="setBase(z.key, $any($event.target).value)"><i>Kč</i></label>
            }
          </div>
        }
      </div>

      <div class="pl-types">
        <div class="pl-box">
          <h4>{{ t('pl_opts') }}</h4>
          @for (k of opts; track k) {
            <label class="pl-row"><span>{{ optLabel(k) }}</span>
              <input type="number" inputmode="numeric" min="0" step="500" [value]="shown(prices.list().opt[k])" (change)="setOpt(k, $any($event.target).value)"><i>Kč</i></label>
          }
        </div>
        <div class="pl-box">
          <h4>{{ t('pl_services') }}</h4>
          @for (k of services; track k) {
            <label class="pl-row"><span>{{ t('pl_' + k) }}</span>
              <input type="number" inputmode="numeric" min="0" [value]="shown(prices.list()[k])" (change)="setService(k, $any($event.target).value)"><i>Kč</i></label>
          }
        </div>
      </div>
      <button type="button" class="btn btn-o" (click)="prices.reset()">{{ t('pl_reset') }}</button>
    </section>`,
})
export class PriceListComponent {
  private i18n = inject(I18nService);
  readonly prices = inject(PricesService);
  readonly types: Kind[] = ['Y', 'K', 'P'];
  readonly opts = OPTS;
  readonly services = ['km', 'montage', 'crane'] as const;

  t = (k: string) => this.i18n.t(k);
  sizes(k: Kind) { return sizesOf(k).map(([L, W]) => ({ key: baseKey(k, L, W), label: dim(L, W) })); }
  /** an empty field instead of 0, so a missing price is easy to spot */
  shown(v: number | undefined) { return v ? v : ''; }
  optLabel(k: Opt) { return optLabel(k, this.t); }
  private val(v: string) { return Math.max(0, Math.round(+v) || 0); }
  setBase(key: string, v: string) { this.prices.edit(p => { p.base[key] = this.val(v); }); }
  setOpt(k: Opt, v: string) { this.prices.edit(p => { p.opt[k] = this.val(v); }); }
  setService(k: 'km' | 'montage' | 'crane', v: string) { this.prices.edit(p => { p[k] = this.val(v); }); }
}

/** The name of a surcharge, built from words the website already has. */
export function optLabel(k: Opt, t: (k: string) => string): string {
  if (k === 'ins100') return `${t('insWall')}: ${t('insW100')}`;
  if (k.startsWith('floor')) return `${t('insFloor')}: ${t('insF' + k.slice(5))}`;
  return t(k);
}
