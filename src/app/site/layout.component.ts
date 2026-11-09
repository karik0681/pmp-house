import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { I18nService } from '../core/i18n.service';
import { SETTINGS } from '../core/settings';
import { HeaderComponent } from './header.component';
import { FooterComponent } from './footer.component';
import { NavService } from './nav.service';

/** Frame of every public page: header, page content, footer and the floating WhatsApp button. */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <app-header />
    <router-outlet />
    <app-footer />
    <a class="waf" [hidden]="nav.wafHidden() || overCta()" [href]="waLink()" target="_blank" rel="noopener">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M4 20l1.3-3.9A8 8 0 1 1 8 18.9z"/></svg>
      <span>{{ i18n.t('waFloat') }}</span>
    </a>`,
})
export class LayoutComponent {
  readonly i18n = inject(I18nService);
  readonly nav = inject(NavService);
  /** true while the footer or a page's own call-to-action box sits under the floating button */
  readonly overCta = signal(false);
  readonly waLink = computed(() => `https://wa.me/${SETTINGS.whatsapp}?text=${encodeURIComponent(this.i18n.t('waHello'))}`);

  constructor() {
    /* a new page starts at the top (instantly, not with the smooth in-page scrolling) */
    const router = inject(Router);
    const sub = router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.nav.menuOpen.set(false);
      const keep = router.currentNavigation()?.extras.state?.['scroll'] || router.url.includes('c=');
      if (!keep) scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(onScroll, 100);
    });
    let queued = false;
    const check = () => {
      queued = false;
      const zoneTop = innerHeight - 100;
      this.overCta.set([...document.querySelectorAll(innerWidth < 861 ? '.ft, .rd-cta, .xpl' : '.ft, .rd-cta')].some(el => {
        const r = el.getBoundingClientRect();
        return r.top < innerHeight && r.bottom > zoneTop;
      }));
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    inject(DestroyRef).onDestroy(() => { sub.unsubscribe(); removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); });
  }
}
