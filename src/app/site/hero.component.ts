import { Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { goTo } from '../core/scroll';
import { money } from '../core/format';
import { fromPrice } from '../configurator/model';
import { CZ } from './cz-map';
import { PLAN } from './hero-plan';

/** Top of the home page: the offer on the left, a site plan with four container sets and a delivery map on the right. */
@Component({
  selector: 'app-hero',
  template: `
    <section class="hero">
      <div class="hero-plan">
        <svg class="hp-under" [attr.viewBox]="box" aria-hidden="true">
          <path class="hp-grid" [attr.d]="plan.grid" />
          @for (s of plan.sets; track s.k) {
            <path class="hp-plot" [attr.d]="s.plot" /><path class="hp-foot" [attr.d]="s.foot" />
            @for (d of s.dims; track $index) {
              <g class="hp-dim">
                <line [attr.x1]="d.a[0]" [attr.y1]="d.a[1]" [attr.x2]="d.b[0]" [attr.y2]="d.b[1]" />
                <circle [attr.cx]="d.a[0]" [attr.cy]="d.a[1]" r="1.6" /><circle [attr.cx]="d.b[0]" [attr.cy]="d.b[1]" r="1.6" />
                <rect [attr.x]="mid(d)[0] - 19" [attr.y]="mid(d)[1] - 8.5" width="38" height="17" rx="8.5" />
                <text [attr.x]="mid(d)[0]" [attr.y]="mid(d)[1] + 3.8" text-anchor="middle">{{ metres(d.m) }}</text>
              </g>
            }
          }
        </svg>
        <img class="hp-img" src="/hero/sestavy.webp" [attr.width]="plan.img.pw" [attr.height]="plan.img.ph" [alt]="t('planAlt')" fetchpriority="high"
          [style.left.%]="plan.img.x / plan.w * 100" [style.top.%]="plan.img.y / plan.h * 100" [style.width.%]="plan.img.w / plan.w * 100">
        <svg class="hp-over" [attr.viewBox]="box" aria-hidden="true">
          @for (s of plan.sets; track s.k) {
            <line [attr.x1]="s.anchor[0]" [attr.y1]="s.anchor[1]" [attr.x2]="s.top[0]" [attr.y2]="s.top[1]" /><circle [attr.cx]="s.anchor[0]" [attr.cy]="s.anchor[1]" r="3" />
          }
        </svg>
        @for (s of plan.sets; track s.k) {
          <p class="hp-chip" [class.is-main]="s.k === 'u'" [style.left.%]="s.top[0] / plan.w * 100" [style.top.%]="s.top[1] / plan.h * 100"><b>{{ t('set_' + s.k) }}</b><span>{{ t('setS_' + s.k) }}</span></p>
        }
        <div class="hp-map">
          <b>{{ t('mapH') }}</b>
          <span><i></i>{{ t('mapSub') }}</span>
          <svg [attr.viewBox]="'-10 -30 ' + (cz.w + 20) + ' ' + (cz.h + 41)" aria-hidden="true">
            <path class="land" [attr.d]="cz.path" />
            @for (c of cz.cities; track c.n) { <line [attr.x1]="cz.home.x" [attr.y1]="cz.home.y" [attr.x2]="c.x" [attr.y2]="c.y" /> }
            @for (c of cz.cities; track c.n) { <circle class="city" [attr.cx]="c.x" [attr.cy]="c.y" r="10" /> }
            <circle class="ring" [attr.cx]="cz.home.x" [attr.cy]="cz.home.y" r="34" /><circle class="home" [attr.cx]="cz.home.x" [attr.cy]="cz.home.y" r="15" />
          </svg>
        </div>
      </div>
      <div class="hero-t">
        <p class="eyebrow"><i></i>{{ t('eyebrow') }}</p>
        <h1>{{ t('h1') }}</h1>
        <p class="hero-lead">{{ t('lead') }}</p>
        <div class="cta">
          <a class="btn btn-g" href="#konfigurator" (click)="go($event, 'konfigurator')">{{ t('cta') }}</a>
          <a class="btn btn-o" href="#konstrukce" (click)="go($event, 'konstrukce')">{{ t('cta2') }}</a>
        </div>
        <dl class="facts">
          <div><dt>{{ t('f1k') }}</dt><dd>{{ t('f1v') }}</dd></div>
          <div><dt>{{ t('f2k') }}</dt><dd>{{ t('f2v') }}</dd></div>
          <div><dt>{{ t('tFrom') }}</dt><dd>{{ t('from') }} {{ price }}</dd></div>
        </dl>
      </div>
    </section>`,
})
export class HeroComponent {
  private i18n = inject(I18nService);
  readonly cz = CZ;
  readonly plan = PLAN;
  readonly box = `0 0 ${PLAN.w} ${PLAN.h}`;
  /** the published "from" price of a 3 × 6 m Standard */
  readonly price = money(fromPrice('K'));
  t = (k: string) => this.i18n.t(k);
  go = goTo;
  /** the middle of a dimension line, where its label sits */
  mid(d: { a: number[]; b: number[] }) { return [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2]; }
  metres(v: number) { return String(v).replace('.', ',') + ' m'; }
}
