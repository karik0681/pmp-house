import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { SETTINGS } from '../core/settings';
import { Lang } from '../core/i18n';
import { NavService } from './nav.service';
import { DomSanitizer } from '@angular/platform-browser';
import { LOGO_COMPACT } from './logo';

interface Item { label: string; id?: string; route?: string }

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="top">
      <a class="brand" href="#/" aria-label="PMP house" [innerHTML]="logo" (click)="nav.section('top', $event)"></a>
      <nav aria-label="Menu">
        @for (n of items; track n.label) {
          @if (n.route) { <a [routerLink]="n.route" routerLinkActive="on" (click)="nav.menuOpen.set(false)">{{ t(n.label) }}</a> }
          @else { <a [href]="'#' + n.id" (click)="nav.section(n.id!, $event)">{{ t(n.label) }}</a> }
        }
      </nav>
      <div class="top-end">
        <a class="tel" [href]="'tel:+' + s.whatsapp">{{ s.phone }}</a>
        @if (langs.length > 1) {
          <div class="langs">
            @for (l of langs; track l.k) {
              <button type="button" [attr.aria-pressed]="i18n.lang() === l.k" (click)="i18n.lang.set(l.k)">{{ l.label }}</button>
            }
          </div>
        }
        <button type="button" class="burger" [attr.aria-expanded]="nav.menuOpen()" aria-controls="mmenu"
                [attr.aria-label]="t('menu')" (click)="nav.menuOpen.set(!nav.menuOpen())">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            @if (nav.menuOpen()) { <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/> }
            @else { <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/> }
          </svg>
        </button>
      </div>
    </header>
    @if (nav.menuOpen()) {
      <div class="mmenu" id="mmenu">
        @for (n of items; track n.label) {
          @if (n.route) { <a [routerLink]="n.route" (click)="nav.menuOpen.set(false)">{{ t(n.label) }}</a> }
          @else { <a [href]="'#' + n.id" (click)="nav.section(n.id!, $event)">{{ t(n.label) }}</a> }
        }
        <div class="mm-end">
          <a class="btn btn-o" [href]="'tel:+' + s.whatsapp">{{ s.phone }}</a>
          <a class="btn btn-wa" [href]="'https://wa.me/' + s.whatsapp" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
    }`,
})
export class HeaderComponent {
  readonly i18n = inject(I18nService);
  readonly nav = inject(NavService);
  readonly s = SETTINGS;
  /* our own constant SVG, safe to insert */
  readonly logo = inject(DomSanitizer).bypassSecurityTrustHtml(LOGO_COMPACT);
  readonly langs: { k: Lang; label: string }[] = SETTINGS.languages.map(k => ({ k, label: k === 'cs' ? 'CZ' : k.toUpperCase() }));
  readonly items: Item[] = [
    { id: 'konfigurator', label: 'navCfg' }, { id: 'konstrukce', label: 'navTypes' },
    { route: '/reference', label: 'navRefs' }, { route: '/montaz', label: 'navMontage' },
    { id: 'otazky', label: 'navFaq' }, { id: 'kontakt', label: 'navContact' },
  ];
  t = (k: string) => this.i18n.t(k);
}
