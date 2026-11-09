import { Injectable, inject } from '@angular/core';
import { SETTINGS } from '../core/settings';
import { I18nService } from '../core/i18n.service';
import { SourceService } from '../core/source.service';
import { Cfg, linkTo, priceOf, summaryLines, title, priceText } from '../configurator/model';
import { LeadsService } from './leads.service';

export interface Contact { name: string; phone: string; email: string; place: string; note: string }
export type Result = 'sent' | 'sentDemo' | 'mailto' | 'failed';

/** Sends a finished configuration: e-mail through the form service, and into the demo CRM. */
@Injectable({ providedIn: 'root' })
export class EnquiryService {
  private i18n = inject(I18nService);
  private source = inject(SourceService);
  private leads = inject(LeadsService);

  message(c: Cfg, f: Contact): string {
    const t = (k: string) => this.i18n.t(k);
    return [t('mailSubject'), '', ...summaryLines(c, t).map(x => '- ' + x), '', priceText(priceOf(c), t), '',
      `${t('place')}: ${f.place}`, `${t('note')}: ${f.note}`, '', `${t('fName')}: ${f.name}`, `${t('fPhone')}: ${f.phone}`, `${t('fMail')}: ${f.email}`,
      `${t('adm_source')}: ${this.source.label}`, '', linkTo(c)].join('\n');
  }

  async send(c: Cfg, f: Contact): Promise<Result> {
    const t = (k: string) => this.i18n.t(k);
    if (SETTINGS.demoCrm) {
      this.leads.add({ name: f.name, phone: f.phone, email: f.email, place: f.place, clientNote: f.note, cfg: c, price: priceOf(c), source: this.source.label }, t('adm_newLead'), t('adm_firstStep'));
    }
    if (!SETTINGS.formKey) {
      if (SETTINGS.demoCrm) return 'sentDemo';
      this.mailto(c, f); return 'mailto';
    }
    try {
      const r = await fetch(SETTINGS.formEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: SETTINGS.formKey, subject: `${t('mailSubject')}: ${title(c, t)}`, from_name: f.name, name: f.name,
          email: f.email, replyto: f.email, phone: f.phone, message: this.message(c, f) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.success === false) throw new Error(String(j.message || r.status));
      return SETTINGS.demoCrm ? 'sentDemo' : 'sent';
    } catch {
      this.mailto(c, f); return 'failed';
    }
  }

  whatsapp(c: Cfg, f: Contact) {
    window.open(`https://wa.me/${SETTINGS.whatsapp}?text=${encodeURIComponent(this.message(c, f))}`, '_blank', 'noopener');
  }

  private mailto(c: Cfg, f: Contact) {
    const t = (k: string) => this.i18n.t(k);
    location.href = `mailto:${SETTINGS.mail}?subject=${encodeURIComponent(`${t('mailSubject')}: ${title(c, t)}`)}&body=${encodeURIComponent(this.message(c, f))}`;
  }
}
