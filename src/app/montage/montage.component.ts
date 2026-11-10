import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { SeoService } from '../core/seo.service';
import { I18nService } from '../core/i18n.service';
import { NavService } from '../site/nav.service';
import { FOUNDATION_ART, STEP_ART } from './drawings';

@Component({
  selector: 'app-montage',
  imports: [RouterLink],
  template: `
    <main class="pg">
      <header class="pg-head"><div class="wrap">
        <p class="crumbs"><a routerLink="/">{{ t('home') }}</a> <span aria-hidden="true">/</span> {{ t('navMontage') }}</p>
        <h1>{{ t('mtH') }}</h1>
        <p class="sub">{{ t('mtSub') }}</p>
        <dl class="stats">
          @for (k of [1, 2, 3]; track k) { <div><dt>{{ t('mtFactK' + k) }}</dt><dd>{{ t('mtFactV' + k) }}</dd></div> }
        </dl>
      </div></header>

      <section class="wrap pg-body">
        <ol class="steps">
          @for (a of steps; track $index; let i = $index) {
            <li class="step">
              <div class="step-art" [innerHTML]="a"></div>
              <div class="step-t">
                <p class="step-n">{{ t('mtStep') }} {{ i + 1 }} <span>· {{ t('mtTime' + (i + 1)) }}</span></p>
                <h2>{{ t('mtS' + (i + 1)) }}</h2>
                <p>{{ t('mtD' + (i + 1)) }}</p>
                <p class="you"><strong>{{ t('mtYou') }}</strong> {{ t('mtY' + (i + 1)) }}</p>
              </div>
            </li>
          }
        </ol>
      </section>

      <section class="fnd" id="zaklady"><div class="wrap">
        <h2>{{ t('fdH') }}</h2>
        <p class="sub">{{ t('fdSub') }}</p>
        <div class="fgrid">
          @for (f of foundations; track f.k) {
            <article class="fcard">
              <div class="fart" [innerHTML]="f.art"></div>
              <h3>{{ t('fd_' + f.k) }}</h3>
              <p>{{ t('fd_' + f.k + 'D') }}</p>
              <dl>
                <dt>{{ t('fdFor') }}</dt><dd>{{ t('fd_' + f.k + 'F') }}</dd>
                <dt>{{ t('fdMind') }}</dt><dd>{{ t('fd_' + f.k + 'M') }}</dd>
              </dl>
            </article>
          }
        </div>
        <p class="fnote">{{ t('fdNote') }}</p>
      </div></section>

      <section class="wrap pg-body chk">
        <div>
          <h2>{{ t('ckH') }}</h2>
          <p class="sub">{{ t('ckSub') }}</p>
          <button type="button" class="btn btn-o" (click)="print()">{{ t('ckPrint') }}</button>
        </div>
        <ul class="ck">
          @for (k of [1, 2, 3, 4, 5, 6, 7]; track k) { <li>{{ t('ck' + k) }}</li> }
        </ul>
      </section>

    </main>`,
})
export class MontageComponent {
  private i18n = inject(I18nService);
  private dom = inject(DomSanitizer);
  readonly nav = inject(NavService);
  /* the drawings are our own constant strings, so they can be trusted */
  readonly steps: SafeHtml[] = STEP_ART.map(a => this.dom.bypassSecurityTrustHtml(a));
  readonly foundations = ['pads', 'strips', 'slab', 'screws'].map(k => ({ k, art: this.dom.bypassSecurityTrustHtml(FOUNDATION_ART[k]) }));
  t = (k: string) => this.i18n.t(k);
  constructor() { inject(SeoService).page(this.t('seoMontage'), this.t('mtSub')); }
  print() {
    const html = document.documentElement;
    html.classList.add('print-ck');
    print();
    html.classList.remove('print-ck');
  }
}
