import { Component, ElementRef, OnDestroy, afterNextRender, inject, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { goTo, scrollToId } from '../core/scroll';
import { Stage } from '../three/stage';
import { fresh } from '../configurator/model';
import { CZ } from './cz-map';

@Component({
  selector: 'app-hero',
  template: `
    <section class="hero">
      <svg class="hero-map" [attr.viewBox]="'0 0 ' + cz.w + ' ' + cz.h" aria-hidden="true">
        <path class="land" [attr.d]="cz.path" />
        @for (c of cz.cities; track c.n) { <line class="route" [attr.x1]="cz.home.x" [attr.y1]="cz.home.y" [attr.x2]="c.x" [attr.y2]="c.y" /> }
        @for (c of cz.cities; track c.n) {
          <circle class="city" [attr.cx]="c.x" [attr.cy]="c.y" r="4" />
        }
        <circle class="home-ring" [attr.cx]="cz.home.x" [attr.cy]="cz.home.y" r="12" />
        <circle class="home" [attr.cx]="cz.home.x" [attr.cy]="cz.home.y" r="5.5" />
        <text class="home-t" [attr.x]="cz.home.x - 14" [attr.y]="cz.home.y - 12" text-anchor="end">{{ cz.home.n }}</text>
      </svg>
      <div class="hero-3d"><canvas #canvas aria-hidden="true"></canvas></div>
      <div class="hero-t">
        <h1>{{ t('h1') }}</h1>
        <p>{{ t('lead') }}</p>
        <div class="cta">
          <a class="btn btn-g" href="#konfigurator" (click)="go($event, 'konfigurator')">{{ t('cta') }}</a>
          <a class="btn btn-o" href="#konstrukce" (click)="go($event, 'konstrukce')">{{ t('cta2') }}</a>
        </div>
        <dl class="facts">
          <div><dt>{{ t('f1k') }}</dt><dd>{{ t('f1v') }}</dd></div>
          <div><dt>{{ t('f2k') }}</dt><dd>{{ t('f2v') }}</dd></div>
        </dl>
      </div>
    </section>`,
})
export class HeroComponent implements OnDestroy {
  private i18n = inject(I18nService);
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly cz = CZ;
  private stage: any = null;
  private timer = 0;
  t = (k: string) => this.i18n.t(k);
  go = goTo;

  private place = () => {
    const st = this.stage; if (!st) return;
    const m = innerWidth < 860;
    st.fitScale = m ? 1.1 : 1.16; st.setOffset(m ? 0 : .19, m ? .31 : .1); st.fit(); st.radius = st.radiusTo;
  };

  constructor() {
    afterNextRender(() => {
      try {
        const st: any = this.stage = new Stage(this.canvas().nativeElement);
        st.theta = .62; st.phi = 1.38;
        st.build(fresh('P', 6, 3));
        this.place(); addEventListener('resize', this.place);
        /* the one orchestrated moment: the frame stands first, then the walls rise */
        st.skel = 1; st.pose();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { st.skel = 0; st.pose(); }
        else this.timer = window.setTimeout(() => { st.skelTo = 0; }, 1300);
      } catch (e) { console.warn(e); }
    });
  }

  ngOnDestroy() { clearTimeout(this.timer); removeEventListener('resize', this.place); this.stage?.destroy(); }
}
