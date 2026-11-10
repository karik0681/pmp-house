import { Component, ElementRef, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Exploded } from '../three/explode';

/**
 * "What a container is made of": the visitor steps through six layers with the arrows
 * (or the numbered buttons, or a swipe). Step 0 is the whole container; from step 1 it is taken apart.
 */
@Component({
  selector: 'app-exploded',
  template: `
    <section class="xpl" id="skladba">
      <div class="wrap xpl-grid">
        <div class="xpl-text">
          <h2>{{ t('xpH') }}</h2>
          <p class="sub">{{ t('xpSub') }}</p>
          <ol class="xpl-list">
            @for (i of items; track i) {
              <li [class.on]="step() === i + 1">
                <button type="button" (click)="go(i + 1)">
                  <span class="xn">{{ i + 1 }}</span>
                  <span><b>{{ t('xp' + keys[i]) }}</b><small>{{ t('xp' + keys[i] + 'D') }}</small></span>
                </button>
              </li>
            }
          </ol>
          @if (step() === 0) { <p class="xpl-start">{{ t('xpStart') }}</p> }
          <p class="xpl-note">{{ t('xpNote') }}</p>
        </div>
        <div class="xpl-3d">
          <div class="xpl-view" (touchstart)="tx = $any($event).touches[0].clientX" (touchend)="swipe($event)">
            <canvas #canvas aria-hidden="true"></canvas>
            @for (p of tags(); track $index) {
              <span class="xtag" [class.on]="step() === $index + 1" [style.transform]="'translate(' + p[0] + 'px,' + p[1] + 'px)'" aria-hidden="true">{{ $index + 1 }}</span>
            }
          </div>
          <div class="xpl-ctl">
            <button type="button" class="xarrow" [attr.aria-label]="t('xpPrev')" [disabled]="step() === 0" (click)="go(step() - 1)">‹</button>
            <div class="xdots">
              @for (i of items; track i) {
                <button type="button" [attr.aria-pressed]="step() === i + 1" [attr.aria-label]="t('xpLayer') + ' ' + (i + 1) + ': ' + t('xp' + keys[i])" (click)="go(i + 1)">{{ i + 1 }}</button>
              }
            </div>
            <span class="xcount" aria-live="polite">{{ step() ? t('xpLayer') + ' ' + step() + ' / ' + last : t('xpWhole') }}</span>
            @if (step() < last) { <button type="button" class="xarrow" [attr.aria-label]="t('xpNext')" (click)="go(step() + 1)">›</button> }
            @else { <button type="button" class="xarrow" [attr.aria-label]="t('xpReset')" [title]="t('xpReset')" (click)="go(0)">↺</button> }
          </div>
        </div>
      </div>
    </section>`,
})
export class ExplodedComponent implements OnDestroy {
  private i18n = inject(I18nService);
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private view: any = null;
  private raf = 0;
  private io?: IntersectionObserver;
  private amount = 0;
  private theta = -.5;
  readonly items = [0, 1, 2, 3, 4, 5];
  /** text keys of the layers (xp3, the posts, is no longer shown) */
  readonly keys = [1, 2, 4, 5, 6, 7];
  readonly last = this.items.length;
  /** 0 = whole container, 1–6 = the layer being explained */
  readonly step = signal(0);
  readonly tags = signal<number[][]>([]);
  tx = 0;
  t = (k: string) => this.i18n.t(k);

  constructor() {
    afterNextRender(() => {
      try {
        const v: any = this.view = new Exploded(this.canvas().nativeElement);
        v.onRender = () => this.tags.set(v.amount > .35 ? v.anchors() : []);
        v.setView(this.theta);
        /* the first time the block is on screen, take the container apart once to show what the arrows do */
        this.io = new IntersectionObserver(es => {
          if (es[0].isIntersecting) { this.io?.disconnect(); if (this.step() === 0) this.go(1); }
        }, { threshold: .6 });
        this.io.observe(this.canvas().nativeElement);
      } catch (e) { console.warn(e); }
    });
  }

  go(i: number) {
    this.step.set(Math.max(0, Math.min(this.last, i)));
    this.animate();
  }
  swipe(e: TouchEvent) {
    const d = e.changedTouches[0].clientX - this.tx;
    if (Math.abs(d) > 50) this.go(this.step() + (d < 0 ? 1 : -1));
  }

  /** eases the model towards the state of the current step */
  private animate() {
    const v = this.view; if (!v) return;
    const toAmount = this.step() ? 1 : 0, toTheta = -.5 - .5 * (this.step() / this.last);
    cancelAnimationFrame(this.raf);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.amount = toAmount; this.theta = toTheta; v.setAmount(toAmount); v.setView(toTheta); return;
    }
    const tick = () => {
      this.amount += (toAmount - this.amount) * .07;
      this.theta += (toTheta - this.theta) * .07;
      const done = Math.abs(toAmount - this.amount) < .002 && Math.abs(toTheta - this.theta) < .002;
      if (done) { this.amount = toAmount; this.theta = toTheta; }
      v.setAmount(this.amount); v.setView(this.theta);
      if (!done) this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  ngOnDestroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.io?.disconnect();
    this.view?.destroy();
  }
}
