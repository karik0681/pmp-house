import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SETTINGS } from '../core/settings';
import { I18nService } from '../core/i18n.service';
import { AuthService, LoginResult } from './auth.service';
import { Lang } from '../core/i18n';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <div class="adm-login">
      <form class="adm-login-card" novalidate (submit)="enter($event, email.value, pass.value)">
        <p class="adm-brand">PMP House</p>
        <h1>{{ t('adm_login') }}</h1>
        <label class="fld"><span>{{ t('adm_email') }}</span><input #email type="email" autocomplete="username"></label>
        <label class="fld"><span>{{ t('adm_pass') }}</span><input #pass type="password" autocomplete="current-password"></label>
        @if (error() || demo) { <p class="note" role="status" [class.warn]="error()">{{ error() ? t(error()) : t('adm_demoHint') }}</p> }
        <button class="btn btn-g" type="submit" [disabled]="busy()">{{ t('adm_enter') }}</button>
        <div class="adm-login-foot">
          <a routerLink="/">{{ t('adm_web') }}</a>
          @if (langs.length > 1) {<span class="langs">
            @for (l of langs; track l.k) { <button type="button" [attr.aria-pressed]="i18n.lang() === l.k" (click)="i18n.lang.set(l.k)">{{ l.label }}</button> }
          </span>}
        </div>
      </form>
    </div>`,
})
export class LoginComponent {
  readonly i18n = inject(I18nService);
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly demo = SETTINGS.demoCrm;
  readonly langs: { k: Lang; label: string }[] = SETTINGS.languages.map(k => ({ k, label: k === 'cs' ? 'CZ' : k.toUpperCase() }));
  t = (k: string) => this.i18n.t(k);
  async enter(e: Event, email: string, pass: string) {
    e.preventDefault();
    this.busy.set(true);
    const r: LoginResult = await this.auth.login(email, pass);
    this.busy.set(false);
    if (r === 'ok') { this.router.navigateByUrl('/admin'); return; }
    this.error.set({ bad: 'adm_bad', off: 'adm_off', busy: 'as_busy', error: 'adm_err' }[r]);
  }
}
