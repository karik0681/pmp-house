import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../core/seo.service';
import { I18nService } from '../core/i18n.service';
import { SETTINGS } from '../core/settings';
import { TrackingService } from '../core/tracking.service';
import { LeadsService } from '../leads/leads.service';
import { ConfiguratorService } from '../configurator/configurator.service';
import { OfficesComponent } from './offices.component';

/** /kontakt: branches on the map, company details and a short message form that lands in the staff enquiry list. */
@Component({
  selector: 'app-contact-page',
  imports: [RouterLink, OfficesComponent],
  template: `
    <main class="pg">
      <header class="pg-head"><div class="wrap">
        <p class="crumbs"><a routerLink="/">{{ t('home') }}</a> <span aria-hidden="true">/</span> {{ t('navContact') }}</p>
        <h1>{{ t('navContact') }}</h1>
        <p class="sub">{{ t('ctSub') }}</p>
      </div></header>

      <app-offices [page]="true" />

      <section class="ct"><div class="wrap ct-grid">
        <div class="ct-info">
          <h2>{{ t('ctWrite') }}</h2>
          <p class="ct-big"><a [href]="'tel:+' + s.whatsapp">{{ s.phone }}</a></p>
          <p><a [href]="'mailto:' + s.mail">{{ s.mail }}</a></p>
          <p><a class="btn btn-wa" [href]="'https://wa.me/' + s.whatsapp" target="_blank" rel="noopener">WhatsApp</a></p>
          <dl class="ct-co">
            <div><dt>{{ t('ctCo') }}</dt><dd>{{ s.company }}</dd></div>
            <div><dt>IČO</dt><dd>{{ s.ico }}</dd></div>
            <div><dt>DIČ</dt><dd>{{ s.dic }}</dd></div>
            <div><dt>{{ t('ctHours') }}</dt><dd>{{ hours() }}</dd></div>
          </dl>
        </div>

        @if (sent()) {
          <p class="ct-ok" role="status">{{ t('chat_sent') }}</p>
        } @else {
          <form class="ct-form" novalidate (submit)="send($event)">
            <h2>{{ t('ctFormH') }}</h2>
            <label class="fld"><span>{{ t('fName') }}</span><input autocomplete="name" [value]="name()" (input)="name.set($any($event.target).value)"></label>
            <div class="ct-two">
              <label class="fld"><span>{{ t('fMail') }}</span><input type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)"></label>
              <label class="fld"><span>{{ t('chat_phone') }}</span><input type="tel" autocomplete="tel" [value]="phone()" (input)="phone.set($any($event.target).value)"></label>
            </div>
            <label class="fld"><span>{{ t('ctMsg') }}</span><textarea rows="4" maxlength="5000" [value]="msg()" (input)="msg.set($any($event.target).value)"></textarea></label>
            <label class="ct-chk"><input type="checkbox" [checked]="gdpr()" (change)="gdpr.set($any($event.target).checked)"><span>{{ t('gdpr') }}</span></label>
            @if (err()) { <p class="note warn" role="alert">{{ t(err()) }}</p> }
            <button type="submit" class="btn btn-g" [disabled]="saving()">{{ t(saving() ? 'sending' : 'ctSend') }}</button>
          </form>
        }
      </div></section>
    </main>`,
})
export class ContactPageComponent {
  private i18n = inject(I18nService);
  private leads = inject(LeadsService);
  private cfg = inject(ConfiguratorService);
  private tr = inject(TrackingService);
  readonly s = SETTINGS;
  readonly name = signal(''); readonly email = signal(''); readonly phone = signal(''); readonly msg = signal('');
  readonly gdpr = signal(false); readonly saving = signal(false); readonly sent = signal(false); readonly err = signal('');
  t = (k: string) => this.i18n.t(k);
  hours = () => this.s.hours[this.i18n.lang()];
  constructor() { inject(SeoService).page(this.t('seoContact'), this.t('ctMeta'), { path: '/kontakt' }); }

  async send(e: Event) {
    e.preventDefault();
    if (this.saving()) return;
    const name = this.name().trim(), email = this.email().trim(), phone = this.phone().trim(), msg = this.msg().trim();
    if (!name || !/.+@.+\..+/.test(email) || !msg || !this.gdpr()) { this.err.set('ctErr'); return; }
    this.err.set(''); this.saving.set(true);
    const id = await this.leads.add({ name, phone, email, place: '', clientNote: msg, cfg: this.cfg.cfg(), price: null, source: this.t('ctSource') }, this.t('ctLeadNote'), this.t('adm_firstStep'));
    this.saving.set(false);
    if (!id) { this.err.set('chat_saveFail'); return; }
    this.tr.goal('lead');
    this.sent.set(true);
  }
}
