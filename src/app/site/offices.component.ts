import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { SETTINGS } from '../core/settings';
import { CZ } from './cz-map';

type Office = (typeof SETTINGS.offices)[number];

/** Contact section: a drawn map of Czechia with the branches and a card per branch.
 *  Own map instead of an embedded Google map: loads instantly on phones and sets no cookies. */
@Component({
  selector: 'app-offices',
  template: `
    <section class="ofc" id="kontakt"><div class="wrap">
      <div class="sec-head"><div><h2>{{ t('ofH') }}</h2><p class="sub">{{ t('ofSub') }}</p></div></div>
      <div class="ofc-grid">
        <figure class="ofc-map">
          <svg [attr.viewBox]="'-20 -40 ' + (cz.w + 40) + ' ' + (cz.h + 70)" role="img" [attr.aria-label]="t('ofMapAlt')">
            <path class="land" [attr.d]="cz.path" />
            @for (o of offices; track o.id) {
              <g class="pin" [class.is-main]="o.main" [class.is-on]="active() === o.id" tabindex="0" role="button"
                [attr.aria-label]="o.city" (click)="pick(o)" (keydown.enter)="pick(o)" (mouseenter)="active.set(o.id)">
                <circle class="ring" [attr.cx]="o.x" [attr.cy]="o.y" r="30" />
                <circle class="dot" [attr.cx]="o.x" [attr.cy]="o.y" r="13" />
                <text [attr.x]="o.x + (o.x > 600 ? -24 : 24)" [attr.y]="o.y + 8" [attr.text-anchor]="o.x > 600 ? 'end' : 'start'">{{ o.city }}</text>
              </g>
            }
          </svg>
        </figure>
        <ul class="ofc-list">
          @for (o of offices; track o.id) {
            <li class="ofc-c" [id]="'pobocka-' + o.id" [class.is-main]="o.main" [class.is-on]="active() === o.id" (mouseenter)="active.set(o.id)">
              <p class="ofc-k">{{ o.main ? t('ofMain') : t('ofBranch') }}</p>
              <h3>{{ o.city }}</h3>
              @if (o.street) {
                <p class="ofc-a">{{ o.street }}<br>{{ o.postal }} {{ o.locality }}</p>
              } @else {
                <p class="ofc-a mute">{{ t('ofByPhone') }}</p>
              }
              <p class="ofc-h">{{ hours() }}</p>
              <div class="ofc-b">
                @if (o.street) {
                  <a class="btn btn-g" [href]="o.google || gmaps(o)" target="_blank" rel="noopener">{{ t('ofNav') }}</a>
                  <a class="btn btn-o" [href]="mapy(o)" target="_blank" rel="noopener">Mapy.cz</a>
                } @else {
                  <a class="btn btn-g" [href]="'tel:+' + s.whatsapp">{{ t('ofCall') }}</a>
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
      <div class="ofc-all">
        <a [href]="'tel:+' + s.whatsapp"><b>{{ s.phone }}</b></a>
        <a [href]="'mailto:' + s.mail">{{ s.mail }}</a>
        <a [href]="'https://wa.me/' + s.whatsapp" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </div></section>`,
})
export class OfficesComponent {
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
