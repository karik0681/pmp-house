import { Component, ElementRef, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Exploded } from '../three/explode';

/**
 * "What a container is made of": while the visitor scrolls through this tall section,
 * the 3D container stays pinned and comes apart layer by layer, with the matching text highlighted.
 */
@Component({
  selector: 'app-exploded',
  template: `
    <section class="xpl" id="skladba" [class.still]="still">
      <div class="xpl-pin"><div class="wrap xpl-grid">
        <div class="xpl-text">
          <h2>{{ t('xpH') }}</h2>
          <p class="sub">{{ t(still ? 'xpSubStill' : 'xpSub') }}</p>
          <ol class="xpl-list">
            @for (i of items; track i) {
              <li [class.on]="still || active() === i">
                <button type="button" (click)="jump(i)">
                  <span class="xn">{{ i + 1 }}</span>
                  <span><b>{{ t('xp' + (i + 1)) }}</b><small>{{ t('xp' + (i + 1) + 'D') }}</small></span>
                </button>
              </li>
            }
          </ol>
          <p class="xpl-note">{{ t('xpNote') }}</p>
        </div>
        <div class="xpl-3d">
          <canvas #canvas aria-hidden="true"></canvas>
          @for (p of tags(); track $index) {
            <span class="xtag" [class.on]="active() === $index" [style.transform]="'translate(' + p[0] + 'px,' + p[1] + 'px)'" aria-hidden="true">{{ $index + 1 }}</span>
          }
          <div class="xpl-bar" aria-hidden="true"><i [style.width.%]="progress() * 100"></i></div>
        </div>
      </div></div>
    </section>`,
})
export class ExplodedComponent implements OnDestroy {
  private i18n = inject(I18nService);
  private host = inject(ElementRef<HTMLElement>);
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private view: any = null;
  readonly items = [0, 1, 2, 3, 4, 5, 6];
  readonly active = signal(-1);
  readonly progress = signal(0);
  readonly tags = signal<number[][]>([]);
  readonly still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  t = (k: string) => this.i18n.t(k);

  private section() { return this.host.nativeElement.querySelector('.xpl') as HTMLElement; }

  private onScroll = () => {
    const v = this.view; if (!v || this.still) return;
    const r = this.section().getBoundingClientRect();
    const span = r.height - (innerHeight - 62);
    const p = Math.min(1, Math.max(0, (62 - r.top) / span));
    this.progress.set(p);
    v.setAmount(Math.min(1, p * 1.6));
    v.setView(-.5 - .5 * p);
    this.active.set(Math.min(6, Math.floor(p * 7)));
  };

  constructor() {
    afterNextRender(() => {
      try {
        const v: any = this.view = new Exploded(this.canvas().nativeElement);
        v.onRender = () => this.tags.set(this.amountShown() ? v.anchors() : []);
        if (this.still) { v.setAmount(1); v.setView(-.8); }
        addEventListener('scroll', this.onScroll, { passive: true });
        addEventListener('resize', this.onScroll, { passive: true });
        this.onScroll();
      } catch (e) { console.warn(e); }
    });
  }
  private amountShown() { return this.view && this.view.amount > .35; }

  /** clicking a line scrolls to the moment where that layer is explained */
  jump(i: number) {
    if (this.still) return;
    const el = this.section(), span = el.offsetHeight - (innerHeight - 62);
    const top = el.getBoundingClientRect().top + scrollY - 62 + span * (i + .5) / 7;
    scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  ngOnDestroy() {
    removeEventListener('scroll', this.onScroll); removeEventListener('resize', this.onScroll);
    this.view?.destroy();
  }
}
