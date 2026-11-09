import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { dim, num } from '../core/format';
import { Reference } from './refs.data';

/** One project card: used on the reference list, on the home page and under a project. */
@Component({
  selector: 'app-ref-card',
  imports: [RouterLink],
  template: `
    @let r = ref();
    <a class="rc" [routerLink]="['/reference', r.slug]">
      <div class="ph"><img [src]="r.cover.thumb" alt="" loading="lazy" referrerpolicy="no-referrer" (error)="$any($event.target).hidden = true"></div>
      <span class="rc-use">{{ t('use_' + r.use) }}</span>
      <div class="rc-body">
        <p class="rc-meta">{{ r.place }} · {{ r.year }}</p>
        <h3>{{ r.title[i18n.lang()] }}</h3>
        <p class="rc-lead">{{ r.lead[i18n.lang()] }}</p>
        <p class="rc-spec">{{ t(r.type) }} · {{ size(r) }} · {{ area(r) }} m²</p>
        <span class="rc-more">{{ t('refOpen') }} <span aria-hidden="true">→</span></span>
      </div>
    </a>`,
})
export class RefCardComponent {
  readonly i18n = inject(I18nService);
  readonly ref = input.required<Reference>();
  t = (k: string) => this.i18n.t(k);
  size = (r: Reference) => (r.count > 1 ? `${r.count} × ` : '') + dim(r.L, r.W);
  area = (r: Reference) => num(r.L * r.W * r.count);
}
