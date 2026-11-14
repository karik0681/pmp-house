import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../core/i18n.service';

interface Answer { offtopic?: boolean; handover: boolean; reason: string; reply: string }

/**
 * Demo of the e-mail assistant: write a message as a customer and see what the assistant would send back.
 * Nothing is really e-mailed. The text goes to /api/assistant, where an AI model answers from the company's fact sheet.
 */
@Component({
  selector: 'app-assistant-demo',
  template: `
    <section class="as">
      <h2>{{ t('as_title') }}</h2>
      <p class="note">{{ t('as_hint') }}</p>
      <div class="as-grid">
        <form class="as-box" (submit)="send($event)">
          <h3>{{ t('as_in') }}</h3>
          <div class="as-ex">
            @for (e of examples; track e.k) { <button type="button" (click)="use(e)">{{ t(e.k) }}</button> }
          </div>
          <label class="fld"><span>{{ t('as_subject') }}</span><input [value]="subject()" (input)="subject.set($any($event.target).value)" maxlength="200"></label>
          <label class="fld"><span>{{ t('as_body') }}</span><textarea rows="9" maxlength="3000" [value]="body()" (input)="body.set($any($event.target).value)"></textarea></label>
          <button class="btn btn-g" type="submit" [disabled]="busy() || body().trim().length < 3">{{ t(busy() ? 'as_wait' : 'as_send') }}</button>
        </form>
        <div class="as-box" aria-live="polite">
          <h3>{{ t('as_out') }}</h3>
          @if (error()) { <p class="note warn">{{ t(error()) }}</p> }
          @if (answer(); as a) {
            <p class="as-badge" [class.is-hand]="a.handover" [class.is-off]="a.offtopic">{{ t(a.offtopic ? 'as_off' : a.handover ? 'as_hand' : 'as_auto') }}</p>
            <p class="as-reason">{{ a.reason }}</p>
            @if (a.reply) { <pre class="as-mail">{{ a.reply }}</pre> }
          } @else if (!error()) { <p class="note">{{ t(busy() ? 'as_wait' : 'as_empty') }}</p> }
        </div>
      </div>
    </section>`,
})
export class AssistantDemoComponent {
  private i18n = inject(I18nService);
  readonly subject = signal('');
  readonly body = signal('');
  readonly busy = signal(false);
  readonly answer = signal<Answer | null>(null);
  readonly error = signal('');

  /** ready-made customer messages: a simple question, one that needs a person, one off the topic and one in German */
  readonly examples = [
    { k: 'as_ex1', subject: 'Dotaz na kontejner 3 × 6 m', body: 'Dobrý den,\nzajímá mě kontejner 3 × 6 m jako zahradní kancelář. Jaký je rozdíl mezi Standard a Premium a kolik stojí? Za jak dlouho ho dodáte?\nDěkuji, Novák' },
    { k: 'as_ex2', subject: 'Poptávka: dva kontejnery s dopravou do Brna', body: 'Dobrý den,\npotřebuji dva kontejnery 3 × 9 m spojené vedle sebe, s kuchyňkou a sprchou, dopravou do Brna a montáží. Jaká bude konečná cena a dáte mi slevu při platbě předem?\nS pozdravem, Dvořáková' },
    { k: 'as_ex4', subject: 'Dotaz', body: 'Dobrý den, poradíte mi dobrý recept na svíčkovou a jaké bude zítra počasí v Praze?' },
    { k: 'as_ex3', subject: 'Anfrage Bürocontainer', body: 'Guten Tag,\nliefern Sie auch nach Tschechien an die Grenze bei Děčín? Welche Wandstärken und Dämmung bieten Sie an und in welchen Farben?\nMit freundlichen Grüßen, Weber' },
  ];

  t = (k: string) => this.i18n.t(k);
  use(e: { subject: string; body: string }) { this.subject.set(e.subject); this.body.set(e.body); this.answer.set(null); this.error.set(''); }

  async send(e: Event) {
    e.preventDefault();
    this.busy.set(true); this.answer.set(null); this.error.set('');
    try {
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subject: this.subject(), body: this.body() }) });
      if (r.ok) this.answer.set(await r.json());
      else this.error.set(r.status === 429 ? 'as_busy' : 'as_fail');
    } catch { this.error.set('as_fail'); }
    this.busy.set(false);
  }
}
