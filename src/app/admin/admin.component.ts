import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SETTINGS } from '../core/settings';
import { I18nService } from '../core/i18n.service';
import { money } from '../core/format';
import { Lang } from '../core/i18n';
import { AuthService } from './auth.service';
import { LeadsService } from '../leads/leads.service';
import { Lead, STATUSES } from '../leads/lead';
import { encode, summaryLines, title } from '../configurator/model';

@Component({
  selector: 'app-admin',
  imports: [RouterLink],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  readonly i18n = inject(I18nService);
  readonly leads = inject(LeadsService);
  readonly auth = inject(AuthService);
  private router = inject(Router);

  readonly statuses = STATUSES;
  readonly langs: { k: Lang; label: string }[] = SETTINGS.languages.map(k => ({ k, label: k === 'cs' ? 'CZ' : k.toUpperCase() }));
  readonly query = signal('');
  readonly picked = signal<string | null>(null);
  readonly draft = signal('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.leads.leads().filter(l => `${l.id} ${l.name} ${l.phone} ${l.place}`.toLowerCase().includes(q)) : this.leads.leads();
  });
  readonly columns = computed(() => STATUSES.map(s => ({ s, items: this.filtered().filter(l => l.status === s) })));
  readonly lead = computed(() => this.leads.leads().find(l => l.id === this.picked()) ?? null);
  readonly lines = computed(() => { const l = this.lead(); return l ? summaryLines(l.cfg, k => this.t(k)) : []; });
  readonly hasDemo = computed(() => this.leads.leads().some(l => l.demo));

  t = (k: string) => this.i18n.t(k);
  money = money;
  title(l: Lead) { return title(l.cfg, k => this.t(k)); }
  late(l: Lead) { return l.status < 4 && !!l.due && l.due < this.leads.today; }
  when(iso: string) {
    return new Intl.DateTimeFormat(this.i18n.lang() === 'de' ? 'de-DE' : 'cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }
  digits(p: string) { return p.replace(/[^\d+]/g, ''); }
  wa(p: string) { return 'https://wa.me/' + p.replace(/\D/g, ''); }

  setStatus(l: Lead, s: number) {
    if (l.status === s) return;
    this.leads.update(l.id, { status: s });
    this.leads.addNote(l.id, this.t('adm_statusNote').replace('{s}', this.t('st' + s)));
  }
  addNote(l: Lead) { const text = this.draft().trim(); if (!text) return; this.leads.addNote(l.id, text); this.draft.set(''); }
  open3d(l: Lead) { this.router.navigate(['/'], { queryParams: { c: encode(l.cfg) } }); }
  logout() { this.auth.logout(); this.router.navigateByUrl('/admin/login'); }
}
