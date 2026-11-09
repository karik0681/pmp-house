import { Component, ElementRef, OnDestroy, afterNextRender, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { goTo, scrollToId } from '../core/scroll';
import { HeroComponent } from './hero.component';
import { TypesComponent } from './types.component';
import { ExplodedComponent } from './exploded.component';
import { NavService } from './nav.service';
import { ConfiguratorComponent } from '../configurator/configurator.component';
import { ConfiguratorService } from '../configurator/configurator.service';
import { decode } from '../configurator/model';
import { RefCardComponent } from '../references/ref-card.component';
import { REFERENCES } from '../references/refs.data';

/** The home page. Header, footer and the WhatsApp button come from LayoutComponent. */
@Component({
  selector: 'app-site',
  imports: [RouterLink, HeroComponent, TypesComponent, ExplodedComponent, ConfiguratorComponent, RefCardComponent],
  template: `
    <a class="skip" href="#konfigurator" (click)="go($event, 'konfigurator')">{{ t('skip') }}</a>
    <main id="top">
      <app-hero />
      <app-types />
      <app-exploded />
      <app-configurator />

      <section class="home-refs" id="reference"><div class="wrap">
        <div class="sec-head">
          <div><h2>{{ t('refH') }}</h2><p class="sub">{{ t('homeRefSub') }}</p></div>
          <a class="btn btn-o" routerLink="/reference">{{ t('refAll') }} →</a>
        </div>
        <div class="rgrid">
          @for (r of latest; track r.slug) { <app-ref-card [ref]="r" /> }
        </div>
      </div></section>

      <section class="home-mt"><div class="wrap">
        <div class="sec-head">
          <div><h2>{{ t('mtH') }}</h2><p class="sub">{{ t('homeMtSub') }}</p></div>
          <a class="btn btn-o" routerLink="/montaz">{{ t('homeMtBtn') }} →</a>
        </div>
        <ol class="mini-steps">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <li><span>{{ i }}</span><b>{{ t('mtS' + i) }}</b><small>{{ t('mtTime' + i) }}</small></li>
          }
        </ol>
      </div></section>

      <section class="rev"><div class="wrap"><h2>{{ t('revH') }}</h2><div class="revs">
        <blockquote>Vše bez problémů, doprava přesně na čas, včetně složení za pár minut.<cite>Filip G.</cite></blockquote>
        <blockquote>Velice rychlé dodání, do 14 dnů kontejner hotový.<cite>Aneta N.</cite></blockquote>
        <blockquote>Objednání a dovoz kontejneru proběhl v pořádku a v termínu.<cite>Robert H.</cite></blockquote>
      </div></div></section>

      <section class="faq" id="otazky"><div class="wrap duo"><h2>{{ t('faqH') }}</h2><div>
        @for (i of [1, 2, 3, 4, 5, 6]; track i) { <details><summary>{{ t('q' + i) }}</summary><p>{{ t('a' + i) }}</p></details> }
      </div></div></section>
    </main>`,
})
export class SiteComponent implements OnDestroy {
  private i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private cfg = inject(ConfiguratorService);
  private nav = inject(NavService);
  private host = inject(ElementRef<HTMLElement>);
  private io?: IntersectionObserver;
  /* the three newest projects */
  readonly latest = [...REFERENCES].sort((a, b) => b.year - a.year).slice(0, 3);
  t = (k: string) => this.i18n.t(k);
  go = goTo;

  constructor() {
    /* a link with ?c=… (from an e-mail, the CRM or a reference) opens that exact configuration */
    const c = this.route.snapshot.queryParamMap.get('c');
    const loaded = c ? decode(c) : null;
    if (loaded) { this.cfg.load(loaded); this.cfg.go(0); }
    /* coming from another page via a menu item: scroll to that section */
    const target: string | undefined = inject(Router).currentNavigation()?.extras.state?.['scroll'] ?? history.state?.scroll;
    afterNextRender(() => {
      if (loaded) setTimeout(() => scrollToId('konfigurator'), 300);
      else if (target) setTimeout(() => scrollToId(target), 60);
      /* the floating WhatsApp button steps aside where the configurator has its own */
      const cfgEl = this.host.nativeElement.querySelector('#konfigurator');
      if (cfgEl) {
        this.io = new IntersectionObserver(es => this.nav.wafHidden.set(es[0].isIntersecting && innerWidth < 961), { threshold: .05 });
        this.io.observe(cfgEl);
      }
    });
  }
  ngOnDestroy() { this.io?.disconnect(); this.nav.wafHidden.set(false); }
}
