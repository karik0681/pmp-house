import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SETTINGS } from '../core/settings';

const KEY = 'pmp-demo-session';
export type LoginResult = 'ok' | 'bad' | 'off' | 'busy' | 'error';

/**
 * Staff login. The password is checked on the server, which answers with a session cookie the page cannot read.
 * With SETTINGS.demoCrm it is the old demo: any e-mail and the password "demo", nothing secure.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<string | null>(SETTINGS.demoCrm ? this.read() : null);
  private checked = false;

  async login(email: string, password: string): Promise<LoginResult> {
    if (SETTINGS.demoCrm) {
      if (password !== 'demo' || !email.trim()) return 'bad';
      this.user.set(email.trim());
      try { sessionStorage.setItem(KEY, email.trim()); } catch { /* blocked */ }
      return 'ok';
    }
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
      if (r.ok) { this.user.set((await r.json()).user); this.checked = true; return 'ok'; }
      return r.status === 401 ? 'bad' : r.status === 503 ? 'off' : r.status === 429 ? 'busy' : 'error';
    } catch { return 'error'; }
  }

  /** Asks the server whether the session cookie is still valid (once per page load). */
  async check(): Promise<boolean> {
    if (SETTINGS.demoCrm || this.checked) return !!this.user();
    try {
      const r = await fetch('/api/session');
      this.user.set(r.ok ? (await r.json()).user : null);
    } catch { this.user.set(null); }
    this.checked = true;
    return !!this.user();
  }

  async logout() {
    this.user.set(null);
    if (SETTINGS.demoCrm) { try { sessionStorage.removeItem(KEY); } catch { /* blocked */ } return; }
    try { await fetch('/api/logout', { method: 'POST' }); } catch { /* offline: the cookie still runs out */ }
  }
  /** The session has ended on the server (for example after a password change). */
  expired() { this.user.set(null); this.checked = true; }
  private read() { try { return sessionStorage.getItem(KEY); } catch { return null; } }
}

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  return (await inject(AuthService).check()) ? true : router.parseUrl('/admin/login');
};
