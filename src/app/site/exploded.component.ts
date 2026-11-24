import { Component, ElementRef, OnDestroy, afterNextRender, inject, signal, viewChild, viewChildren } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Cutaway } from '../three/cutaway';

/**
 * "What a container is made of": a cut-away 3D container. The visitor turns it, picks a layer in the list
 * (its number lights up on the model).
 * Picking the corner joint opens a magnifier with the bolted corner plates.
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
              <li [class.on]="active() === i">
                <button type="button" [attr.aria-pressed]="active() === i" (click)="pick(i)">
                  <span class="xn">{{ i + 1 }}</span>
                  <span><b>{{ t('xc' + (i + 1)) }}</b><small>{{ t('xc' + (i + 1) + 'D') }}</small></span>
                </button>
              </li>
            }
          </ol>
          <p class="xpl-note">{{ t('xpNote') }}</p>
        </div>
        <div class="xpl-3d">
          <div class="xpl-view">
            <canvas #canvas aria-hidden="true"></canvas>
            @for (i of items; track i) {
              <button #mk type="button" class="xmk" [class.on]="active() === i" tabindex="-1" aria-hidden="true" (click)="pick(i)">
                <span class="xmk-n">{{ i + 1 }}</span>@if (active() === i) {<span class="xmk-t">{{ t('xc' + (i + 1)) }}</span>}
              </button>
            }
          </div>
          <div class="xpl-ctl">
            <span class="xpl-hint">{{ t('xcHint') }}</span>
          </div>
        </div>
      </div>
    </section>`,
})
export class ExplodedComponent implements OnDestroy {
  private i18n = inject(I18nService);
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private marks = viewChildren<ElementRef<HTMLElement>>('mk');
  private view: Cutaway | null = null;
  readonly items = [0, 1, 2, 3, 4, 5];
  readonly active = signal(-1);
  t = (k: string) => this.i18n.t(k);

  constructor() {
    afterNextRender(() => {
      try { this.view = new Cutaway(this.canvas().nativeElement, this.marks().map(m => m.nativeElement)); }
      catch (e) { console.warn(e); }
    });
  }

  pick(i: number) {
    const next = this.active() === i ? -1 : i;
    this.active.set(next); this.view?.setActive(next);
  }

  ngOnDestroy() { this.view?.destroy(); }
}
