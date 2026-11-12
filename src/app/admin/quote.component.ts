import { Component, computed, inject, input, signal } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { money } from '../core/format';
import { title } from '../configurator/model';
import { Lead } from '../leads/lead';
import { LeadsService } from '../leads/leads.service';
import { Line, Quote, blankQuote, quote } from './quote';
import { PricesService } from './prices.service';
import { optLabel } from './price-list.component';

/** Price calculation for one enquiry: the client's configuration priced by the price list, plus delivery, services and a discount. */
@Component({
  selector: 'app-quote',
  template: `
    <h3>{{ t('q_title') }}</h3>
    <div class="q-in">
      <label class="fld"><span>{{ t('q_km') }}</span><input type="number" inputmode="numeric" min="0" [value]="q().km || ''" (change)="set({ km: num($event) })"></label>
      <label class="fld"><span>{{ t('q_discount') }}</span><input type="number" inputmode="numeric" min="0" max="100" [value]="q().discount || ''" (change)="set({ discount: num($event) })"></label>
      <label class="q-check"><input type="checkbox" [checked]="q().montage" (change)="set({ montage: $any($event.target).checked })"><span>{{ t('q_montage') }}</span></label>
      <label class="q-check"><input type="checkbox" [checked]="q().crane" (change)="set({ crane: $any($event.target).checked })"><span>{{ t('q_crane') }}</span></label>
      <label class="fld"><span>{{ t('q_extraLabel') }}</span><input [value]="q().extraLabel" (change)="set({ extraLabel: $any($event.target).value })"></label>
      <label class="fld"><span>{{ t('q_extra') }}</span><input type="number" inputmode="numeric" [value]="q().extra || ''" (change)="set({ extra: num($event, true) })"></label>
    </div>
    <table class="q-table">
      <tbody>
        @for (l of res().lines; track $index) {
          <tr [class.is-missing]="l.missing"><td>{{ label(l) }}@if (times(l)) { <span> × {{ l.qty }}</span> }</td><td>{{ l.missing ? t('q_missing') : money(l.sum) }}</td></tr>
        }
      </tbody>
      <tfoot>
        @if (res().discount) {
          <tr><td>{{ t('q_subtotal') }}</td><td>{{ money(res().subtotal) }}</td></tr>
          <tr><td>{{ t('q_discountLine') }} {{ q().discount }} %</td><td>− {{ money(res().discount) }}</td></tr>
        }
        <tr class="q-total"><td>{{ t('q_total') }}</td><td>{{ money(res().total) }}</td></tr>
        <tr><td>{{ t('q_vat') }}</td><td>{{ money(res().vat) }}</td></tr>
      </tfoot>
    </table>
    @if (res().missing) { <p class="note warn">{{ t('q_incomplete') }}</p> }
    <div class="q-actions">
      <button type="button" class="btn btn-g" [disabled]="res().missing" (click)="save()">{{ t('q_save') }}</button>
      <button type="button" class="btn btn-o" (click)="copy()">{{ t(copied() ? 'q_copied' : 'q_copy') }}</button>
    </div>`,
})
export class QuoteComponent {
  private i18n = inject(I18nService);
  private leads = inject(LeadsService);
  private prices = inject(PricesService);

  readonly lead = input.required<Lead>();
  readonly copied = signal(false);
  readonly q = computed<Quote>(() => ({ ...blankQuote(), ...(this.lead().quote || {}) }));
  readonly res = computed(() => quote(this.lead().cfg, this.prices.list(), this.q()));

  t = (k: string) => this.i18n.t(k);
  money = money;
  num(e: Event, negative = false) { const v = Math.round(+(e.target as HTMLInputElement).value) || 0; return negative ? v : Math.max(0, v); }
  set(patch: Partial<Quote>) { this.copied.set(false); this.leads.update(this.lead().id, { quote: { ...this.q(), ...patch } }); }

  /** show "× 2" after the name; delivery already says its kilometres */
  times(l: Line) { return l.qty !== 1 && l.key !== 'km'; }
  label(l: Line) {
    if (l.key === 'base') return title(this.lead().cfg, this.t);
    if (l.key === 'over') return `${this.t(l.opt!)} (${this.t('q_over')})`;
    if (l.key === 'opt') return optLabel(l.opt!, this.t);
    if (l.key === 'extra') return l.label || this.t('q_extraLabel');
    if (l.key === 'km') return `${this.t('q_delivery')} ${l.qty} km`;
    return this.t('q_' + l.key);
  }
  /** the calculation as plain text, ready to paste into an e-mail or WhatsApp */
  private text() {
    const r = this.res(), out = r.lines.map(l => `${this.label(l)}${this.times(l) ? ' × ' + l.qty : ''}: ${l.missing ? this.t('q_missing') : money(l.sum)}`);
    if (r.discount) out.push(`${this.t('q_subtotal')}: ${money(r.subtotal)}`, `${this.t('q_discountLine')} ${this.q().discount} %: − ${money(r.discount)}`);
    out.push(`${this.t('q_total')}: ${money(r.total)}`, `${this.t('q_vat')}: ${money(r.vat)}`);
    return out.join('\n');
  }
  async copy() { try { await navigator.clipboard.writeText(this.text()); this.copied.set(true); } catch { /* clipboard blocked */ } }
  /** writes the total into the enquiry, so the board and the sums at the top use it */
  save() {
    const l = this.lead(), total = this.res().total;
    this.leads.update(l.id, { price: total });
    this.leads.addNote(l.id, this.t('q_savedNote').replace('{p}', money(total)));
  }
}
