import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { scrollToId } from '../core/scroll';
import { ConfiguratorService } from '../configurator/configurator.service';
import { Kind, encode, fresh, repair } from '../configurator/model';

/** Navigation shared by the header, the mobile menu and the footer. */
@Injectable({ providedIn: 'root' })
export class NavService {
  private router = inject(Router);
  private cfg = inject(ConfiguratorService);
  readonly menuOpen = signal(false);
  /** The floating WhatsApp button hides while the configurator (with its own button) fills the phone screen. */
  readonly wafHidden = signal(false);

  private onHome() { return this.router.url.split('?')[0] === '/'; }

  /** Scrolls to a section on this page; if the section lives on the home page, goes there first. */
  section(id: string, e?: Event) {
    e?.preventDefault();
    this.menuOpen.set(false);
    if (document.getElementById(id)) scrollToId(id);
    else this.router.navigate(['/'], { state: { scroll: id } });
  }

  /** Opens the configurator with a ready model, e.g. from the footer or a reference. */
  model(m: { type: Kind; L: number; W: number; count?: number }, e?: Event) {
    e?.preventDefault();
    this.menuOpen.set(false);
    const c = fresh(m.type, m.L, m.W);
    c.count = m.count ?? 1;
    repair(c);
    if (this.onHome()) { this.cfg.load(c); this.cfg.go(0); scrollToId('konfigurator'); }
    else this.router.navigate(['/'], { queryParams: { c: encode(c) } });
  }
}
