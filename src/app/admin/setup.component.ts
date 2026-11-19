import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import qrcode from 'qrcode-generator';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { I18nService } from '../core/i18n.service';
import { AuthService } from './auth.service';

/** First login of a person: an own password, then the authenticator app via a QR code, then the first code. */
@Component({
  selector: 'app-setup',
  template: `
    <div class="adm-login">
      <form class="adm-login-card setup" novalidate (submit)="finish($event, p1.value, p2.value, code.value)">
        <p class="adm-brand">PMP House</p>
        <h1>{{ t('su_h') }}</h1>
        <p class="note">{{ t('su_sub') }}</p>

        <h2><span class="story-n">1</span> {{ t('su_pass') }}</h2>
        <label class="fld"><span>{{ t('su_new') }}</span><input #p1 type="password" autocomplete="new-password" minlength="10"></label>
        <label class="fld"><span>{{ t('su_again') }}</span><input #p2 type="password" autocomplete="new-password" minlength="10"></label>

        <h2><span class="story-n">2</span> {{ t('su_app') }}</h2>
        <p class="note">{{ t('su_appHint') }}</p>
        @if (qr(); as q) {
          <div class="su-qr" [innerHTML]="q"></div>
          <p class="note">{{ t('su_manual') }} <code class="su-key">{{ key() }}</code></p>
        } @else { <p class="note">{{ t('su_loading') }}</p> }

        <h2><span class="story-n">3</span> {{ t('su_code') }}</h2>
        <label class="fld"><span>{{ t('adm_code') }}</span><input #code inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="123 456"></label>

        @if (error()) { <p class="note warn" role="alert">{{ t(error()) }}</p> }
        <button class="btn btn-g" type="submit" [disabled]="busy() || !qr()">{{ t('su_done') }}</button>
      </form>
    </div>`,
})
export class SetupComponent {
  private i18n = inject(I18nService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private dom = inject(DomSanitizer);
  readonly qr = signal<SafeHtml | null>(null);
  readonly key = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  t = (k: string) => this.i18n.t(k);

  constructor() { this.start(); }

  private async start() {
    try {
      const r = await fetch('/api/setup/start', { method: 'POST' });
      if (!r.ok) { this.router.navigateByUrl('/admin/login'); return; }
      const { secret, uri } = await r.json();
      const q = qrcode(0, 'M'); q.addData(uri); q.make();
      this.qr.set(this.dom.bypassSecurityTrustHtml(q.createSvgTag({ cellSize: 5, margin: 2, scalable: true })));
      this.key.set(secret.replace(/(.{4})/g, '$1 ').trim());
    } catch { this.error.set('adm_err'); }
  }

  async finish(e: Event, p1: string, p2: string, code: string) {
    e.preventDefault();
    if (p1.length < 10) { this.error.set('su_short'); return; }
    if (p1 !== p2) { this.error.set('su_diff'); return; }
    this.busy.set(true);
    try {
      const r = await fetch('/api/setup/finish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: p1, code: code.replace(/\s/g, '') }) });
      const b = await r.json().catch(() => ({}));
      if (r.ok) { this.auth.done({ user: b.user, name: b.name, role: b.role, setup: false }); this.router.navigateByUrl('/admin'); return; }
      this.error.set({ code: 'adm_badCode', short: 'su_short', reuse: 'su_reuse', busy: 'as_busy' }[b.error as string] || 'adm_err');
    } catch { this.error.set('adm_err'); }
    finally { this.busy.set(false); }
  }
}
