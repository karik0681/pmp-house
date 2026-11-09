import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Photo } from './refs.data';

/** Full-screen photo viewer: arrows, keyboard (Esc closes), swipe on phones. */
@Component({
  selector: 'app-lightbox',
  template: `
    <dialog #dlg class="box" (click)="backdrop($event)" (keydown)="key($event)"
            (touchstart)="tx = $any($event).touches[0].clientX" (touchend)="swipe($event)">
      @if (current(); as ph) { <img [src]="ph.full" alt="" referrerpolicy="no-referrer"> }
      <p id="boxCap">{{ at() + 1 }} / {{ photos().length }}{{ caption() ? ' · ' + caption() : '' }}</p>
      @if (photos().length > 1) {
        <button type="button" id="boxPrev" class="bb" [attr.aria-label]="t('prevPhoto')" (click)="move(-1)">‹</button>
        <button type="button" id="boxNext" class="bb" [attr.aria-label]="t('nextPhoto')" (click)="move(1)">›</button>
      }
      <button type="button" id="boxClose" class="bb" [attr.aria-label]="t('closePhoto')" (click)="close()">×</button>
    </dialog>`,
})
export class LightboxComponent {
  private i18n = inject(I18nService);
  readonly photos = input.required<Photo[]>();
  readonly caption = input('');
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  readonly at = signal(0);
  readonly current = computed(() => this.photos()[this.at()]);
  tx = 0;
  t = (k: string) => this.i18n.t(k);

  open(i: number) { this.at.set(i); const d = this.dlg().nativeElement; if (!d.open) d.showModal(); }
  close() { this.dlg().nativeElement.close(); }
  move(d: number) { const n = this.photos().length; this.at.set((this.at() + d + n) % n); }
  backdrop(e: Event) { if (e.target === this.dlg().nativeElement) this.close(); }
  key(e: KeyboardEvent) { if (e.key === 'ArrowRight') this.move(1); if (e.key === 'ArrowLeft') this.move(-1); }
  swipe(e: TouchEvent) { const d = e.changedTouches[0].clientX - this.tx; if (Math.abs(d) > 50) this.move(d < 0 ? 1 : -1); }
}
