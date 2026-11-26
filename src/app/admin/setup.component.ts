import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { AuthService } from './auth.service';

/** First login of a person (or after the owner gave a new start password): an own password instead of the start one. */
@Component({
  selector: 'app-setup',
  template: `
    <div class="adm-login">
      <form class="adm-login-card setup" novalidate (submit)="finish($event, p1.value, p2.value)">
        <p class="adm-brand">PMP House</p>
        <h1>{{ t('su_h') }}</h1>
        <p class="note">{{ t('su_sub') }}</p>
        <label class="fld"><span>{{ t('su_new') }}</span><input #p1 type="password" autocomplete="new-password" minlength="10"></label>
        <label class="fld"><span>{{ t('su_again') }}</span><input #p2 type="password" autocomplete="new-password" minlength="10"></label>
        @if (error()) { <p class="note warn" role="alert">{{ t(error()) }}</p> }
        <button class="btn btn-g" type="submit" [disabled]="busy()">{{ t('su_done') }}</button>
      </form>
    </div>`,
})
export class SetupComponent {
  private i18n = inject(I18nService);
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly error = signal('');
  readonly busy = signal(false);
  t = (k: string) => this.i18n.t(k);

  async finish(e: Event, p1: string, p2: string) {
    e.preventDefault();
    if (p1.length < 10) { this.error.set('su_short'); return; }
    if (p1 !== p2) { this.error.set('su_diff'); return; }
    this.busy.set(true);
    try {
      const r = await fetch('/api/setup/finish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: p1 }) });
      const b = await r.json().catch(() => ({}));
      if (r.ok) { this.auth.done({ user: b.user, name: b.name, role: b.role, setup: false }); this.router.navigateByUrl('/admin'); return; }
      if (r.status === 401) { this.router.navigateByUrl('/admin/login'); return; }
      this.error.set({ short: 'su_short', reuse: 'su_reuse', busy: 'as_busy' }[b.error as string] || 'adm_err');
    } catch { this.error.set('adm_err'); }
    finally { this.busy.set(false); }
  }
}
