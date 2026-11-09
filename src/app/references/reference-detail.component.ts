import { Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { I18nService } from '../core/i18n.service';
import { SETTINGS } from '../core/settings';
import { dim, num } from '../core/format';
import { NavService } from '../site/nav.service';
import { RefCardComponent } from './ref-card.component';
import { LightboxComponent } from './lightbox.component';
import { REFERENCES } from './refs.data';

@Component({
  selector: 'app-reference-detail',
  imports: [RefCardComponent, LightboxComponent],
  template: `
    @if (ref(); as r) {
      <main class="pg">
        <header class="pg-head"><div class="wrap">
          <p class="crumbs"><a href="#/">{{ t('home') }}</a> <span aria-hidden="true">/</span>
            <a href="#/reference">{{ t('navRefs') }}</a> <span aria-hidden="true">/</span> {{ r.title[lang()] }}</p>
          <div class="rd-head">
            <div>
              <p class="rd-use">{{ t('use_' + r.use) }}</p>
              <h1>{{ r.title[lang()] }}</h1>
              <p class="sub">{{ r.lead[lang()] }}</p>
              @if (r.demo) { <p class="demo-note">{{ t('refDemo') }}</p> }
            </div>
            <dl class="facts">
              <div><dt>{{ t('refPlace') }}</dt><dd>{{ r.place }}</dd></div>
              <div><dt>{{ t('refYear') }}</dt><dd>{{ r.year }}</dd></div>
              <div><dt>{{ t('refModel') }}</dt><dd>{{ t(r.type) }}</dd></div>
              <div><dt>{{ t('refSize') }}</dt><dd>{{ size() }}</dd></div>
              <div><dt>{{ t('refArea') }}</dt><dd>{{ area() }} m²</dd></div>
              <div><dt>{{ t('refDays') }}</dt><dd>{{ days() }}</dd></div>
            </dl>
          </div>
        </div></header>

        <section class="wrap pg-body">
          <div class="mosaic">
            @for (ph of photos(); track ph.thumb; let i = $index) {
              <button type="button" class="ph" [class.big]="i === 0" [attr.aria-label]="t('openPhoto') + ' ' + (i + 1)" (click)="box.open(i)">
                <img [src]="i === 0 ? ph.full : ph.thumb" alt="" loading="lazy" referrerpolicy="no-referrer" (error)="$any($event.target).hidden = true">
              </button>
            }
          </div>

          <div class="story">
            <section><span class="story-n">1</span><h2>{{ t('refTask') }}</h2><p>{{ r.task[lang()] }}</p></section>
            <section><span class="story-n">2</span><h2>{{ t('refSolution') }}</h2><p>{{ r.solution[lang()] }}</p></section>
            <section><span class="story-n">3</span><h2>{{ t('refResult') }}</h2><p>{{ r.result[lang()] }}</p></section>
          </div>

          <aside class="rd-cta">
            <div><h2>{{ t('refSimilarH') }}</h2><p>{{ t('refSimilarSub') }}</p></div>
            <div class="ft-btns">
              <a class="btn btn-y" href="#konfigurator" (click)="nav.model(r, $event)">{{ t('refSimilarBtn') }}</a>
              <a class="btn btn-wa" [href]="wa()" target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </aside>

          <h2 class="more-h">{{ t('refMore') }}</h2>
          <div class="rgrid">
            @for (o of others(); track o.slug) { <app-ref-card [ref]="o" /> }
          </div>
        </section>
        <app-lightbox #box [photos]="photos()" [caption]="r.title[lang()]" />
      </main>
    }`,
})
export class ReferenceDetailComponent {
  private i18n = inject(I18nService);
  private router = inject(Router);
  readonly nav = inject(NavService);
  readonly lang = this.i18n.lang;
  private readonly slug = toSignal(inject(ActivatedRoute).paramMap.pipe(map(p => p.get('slug'))));
  readonly ref = computed(() => REFERENCES.find(r => r.slug === this.slug()));
  readonly photos = computed(() => { const r = this.ref(); return r ? [r.cover, ...r.photos] : []; });
  readonly size = computed(() => { const r = this.ref()!; return (r.count > 1 ? `${r.count} × ` : '') + dim(r.L, r.W); });
  readonly area = computed(() => { const r = this.ref()!; return num(r.L * r.W * r.count); });
  readonly days = computed(() => { const n = this.ref()!.days; return `${n} ${this.t(n === 1 ? 'day1' : 'dayN')}`; });
  /* three other projects, preferring the same use */
  readonly others = computed(() => {
    const r = this.ref();
    if (!r) return [];
    const rest = REFERENCES.filter(o => o.slug !== r.slug);
    return [...rest.filter(o => o.use === r.use), ...rest.filter(o => o.use !== r.use)].slice(0, 3);
  });
  readonly wa = computed(() => `https://wa.me/${SETTINGS.whatsapp}?text=${encodeURIComponent(this.t('refWaText').replace('{p}', this.ref()?.title[this.lang()] ?? ''))}`);
  t = (k: string) => this.i18n.t(k);

  constructor() {
    effect(() => { if (this.slug() && !this.ref()) this.router.navigate(['/reference']); });
  }
}
