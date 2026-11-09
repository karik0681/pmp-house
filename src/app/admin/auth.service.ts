import { Injectable, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

const KEY = 'pmp-demo-session';

/**
 * DEMO ONLY. Accepts the password "demo" and remembers the session in this tab.
 * The real version checks the password on the server and gets a token back; nothing here is secure.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<string | null>(this.read());

  login(email: string, password: string): boolean {
    if (password !== 'demo' || !email.trim()) return false;
    this.user.set(email.trim());
    try { sessionStorage.setItem(KEY, email.trim()); } catch { /* blocked */ }
    return true;
  }
  logout() { this.user.set(null); try { sessionStorage.removeItem(KEY); } catch { /* blocked */ } }
  private read() { try { return sessionStorage.getItem(KEY); } catch { return null; } }
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user() ? true : inject(Router).parseUrl('/admin/login');
};
