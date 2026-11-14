import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { SETTINGS } from '../core/settings';
import { ConfiguratorService } from '../configurator/configurator.service';
import { LeadsService } from '../leads/leads.service';

interface Msg { role: 'user' | 'assistant'; content: string }

/**
 * The chat window of the website. A visitor asks, the assistant answers from the company's fact sheet (/api/chat).
 * When a person is needed, the visitor leaves a contact and the whole conversation becomes an enquiry in the cabinet.
 */
@Component({
  selector: 'app-chat-widget',
  imports: [RouterLink],
  template: `
    @if (!open()) {
      <button type="button" class="chat-open" (click)="show()">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M4 5h16v11H9l-5 4z"/></svg>
        <span>{{ t('chat_open') }}</span>
      </button>
    } @else {
      <section class="chat" role="dialog" [attr.aria-label]="t('chat_title')">
        <header><div><b>{{ t('chat_title') }}</b><span>{{ t('chat_sub') }}</span></div>
          <button type="button" [attr.aria-label]="t('chat_close')" (click)="open.set(false)">×</button></header>
        <div class="chat-log" #log aria-live="polite">
          <p class="chat-m is-a">{{ t('chat_hello') }}</p>
          @for (m of msgs(); track $index) { <p class="chat-m" [class.is-a]="m.role === 'assistant'" [class.is-u]="m.role === 'user'">{{ m.content }}</p> }
          @if (busy()) { <p class="chat-m is-a is-wait">{{ t('chat_wait') }}</p> }
          @if (error()) { <p class="chat-m is-a">{{ t(error()) }}</p> }
          @if (sent()) {
            <p class="chat-m is-a">{{ t('chat_sent') }}</p>
            @if (demo) { <p class="chat-demo">{{ t('chat_demo') }} <a routerLink="/admin">{{ t('openAdmin') }}</a></p> }
          }
        </div>
        @if (form() && !sent()) {
          <form class="chat-form" novalidate (submit)="leave($event)">
            <b>{{ t('chat_formH') }}</b>
            <input [placeholder]="t('fName')" [attr.aria-label]="t('fName')" autocomplete="name" [value]="name()" (input)="name.set($any($event.target).value)">
            <input type="email" [placeholder]="t('fMail')" [attr.aria-label]="t('fMail')" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)">
            <input type="tel" [placeholder]="t('chat_phone')" [attr.aria-label]="t('chat_phone')" autocomplete="tel" [value]="phone()" (input)="phone.set($any($event.target).value)">
            <label class="chk"><input type="checkbox" [checked]="gdpr()" (change)="gdpr.set($any($event.target).checked)"><span>{{ t('gdpr') }}</span></label>
            @if (formErr()) { <p class="note warn">{{ t('chat_formErr') }}</p> }
            <div class="chat-form-b"><button type="submit" class="btn btn-g">{{ t('chat_formSend') }}</button><button type="button" class="btn btn-o" (click)="form.set(false)">{{ t('chat_back') }}</button></div>
          </form>
        } @else {
          <form class="chat-in" (submit)="send($event)">
            <input #box [placeholder]="t('chat_ph')" [attr.aria-label]="t('chat_ph')" maxlength="1000" [value]="draft()" (input)="draft.set($any($event.target).value)">
            <button type="submit" class="btn btn-g" [disabled]="busy() || draft().trim().length < 2">{{ t('chat_send') }}</button>
          </form>
          @if (!sent()) { <button type="button" class="chat-leave" (click)="form.set(true)">{{ t('chat_leave') }}</button> }
        }
      </section>
    }`,
})
export class ChatWidgetComponent {
  private i18n = inject(I18nService);
  private leads = inject(LeadsService);
  private cfg = inject(ConfiguratorService);
  private log = viewChild<ElementRef<HTMLElement>>('log');
  private box = viewChild<ElementRef<HTMLInputElement>>('box');
  readonly demo = SETTINGS.demoCrm;

  readonly open = signal(false);
  readonly msgs = signal<Msg[]>([]);
  readonly draft = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  /* the contact form: shown when the assistant hands over or the visitor asks for it */
  readonly form = signal(false);
  readonly sent = signal(false);
  readonly formErr = signal(false);
  readonly name = signal(''); readonly email = signal(''); readonly phone = signal(''); readonly gdpr = signal(false);

  t = (k: string) => this.i18n.t(k);
  show() { this.open.set(true); setTimeout(() => this.box()?.nativeElement.focus(), 50); }
  private down() { setTimeout(() => { const el = this.log()?.nativeElement; if (el) el.scrollTop = el.scrollHeight; }, 30); }

  async send(e: Event) {
    e.preventDefault();
    const text = this.draft().trim();
    if (text.length < 2 || this.busy()) return;
    this.msgs.update(m => [...m, { role: 'user', content: text }]);
    this.draft.set(''); this.error.set(''); this.busy.set(true); this.down();
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: this.msgs() }) });
      if (!r.ok) throw new Error(String(r.status));
      const a: { reply: string; handover: boolean } = await r.json();
      if (a.reply) this.msgs.update(m => [...m, { role: 'assistant', content: a.reply }]);
      if (a.handover && !this.sent()) this.form.set(true);
    } catch (err) { this.error.set(String(err).includes('429') ? 'as_busy' : 'chat_fail'); }
    this.busy.set(false); this.down();
  }

  /** Saves the conversation with the visitor's contact as an enquiry for the staff. */
  leave(e: Event) {
    e.preventDefault();
    const name = this.name().trim(), email = this.email().trim(), phone = this.phone().trim();
    if (!name || !/.+@.+\..+/.test(email) || !this.gdpr()) { this.formErr.set(true); return; }
    const talk = this.msgs().map(m => `${this.t(m.role === 'user' ? 'chat_who_u' : 'chat_who_a')}: ${m.content}`).join('\n');
    this.leads.add({ name, phone, email, place: '', clientNote: talk || this.t('chat_noTalk'), cfg: this.cfg.cfg(), price: null, source: this.t('chat_source') }, this.t('chat_leadNote'), this.t('adm_firstStep'));
    this.formErr.set(false); this.form.set(false); this.sent.set(true); this.down();
  }
}
