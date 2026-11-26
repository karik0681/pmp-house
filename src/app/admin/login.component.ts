import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
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
        <label class="fld"><span>{{ t('adm_email') }}</span><input #email type="email" autocomplete="username" [readOnly]="sent()"></label>
        <label class="fld"><span>{{ t('adm_pass') }}</span><input #pass type="password" autocomplete="current-password" [readOnly]="sent()"></label>
        @if (sent()) {
          <p class="note" role="status">{{ t('adm_codeSent').replace('{e}', email.value) }}</p>
          <label class="fld"><span>{{ t('adm_code') }}</span><input #code inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="123 456"></label>
          <button type="button" class="adm-link" (click)="again(email.value, pass.value)" [disabled]="busy()">{{ t('adm_codeAgain') }}</button>
        } @else {
          <p class="note">{{ t('adm_codeHint') }}</p>
        }
        @if (error() || demo) { <p class="note" role="status" [class.warn]="error()">{{ error() ? t(error()) : t('adm_demoHint') }}</p> }
        <button class="btn btn-g" type="submit" [disabled]="busy()">{{ t(sent() ? 'adm_enter' : 'adm_sendCode') }}</button>
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
  /** step 2: the code went to the e-mail, now it is typed in */
  readonly sent = signal(false);
  private code = viewChild<ElementRef<HTMLInputElement>>('code');
  readonly demo = SETTINGS.demoCrm;
  readonly langs: { k: Lang; label: string }[] = SETTINGS.languages.map(k => ({ k, label: k === 'cs' ? 'CZ' : k.toUpperCase() }));
  t = (k: string) => this.i18n.t(k);
  async enter(e: Event, email: string, pass: string) {
    e.preventDefault();
    const code = this.code()?.nativeElement.value ?? '';
    await this.go(email, pass, this.demo ? 'x' : code);
  }
  /** a new code: the old one is replaced */
  async again(email: string, pass: string) { await this.go(email, pass, ''); }

  private async go(email: string, pass: string, code: string) {
    this.busy.set(true);
    const r: LoginResult = await this.auth.login(email, pass, code);
    this.busy.set(false);
    if (r === 'ok') { this.router.navigateByUrl('/admin'); return; }
    if (r === 'setup') { this.router.navigateByUrl('/admin/setup'); return; }
    if (r === 'sent') {
      this.sent.set(true); this.error.set('');
      setTimeout(() => this.code()?.nativeElement.focus());
      return;
    }
    if (r === 'expired') { this.sent.set(false); }
    this.error.set({ bad: 'adm_bad', code: 'adm_badCode', expired: 'adm_codeOld', mail: 'adm_mailFail', off: 'adm_off', busy: 'as_busy', error: 'adm_err' }[r]);
  }
}
