import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SETTINGS } from '../core/settings';

const KEY = 'pmp-demo-session';
export type LoginResult = 'ok' | 'setup' | 'code' | 'bad' | 'off' | 'busy' | 'error';
export interface StaffUser { user: string; name: string; role: 'owner' | 'staff'; setup: boolean }

/**
 * Staff login: own account per person, password + code from an authenticator app (worker/staff.ts).
 * The server answers with a session cookie the page cannot read. With SETTINGS.demoCrm it is the old demo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly me = signal<StaffUser | null>(SETTINGS.demoCrm ? this.readDemo() : null);
  private checked = false;
  /** kept for older code: the signed-in e-mail */
  user = () => this.me()?.user ?? null;

  async login(email: string, password: string, code = ''): Promise<LoginResult> {
    if (SETTINGS.demoCrm) {
      if (password !== 'demo' || !email.trim()) return 'bad';
      const me: StaffUser = { user: email.trim(), name: email.trim(), role: 'owner', setup: false };
      this.me.set(me);
      try { sessionStorage.setItem(KEY, email.trim()); } catch { /* blocked */ }
      return 'ok';
    }
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password, code: code.replace(/\s/g, '') }) });
      const b = await r.json().catch(() => ({}));
      this.checked = false;
      if (r.ok) { await this.check(); return b.setup ? 'setup' : 'ok'; }
      if (r.status === 401) return b.error === 'code' ? 'code' : 'bad';
      return r.status === 503 ? 'off' : r.status === 429 ? 'busy' : 'error';
    } catch { return 'error'; }
  }

  /** Asks the server who is signed in (once per page load, or after a change). */
  async check(): Promise<StaffUser | null> {
    if (SETTINGS.demoCrm || this.checked) return this.me();
    try {
      const r = await fetch('/api/session');
      this.me.set(r.ok ? await r.json() : null);
    } catch { this.me.set(null); }
    this.checked = true;
    return this.me();
  }

  /** The first-time setup is done: the session is now a full one. */
  done(me: StaffUser) { this.me.set({ ...me, setup: false }); this.checked = true; }

  async logout() {
    this.me.set(null);
    if (SETTINGS.demoCrm) { try { sessionStorage.removeItem(KEY); } catch { /* blocked */ } return; }
    try { await fetch('/api/logout', { method: 'POST' }); } catch { /* offline: the cookie still runs out */ }
  }
  /** The session has ended on the server (password change, account switched off). */
  expired() { this.me.set(null); this.checked = true; }
  private readDemo(): StaffUser | null {
    try { const u = sessionStorage.getItem(KEY); return u ? { user: u, name: u, role: 'owner', setup: false } : null; } catch { return null; }
  }
}

/** The cabinet: signed in and set up. Someone who still has to set up the app goes to /admin/setup. */
export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const me = await inject(AuthService).check();
  if (!me) return router.parseUrl('/admin/login');
  return me.setup ? router.parseUrl('/admin/setup') : true;
};

/** The setup page: only for a signed-in person who has not set up the app yet. */
export const setupGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const me = await inject(AuthService).check();
  if (!me) return router.parseUrl('/admin/login');
  return me.setup ? true : router.parseUrl('/admin');
};
