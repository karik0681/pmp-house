import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../core/i18n.service';

interface Person { email: string; name: string; role: 'owner' | 'staff'; active: boolean; ready: boolean; created_at: string }

/** For the owner: add staff, switch an account off, reset the app after a lost phone. */
@Component({
  selector: 'app-staff',
  template: `
    <section class="staff">
      <h2>{{ t('st_h') }}</h2>
      <p class="note">{{ t('st_sub') }}</p>
      <table class="st-table">
        <thead><tr><th>{{ t('st_name') }}</th><th>{{ t('adm_email') }}</th><th>{{ t('st_state') }}</th><th></th></tr></thead>
        <tbody>
          @for (p of people(); track p.email) {
            <tr [class.off]="!p.active">
              <td>{{ p.name }} @if (p.role === 'owner') { <small>({{ t('st_owner') }})</small> }</td>
              <td>{{ p.email }}</td>
              <td>{{ t(!p.active ? 'st_off' : p.ready ? 'st_ready' : 'st_wait') }}</td>
              <td class="st-act">
                @if (p.role !== 'owner') {
                  <button type="button" class="adm-link" (click)="toggle(p)">{{ t(p.active ? 'st_disable' : 'st_enable') }}</button>
                  <button type="button" class="adm-link" (click)="reset(p)">{{ t('st_reset') }}</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>

      <form class="st-add" novalidate (submit)="add($event, nm.value, em.value)">
        <h3>{{ t('st_add') }}</h3>
        <label class="fld"><span>{{ t('st_name') }}</span><input #nm autocomplete="off"></label>
        <label class="fld"><span>{{ t('adm_email') }}</span><input #em type="email" autocomplete="off"></label>
        <button class="btn btn-g" type="submit" [disabled]="busy()">{{ t('st_addBtn') }}</button>
      </form>

      @if (issued(); as i) {
        <div class="st-issued" role="status">
          <p>{{ t('st_issued') }}</p>
          <p><strong>{{ i.email }}</strong> · {{ t('st_temp') }} <code>{{ i.password }}</code></p>
          <p class="note">{{ t('st_issuedHint') }}</p>
        </div>
      }
      @if (error()) { <p class="note warn" role="alert">{{ t(error()) }}</p> }
    </section>`,
})
export class StaffComponent {
  private i18n = inject(I18nService);
  readonly people = signal<Person[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  /** the start password of a new or reset account, shown once to pass on in person */
  readonly issued = signal<{ email: string; password: string } | null>(null);
  t = (k: string) => this.i18n.t(k);

  constructor() { this.call('GET'); }

  /** 14 characters from an alphabet without look-alikes (no 0/O, 1/l) */
  private temp() {
    const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return [...crypto.getRandomValues(new Uint8Array(14))].map(b => a[b % a.length]).join('');
  }

  async add(e: Event, name: string, email: string) {
    e.preventDefault();
    const password = this.temp();
    if (await this.call('POST', '', { name, email, password })) { this.issued.set({ email: email.trim().toLowerCase(), password }); (e.target as HTMLFormElement).reset(); }
  }
  toggle(p: Person) { this.issued.set(null); this.call('PATCH', p.email, { active: !p.active }); }
  async reset(p: Person) {
    if (!confirm(this.t('st_resetAsk').replace('{n}', p.name))) return;
    const password = this.temp();
    if (await this.call('PATCH', p.email, { resetApp: true, password })) this.issued.set({ email: p.email, password });
  }

  private async call(method: string, email = '', body?: unknown): Promise<boolean> {
    this.busy.set(true); this.error.set('');
    try {
      const r = await fetch('/api/staff' + (email ? '/' + encodeURIComponent(email) : ''), {
        method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
      });
      const b = await r.json().catch(() => null);
      if (!r.ok) { this.error.set(b?.error === 'exists' ? 'st_exists' : b?.error === 'input' ? 'st_input' : 'adm_err'); return false; }
      this.people.set(b);
      return true;
    } catch { this.error.set('adm_err'); return false; }
    finally { this.busy.set(false); }
  }
}
