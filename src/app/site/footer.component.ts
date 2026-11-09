import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { SETTINGS } from '../core/settings';
import { Kind } from '../configurator/model';
import { NavService } from './nav.service';
import { DomSanitizer } from '@angular/platform-browser';
import { LOGO_WHITE } from './logo';

/** Simple own-drawn outline icons, one path each. */
const ICONS: Record<string, string> = {
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-2.5v.01',
  tiktok: 'M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.4 4.4 5 4.6',
  youtube: 'M3 8.5C3 6.6 4.6 5 6.5 5h11C19.4 5 21 6.6 21 8.5v7c0 1.9-1.6 3.5-3.5 3.5h-11A3.5 3.5 0 0 1 3 15.5v-7zM10 9v6l5-3-5-3z',
};

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="ft" id="kontakt">
      <div class="ft-cta"><div class="wrap">
        <div>
          <h2>{{ t('ftH') }}</h2>
          <p>{{ t('ftSub') }}</p>
        </div>
        <div class="ft-btns">
          <a class="btn btn-y" href="#konfigurator" (click)="nav.section('konfigurator', $event)">{{ t('cta') }}</a>
          <a class="btn btn-wa" [href]="'https://wa.me/' + s.whatsapp" target="_blank" rel="noopener">WhatsApp</a>
          <a class="btn btn-line" [href]="'tel:+' + s.whatsapp">{{ s.phone }}</a>
        </div>
      </div></div>

      <div class="wrap ft-grid">
        <div class="ft-brand">
          <a class="ft-logo" href="#/" aria-label="PMP house" [innerHTML]="logo" (click)="nav.section('top', $event)"></a>
          <p>{{ t('ftAbout') }}</p>
          <ul class="soc" [attr.aria-label]="t('ftSocial')">
            @for (k of socials; track k) {
              <li>
                @if (s.social[k]) {
                  <a [href]="s.social[k]" target="_blank" rel="noopener" [attr.aria-label]="label(k)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="icons[k]"/></svg>
                  </a>
                } @else {
                  <span class="off" [title]="t('ftSocialTodo')" [attr.aria-label]="label(k)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="icons[k]"/></svg>
                  </span>
                }
              </li>
            }
          </ul>
        </div>

        <div>
          <h3>{{ t('ftModels') }}</h3>
          <ul>
            @for (m of models; track m.type) {
              <li><a href="#konfigurator" (click)="nav.model(m, $event)">{{ t(m.type) }} {{ m.size }}</a></li>
            }
            <li><a href="#konfigurator" (click)="nav.section('konfigurator', $event)">{{ t('navCfg') }}</a></li>
          </ul>
        </div>

        <div>
          <h3>{{ t('ftInfo') }}</h3>
          <ul>
            <li><a routerLink="/reference">{{ t('navRefs') }}</a></li>
            <li><a routerLink="/montaz">{{ t('navMontage') }}</a></li>
            <li><a href="#konstrukce" (click)="nav.section('konstrukce', $event)">{{ t('navTypes') }}</a></li>
            <li><a href="#otazky" (click)="nav.section('otazky', $event)">{{ t('navFaq') }}</a></li>
          </ul>
        </div>

        <address class="ft-contact">
          <h3>{{ t('navContact') }}</h3>
          <p class="ft-phone"><a [href]="'tel:+' + s.whatsapp">{{ s.phone }}</a></p>
          <p><a [href]="'mailto:' + s.mail">{{ s.mail }}</a></p>
          <p>{{ s.address }}</p>
          <p class="mute">{{ hours() }}<br>{{ t('conSub') }}</p>
          <p><a class="ft-map" [href]="map" target="_blank" rel="noopener">{{ t('ftMap') }} ↗</a></p>
        </address>
      </div>

      <div class="wrap ft-area">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16V7h11v9M14 10h4l3 3v3h-7M7 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01"/></svg>
        <p>{{ t('ftArea') }}</p>
      </div>

      <div class="ft-bar"><div class="wrap">
        <span>© {{ year }} {{ s.company }} · IČO {{ s.ico }} · DIČ {{ s.dic }}</span>
        <span class="ft-legal">
          <a routerLink="/ochrana-udaju">{{ t('ftPrivacy') }}</a>
          <a routerLink="/admin">{{ t('ftStaff') }}</a>
          <a href="#top" (click)="up($event)">{{ t('ftUp') }} ↑</a>
        </span>
      </div></div>
    </footer>`,
})
export class FooterComponent {
  private i18n = inject(I18nService);
  readonly nav = inject(NavService);
  readonly s = SETTINGS;
  readonly logo = inject(DomSanitizer).bypassSecurityTrustHtml(LOGO_WHITE);
  readonly icons = ICONS;
  readonly socials = ['facebook', 'instagram', 'tiktok', 'youtube'];
  readonly year = new Date().getFullYear();
  readonly map = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(SETTINGS.address);
  readonly models: { type: Kind; L: number; W: number; size: string }[] = [
    { type: 'Y', L: 6, W: 3, size: '3 × 6 m' }, { type: 'K', L: 6, W: 3, size: '3 × 6 m' }, { type: 'P', L: 6, W: 3, size: '3 × 6 m' },
  ];
  t = (k: string) => this.i18n.t(k);
  hours = () => this.s.hours[this.i18n.lang()];
  label(k: string) { return k[0].toUpperCase() + k.slice(1); }
  up(e: Event) {
    e.preventDefault();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }
}
