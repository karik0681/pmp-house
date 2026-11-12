import { Component, computed, inject, input, signal } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { money } from '../core/format';
import { title } from '../configurator/model';
import { Lead } from '../leads/lead';
import { LeadsService } from '../leads/leads.service';
import { Custom, Line, Quote, RowEdit, blankQuote, quote } from './quote';
import { PricesService } from './prices.service';
import { optLabel } from './price-list.component';

/**
 * Price calculation for one enquiry. Every part of the client's configuration is a line with its own quantity, price and discount.
 * The employee can change or remove any line and add more from the price list.
 */
@Component({
  selector: 'app-quote',
  template: `
    <h3>{{ t('q_title') }}</h3>
    <div class="q-head" aria-hidden="true"><span>{{ t('q_qty') }}</span><span>{{ t('q_unit') }}</span><span>{{ t('q_disc') }}</span><span>{{ t('q_sum') }}</span></div>
    <ul class="q-rows">
      @for (l of res().lines; track l.id) {
        <li class="q-row" [class.is-missing]="l.missing">
          <div class="q-row-top">
            @if (isCustom(l)) {
              <input class="q-name" [attr.aria-label]="t('q_customPh')" [placeholder]="t('q_customPh')" [value]="l.label" (change)="edit(l, { label: $any($event.target).value })">
            } @else { <b>{{ label(l) }}</b> }
            <button type="button" class="q-x" [attr.aria-label]="t('q_remove') + ': ' + label(l)" [disabled]="l.id === 'base'" (click)="remove(l)">×</button>
          </div>
          <div class="q-row-in">
            <input type="number" inputmode="numeric" min="0" [attr.aria-label]="t('q_qty')" [value]="l.qty" (change)="edit(l, { qty: num($event) })">
            <input type="number" inputmode="numeric" min="0" [attr.aria-label]="t('q_unit')" [placeholder]="t('q_missing')" [value]="l.missing ? '' : l.unit" (change)="edit(l, { unit: num($event) })">
            <input type="number" inputmode="numeric" min="0" max="100" [attr.aria-label]="t('q_disc')" placeholder="0" [value]="l.disc || ''" (change)="edit(l, { disc: num($event) })">
            <output>{{ l.missing ? '—' : money(l.sum) }}</output>
          </div>
        </li>
      }
    </ul>

    <p class="q-addh">{{ t('q_add') }}</p>
    <div class="q-add">
      @for (id of res().available; track id) { <button type="button" (click)="add(id)">+ {{ name(id) }}</button> }
      <button type="button" (click)="addCustom()">+ {{ t('q_custom') }}</button>
    </div>

    <label class="fld q-all"><span>{{ t('q_discount') }}</span><input type="number" inputmode="numeric" min="0" max="100" placeholder="0" [value]="q().discount || ''" (change)="set({ discount: num($event) })"></label>
    <table class="q-table">
      <tbody>
        @if (res().discount) {
          <tr><td>{{ t('q_subtotal') }}</td><td>{{ money(res().subtotal) }}</td></tr>
          <tr><td>{{ t('q_discountLine') }} {{ q().discount }} %</td><td>− {{ money(res().discount) }}</td></tr>
        }
        <tr class="q-total"><td>{{ t('q_total') }}</td><td>{{ money(res().total) }}</td></tr>
        <tr><td>{{ t('q_vat') }}</td><td>{{ money(res().vat) }}</td></tr>
      </tbody>
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
  num(e: Event) { return Math.max(0, Math.round(+(e.target as HTMLInputElement).value) || 0); }
  isCustom(l: Line) { return /^c\d+$/.test(l.id); }
  set(patch: Partial<Quote>) { this.copied.set(false); this.leads.update(this.lead().id, { quote: { ...this.q(), ...patch } }); }

  /** the name of a line of the price list */
  name(id: string) {
    if (id === 'base') return title(this.lead().cfg, this.t);
    if (id === 'km') return this.t('q_km');
    if (id === 'montage' || id === 'crane') return this.t('q_' + id);
    return optLabel(id as any, this.t);
  }
  label(l: Line) { return this.isCustom(l) ? l.label || this.t('q_custom') : this.name(l.id); }

  /** changes the quantity, the price, the discount or the name of one line */
  edit(l: Line, patch: RowEdit & { label?: string }) {
    const q = this.q();
    if (this.isCustom(l)) { const i = +l.id.slice(1); this.set({ custom: q.custom.map((x, n) => (n === i ? { ...x, ...patch } as Custom : x)) }); }
    else this.set({ rows: { ...q.rows, [l.id]: { ...q.rows[l.id], ...patch } } });
  }
  remove(l: Line) {
    const q = this.q();
    if (this.isCustom(l)) { const i = +l.id.slice(1); this.set({ custom: q.custom.filter((_, n) => n !== i) }); return; }
    /* a line added by hand simply goes away; a line that comes from the configuration is switched off */
    if (q.added.includes(l.id)) { const rows = { ...q.rows }; delete rows[l.id]; this.set({ added: q.added.filter(x => x !== l.id), rows }); }
    else this.set({ rows: { ...q.rows, [l.id]: { ...q.rows[l.id], off: true } } });
  }
  /** puts a line of the price list into the calculation, or brings a removed one back */
  add(id: string) {
    const q = this.q();
    if (q.rows[id]?.off) { const rows = { ...q.rows }; delete rows[id]; this.set({ rows }); }
    else this.set({ added: [...q.added, id] });
  }
  addCustom() { this.set({ custom: [...this.q().custom, { label: '', qty: 1, unit: 0, disc: 0 }] }); }

  /** the calculation as plain text, ready to paste into an e-mail or WhatsApp */
  private text() {
    const r = this.res(), out = r.lines.map(l => `${this.label(l)}${l.qty !== 1 ? ' × ' + l.qty : ''}${l.disc ? ` (${this.t('q_discountLine').toLowerCase()} ${l.disc} %)` : ''}: ${l.missing ? this.t('q_missing') : money(l.sum)}`);
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
