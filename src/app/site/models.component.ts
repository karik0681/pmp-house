import { Component, HostListener, inject, input, signal } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { money } from '../core/format';
import { Cfg, fresh, repair } from '../configurator/model';
import { NavService } from './nav.service';

/** One best-selling ready model: its photo (public/modely/<id>-600|960.webp), size, price and the configuration it opens. */
interface Model { id: string; dim: string; price: number | null; cfg: () => Cfg }

const make = (c: Cfg, edit: (c: Cfg) => void) => { edit(c); repair(c); return c; };

/** The best sellers. Texts live in i18n under md_<id>_n (name) and md_<id>_t (one line). Prices excl. VAT; null = on request. */
const MODELS: Model[] = [
  { id: 'y6fr', dim: '6 × 3 m · 18 m²', price: 130000, cfg: () => make(fresh('Y', 6, 3), c => { c.color = 'wood'; c.w.f = { door: 0, win: 0, win3: 0, fr: 1, pano: 0 }; }) },
  { id: 'y7', dim: '7 × 3 m · 21 m²', price: 140000, cfg: () => make(fresh('Y', 7, 3), c => { c.color = 'ant'; }) },
  { id: 'p6', dim: '6 × 3 m · 18 m²', price: null, cfg: () => fresh('P', 6, 3) },
  { id: 'k6b', dim: '6 × 2,4 m · 14,4 m²', price: 99000, cfg: () => fresh('K', 6, 2.4) },
  { id: 'k4', dim: '4 × 2,4 m · 9,6 m²', price: 80000, cfg: () => make(fresh('K', 4, 2.4), c => { c.w.f = { door: 1, win: 1, win3: 0, fr: 0, pano: 0 }; }) },
  { id: 'san', dim: '6 × 2,4 m · 14,4 m²', price: 175300, cfg: () => make(fresh('K', 6, 2.4), c => { c.wc = 2; c.shower = 2; }) },
];

/** The best-selling ready models with real photos. "Poptat" opens the enquiry step, "Upravit ve 3D" the first step. */
@Component({
  selector: 'app-models',
  template: `
    <section class="std" [class.std-page]="page()"><div class="wrap">
      @if (!page()) { <div class="sec-head"><div><h2>{{ t('mdH') }}</h2><p class="sub">{{ t('mdSub') }}</p></div></div> }
      <div class="std-grid">
        @for (m of models; track m.id; let i = $index) {
          <article class="std-c">
            <button type="button" class="std-open" [attr.aria-label]="t('md_' + m.id + '_n')" (click)="open(i, $event)"></button>
            <img [src]="'/modely/' + m.id + '-600.webp'" [attr.srcset]="'/modely/' + m.id + '-600.webp 600w, /modely/' + m.id + '-960.webp 960w'"
              sizes="(max-width: 560px) 80vw, (max-width: 1100px) 50vw, 400px" width="600" height="413" loading="lazy" decoding="async"
              [alt]="t('md_' + m.id + '_n') + ', ' + m.dim">
            <div class="std-b">
              <h3>{{ t('md_' + m.id + '_n') }}</h3>
              <p class="std-dim">{{ m.dim }}</p>
              <p>{{ t('md_' + m.id + '_t') }}</p>
              <p class="std-p">
                @if (m.price) { {{ t('mdFrom') }} {{ money(m.price) }}<small>{{ t('mdVat') }}</small> }
                @else { {{ t('mdOnReq') }}<small>&nbsp;</small> }
              </p>
              <div class="std-a">
                <a class="btn btn-g" href="#konfigurator" (click)="nav.preset(m.cfg(), 4, $event)">{{ t('mdAsk') }}</a>
                <a class="btn btn-o" href="#konfigurator" (click)="nav.preset(m.cfg(), 0, $event)">{{ t('md3d') }}</a>
              </div>
            </div>
          </article>
        }
      </div>
      @if (sel(); as m) {
        <div class="std-sheet" role="dialog" aria-modal="true" [attr.aria-label]="t('md_' + m.id + '_n')" (touchstart)="sx = $any($event).touches[0].clientX" (touchend)="swipe($event)">
          <div class="std-dim-bg" (click)="close()"></div>
          <div class="std-box">
            <div class="std-grab"></div>
            <button type="button" class="std-x" aria-label="Zavřít" (click)="close()">×</button>
            <img [src]="'/modely/' + m.id + '-960.webp'" width="960" height="661" [alt]="t('md_' + m.id + '_n')">
            <h3>{{ t('md_' + m.id + '_n') }}</h3>
            <p class="std-dim">{{ m.dim }}</p>
            <p>{{ t('md_' + m.id + '_t') }}</p>
            <p class="std-p">
              @if (m.price) { {{ t('mdFrom') }} {{ money(m.price) }}<small>{{ t('mdVat') }}</small> }
              @else { {{ t('mdOnReq') }} }
            </p>
            <div class="std-a">
              <a class="btn btn-g" href="#konfigurator" (click)="close(); nav.preset(m.cfg(), 4, $event)">{{ t('mdAsk') }}</a>
              <a class="btn btn-o" href="#konfigurator" (click)="close(); nav.preset(m.cfg(), 0, $event)">{{ t('md3d') }}</a>
            </div>
            <div class="std-nav"><button type="button" (click)="step(-1)">‹ {{ t('mdPrev') }}</button><button type="button" (click)="step(1)">{{ t('mdNext') }} ›</button></div>
          </div>
        </div>
      }
      @if (page()) {
        <div class="std-more"><p>{{ t('mdMore') }}</p><a class="btn btn-o" href="/#konfigurator" (click)="nav.section('konfigurator', $event)">{{ t('mdMoreBtn') }} →</a></div>
      }
    </div></section>`,
})
export class ModelsComponent {
  /** true on its own page (/modely): the page header carries the title */
  readonly page = input(false);
  private i18n = inject(I18nService);
  readonly nav = inject(NavService);
  readonly models = MODELS;
  readonly money = money;
  t = (k: string) => this.i18n.t(k);
  /** the model opened in the bottom sheet (phones only) */
  private idx = signal(-1);
  readonly sel = () => this.models[this.idx()] ?? null;
  sx = 0;
  private last: HTMLElement | null = null;
  open(i: number, e: Event) { this.last = e.currentTarget as HTMLElement; this.idx.set(i); document.body.style.overflow = 'hidden'; }
  close() { this.idx.set(-1); document.body.style.overflow = ''; this.last?.focus(); }
  step(d: number) { this.idx.set((this.idx() + d + this.models.length) % this.models.length); }
  swipe(e: TouchEvent) { const d = e.changedTouches[0].clientX - this.sx; if (Math.abs(d) > 60) this.step(d < 0 ? 1 : -1); }
  @HostListener('document:keydown', ['$event']) key(e: KeyboardEvent) {
    if (this.idx() < 0) return;
    if (e.key === 'Escape') this.close(); else if (e.key === 'ArrowRight') this.step(1); else if (e.key === 'ArrowLeft') this.step(-1);
  }
}
