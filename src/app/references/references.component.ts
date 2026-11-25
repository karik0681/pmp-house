import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../core/seo.service';
import { I18nService } from '../core/i18n.service';
import { REFERENCES, Reference } from './refs.data';
import { refTags } from './ref-tags';

@Component({
  selector: 'app-references',
  imports: [RouterLink],
  template: `
    <main class="pg">
      <header class="pg-head"><div class="wrap">
        <p class="crumbs"><a routerLink="/">{{ t('home') }}</a> <span aria-hidden="true">/</span> {{ t('navRefs') }}</p>
        <h1>{{ t('refH') }}</h1>
        <p class="sub">{{ t('refSub') }}</p>
        <dl class="stats">
          <div><dt>{{ t('refStatProjects') }}</dt><dd>{{ all.length }}</dd></div>
          <div><dt>{{ t('refStatPlaces') }}</dt><dd>{{ places }}</dd></div>
          <div><dt>{{ t('refStatArea') }}</dt><dd>{{ area }} m²</dd></div>
        </dl>
      </div></header>

      <section class="wrap pg-body">
        <!-- hashtag filter: one tap shows only the projects with that tag -->
        <div class="tags" role="group" [attr.aria-label]="t('refFilter')">
          <button type="button" [attr.aria-pressed]="!tag()" (click)="tag.set(null)">{{ t('a_all') }} <small>{{ all.length }}</small></button>
          @for (g of tagList; track g.tag) {
            <button type="button" [attr.aria-pressed]="tag() === g.tag" (click)="pick(g.tag)">{{ g.tag }} <small>{{ g.n }}</small></button>
          }
        </div>
        <!-- compact square grid, like a phone photo album -->
        <ul class="album">
          @for (r of list(); track r.slug) {
            <li>
              <a class="tile" [routerLink]="['/reference', r.slug]">
                <img [src]="r.cover.thumb" [alt]="r.title[lang()] + ', ' + r.place" loading="lazy" referrerpolicy="no-referrer" (error)="$any($event.target).hidden = true">
                <span class="tile-n" [attr.aria-label]="t('refPhotos') + ': ' + (r.photos.length + 1)">{{ r.photos.length + 1 }}</span>
                <span class="tile-t">{{ r.title[lang()] }}</span>
              </a>
              <p class="tile-tags">
                @for (g of tagsOf(r); track g) {
                  <button type="button" [class.on]="tag() === g" (click)="pick(g)">{{ g }}</button>
                }
              </p>
            </li>
          }
        </ul>
      </section>
    </main>`,
})
export class ReferencesComponent {
  private i18n = inject(I18nService);
  readonly all = REFERENCES;
  readonly lang = this.i18n.lang;
  t = (k: string) => this.i18n.t(k);
  tagsOf = (r: Reference) => refTags(r, this.t);
  /** every hashtag with its number of projects, the most used first */
  readonly tagList = (() => {
    const n = new Map<string, number>();
    for (const r of REFERENCES) for (const g of this.tagsOf(r)) n.set(g, (n.get(g) || 0) + 1);
    return [...n].map(([tag, count]) => ({ tag, n: count })).sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag, 'cs'));
  })();
  readonly tag = signal<string | null>(null);
  readonly list = computed(() => { const g = this.tag(); return g ? this.all.filter(r => this.tagsOf(r).includes(g)) : this.all; });
  readonly places = new Set(REFERENCES.map(r => r.place)).size;
  readonly area = REFERENCES.reduce((s, r) => s + r.L * r.W * r.count, 0);
  constructor() { inject(SeoService).page(this.t('seoRefs'), this.t('refSub'), { path: '/reference', noindex: REFERENCES.every(r => r.demo) }); /* sample stories stay out of Google until real ones replace them */ }
  /** tapping the active tag again shows everything */
  pick(g: string) { this.tag.set(this.tag() === g ? null : g); }
}
