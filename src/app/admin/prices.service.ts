import { Injectable, signal } from '@angular/core';
import { PriceList, defaultPrices } from './quote';

const KEY = 'pmp-demo-prices';

/**
 * Demo storage: the price list lives in this browser (localStorage).
 * For the real CRM only this class changes, to HTTP calls to the server, so every employee sees the same prices.
 */
@Injectable({ providedIn: 'root' })
export class PricesService {
  readonly list = signal<PriceList>(this.read());

  constructor() {
    if (typeof window !== 'undefined') addEventListener('storage', e => { if (e.key === KEY) this.list.set(this.read()); });
  }

  /** Changes the price list through a function, for example p => { p.km = 28; }. */
  edit(fn: (p: PriceList) => void) {
    const p: PriceList = structuredClone(this.list());
    fn(p);
    this.list.set(p);
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage full or blocked */ }
  }
  reset() { this.edit(p => Object.assign(p, defaultPrices())); }

  private read(): PriceList {
    const d = defaultPrices();
    try {
      const s = localStorage.getItem(KEY);
      if (s) { const p = JSON.parse(s); return { ...d, ...p, base: { ...p.base }, opt: { ...d.opt, ...p.opt } }; }
    } catch { /* blocked */ }
    return d;
  }
}
