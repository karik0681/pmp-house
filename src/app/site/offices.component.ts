import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { SETTINGS } from '../core/settings';
import { CZ } from './cz-map';

type Office = (typeof SETTINGS.offices)[number];

/** Contact section: a drawn map of Czechia with the branches and a card per branch.
 *  Own map instead of an embedded Google map: loads instantly on phones and sets no cookies. */
@Component({
  selector: 'app-offices',
  imports: [RouterLink],
  template: `
    <section class="ofc" [class.ofc-page]="page()" [attr.id]="page() ? null : 'kontakt'"><div class="wrap">
      <div class="sec-head">
        <div><h2>{{ t('ofH') }}</h2><p class="sub">{{ t('ofSub') }}</p></div>
        @if (!page()) { <a class="btn btn-o" routerLink="/kontakt">{{ t('ofAllC') }} →</a> }
      </div>
      <div class="ofc-grid">
        <figure class="ofc-map">
          <svg [attr.viewBox]="'-20 -150 ' + (cz.w + 40) + ' ' + (cz.h + 180)" role="img" [attr.aria-label]="t('ofMapAlt')">
            <path class="land" [attr.d]="cz.path" />
            @for (o of offices; track o.id) {
              <g class="pin" [class.is-main]="o.main" [class.is-on]="active() === o.id" tabindex="0" role="button"
                [attr.aria-label]="o.city + ', ' + t('ofK_' + o.id)" (click)="pick(o)" (keydown.enter)="pick(o)" (mouseenter)="active.set(o.id)">
                <g [attr.transform]="'translate(' + o.x + ' ' + o.y + ')'">
                  <ellipse class="shadow" cx="0" cy="0" rx="16" ry="6" />
                  <path class="drop" d="M0 0C-7-16-30-30-30-52a30 30 0 1 1 60 0C30-30 7-16 0 0Z" />
                  <path class="house" d="M-13-50 0-63 13-50M-9-53v15h18v-15" />
                </g>
                <text [attr.x]="o.x + (o.x > 600 ? -40 : 40)" [attr.y]="o.y - 56" [attr.text-anchor]="o.x > 600 ? 'end' : 'start'">
                  <tspan class="city">{{ o.city }}</tspan>
                  <tspan class="kind" [attr.x]="o.x + (o.x > 600 ? -40 : 40)" dy="34">{{ t('ofK_' + o.id) }}</tspan>
                </text>
              </g>
            }
          </svg>
          <figcaption class="ofc-leg">
            <svg viewBox="-32 -86 64 92" aria-hidden="true"><path class="drop" d="M0 0C-7-16-30-30-30-52a30 30 0 1 1 60 0C30-30 7-16 0 0Z" /><path class="house" d="M-13-50 0-63 13-50M-9-53v15h18v-15" /></svg>
            {{ t('ofLegend') }}
          </figcaption>
        </figure>
        <ul class="ofc-list">
          @for (o of offices; track o.id) {
            <li class="ofc-c" [id]="'pobocka-' + o.id" [class.is-main]="o.main" [class.is-on]="active() === o.id" (mouseenter)="active.set(o.id)">
              <p class="ofc-k">{{ t('ofK_' + o.id) }}</p>
              <h3>{{ o.city }}</h3>
              @if (o.street) {
                <p class="ofc-a">{{ o.street }}<br>{{ o.postal }} {{ o.locality }}</p>
              } @else {
                <p class="ofc-a mute">{{ t('ofByPhone') }}</p>
              }
              <p class="ofc-h">{{ hours() }}</p>
              <p class="ofc-t"><a [href]="'tel:' + o.phone.replace(/\s/g, '')">{{ o.phone }}</a></p>
              <div class="ofc-b">
                @if (o.street) {
                  <a class="btn btn-g" [href]="o.google || gmaps(o)" target="_blank" rel="noopener">{{ t('ofNav') }}</a>
                  <a class="btn btn-o" [href]="mapy(o)" target="_blank" rel="noopener">Mapy.cz</a>
                } @else {
                  <a class="btn btn-g" [href]="'tel:' + o.phone.replace(/\s/g, '')">{{ t('ofCall') }}</a>
                }
              </div>
              @if (o.google || o.firmy) {
                <p class="ofc-l">
                  @if (o.google) { <a [href]="o.google" target="_blank" rel="noopener">{{ t('ofGoogle') }} ↗</a> }
                  @if (o.firmy) { <a [href]="o.firmy" target="_blank" rel="noopener">Firmy.cz ↗</a> }
                </p>
              }
            </li>
          }
        </ul>
      </div>
    </div></section>`,
})
export class OfficesComponent {
  /** true on /kontakt, where the page has its own contact block below */
  readonly page = input(false);
  private i18n = inject(I18nService);
  readonly s = SETTINGS;
  readonly cz = CZ;
  readonly offices = SETTINGS.offices;
  readonly active = signal(SETTINGS.offices.find(o => o.main)?.id ?? '');
  t = (k: string) => this.i18n.t(k);
  hours = () => this.s.hours[this.i18n.lang()];
  private addr = (o: Office) => `${o.street}, ${o.postal} ${o.locality}`;
  gmaps = (o: Office) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(this.addr(o));
  mapy = (o: Office) => 'https://mapy.cz/zakladni?q=' + encodeURIComponent(this.addr(o));
  /** a pin on the map brings its card into view on phones, where the cards sit under the map */
  pick(o: Office) {
    this.active.set(o.id);
    const el = document.getElementById('pobocka-' + o.id);
    if (el && innerWidth < 900) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }
}
