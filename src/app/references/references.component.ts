import { Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { RefCardComponent } from './ref-card.component';
import { REFERENCES, USES, Use } from './refs.data';

@Component({
  selector: 'app-references',
  imports: [RefCardComponent],
  template: `
    <main class="pg">
      <header class="pg-head"><div class="wrap">
        <p class="crumbs"><a href="#/">{{ t('home') }}</a> <span aria-hidden="true">/</span> {{ t('navRefs') }}</p>
        <h1>{{ t('refH') }}</h1>
        <p class="sub">{{ t('refSub') }}</p>
        <dl class="stats">
          <div><dt>{{ t('refStatProjects') }}</dt><dd>{{ all.length }}</dd></div>
          <div><dt>{{ t('refStatPlaces') }}</dt><dd>{{ places }}</dd></div>
          <div><dt>{{ t('refStatArea') }}</dt><dd>{{ area }} m²</dd></div>
        </dl>
      </div></header>

      <section class="wrap pg-body">
        <div class="chips" role="group" [attr.aria-label]="t('refFilter')">
          <button type="button" [attr.aria-pressed]="use() === 'all'" (click)="use.set('all')">{{ t('a_all') }}</button>
          @for (u of uses; track u) {
            <button type="button" [attr.aria-pressed]="use() === u" (click)="use.set(u)">{{ t('use_' + u) }} <small>{{ count(u) }}</small></button>
          }
        </div>
        <div class="rgrid">
          @for (r of list(); track r.slug) { <app-ref-card [ref]="r" /> }
        </div>
      </section>
    </main>`,
})
export class ReferencesComponent {
  private i18n = inject(I18nService);
  readonly all = REFERENCES;
  /* only filters that have at least one project */
  readonly uses = USES.filter(u => REFERENCES.some(r => r.use === u));
  readonly use = signal<Use | 'all'>('all');
  readonly list = computed(() => (this.use() === 'all' ? this.all : this.all.filter(r => r.use === this.use())));
  readonly places = new Set(REFERENCES.map(r => r.place)).size;
  readonly area = REFERENCES.reduce((s, r) => s + r.L * r.W * r.count, 0);
  t = (k: string) => this.i18n.t(k);
  count = (u: Use) => this.all.filter(r => r.use === u).length;
}
