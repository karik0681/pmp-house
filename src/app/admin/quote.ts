import { Cfg, Kind, WallKey } from '../configurator/model';
import { PRICES } from '../configurator/data';

/** Everything the company prices on top of the base container. */
export const OPTS = ['door', 'win', 'fr', 'pano', 'ins100', 'floor50', 'floor80', 'floor100', 'kitchen', 'wc', 'shower'] as const;
export type Opt = typeof OPTS[number];
/** All prices are without VAT. 0 means "not filled in yet". */
export interface PriceList { base: Record<string, number>; opt: Record<Opt, number>; km: number; montage: number; crane: number }
/** A change the employee made to one line: another quantity or price, a discount in percent, or the line removed. */
export interface RowEdit { qty?: number; unit?: number; disc?: number; off?: boolean }
export interface Custom { label: string; qty: number; unit: number; disc: number }
/** The employee's work on one enquiry: edits of the lines, lines added from the price list, free lines and a discount on the whole sum. */
export interface Quote { rows: Record<string, RowEdit>; added: string[]; custom: Custom[]; discount: number }
/** id: 'base', a surcharge, 'km', 'montage', 'crane', or 'c0', 'c1'… for free lines */
export interface Line { id: string; label?: string; qty: number; unit: number; disc: number; sum: number; missing: boolean }
export interface Result { lines: Line[]; available: string[]; subtotal: number; discount: number; total: number; vat: number; missing: boolean }

/** Lines an employee can add by hand: every surcharge plus delivery and services. */
export const EXTRAS = [...OPTS, 'km', 'montage', 'crane'] as const;
export const VAT = .21;
export const baseKey = (type: Kind, L: number, W: number) => `${type}:${L}x${W}`;
export const blankQuote = (): Quote => ({ rows: {}, added: [], custom: [], discount: 0 });

/** The price list the cabinet starts with: only the "from" prices already published on the website. The rest is for the company to fill in. */
export function defaultPrices(): PriceList {
  const base: Record<string, number> = {};
  for (const [type, sizes] of Object.entries(PRICES as Record<string, Record<string, number>>)) for (const [size, price] of Object.entries(sizes)) base[`${type}:${size}`] = price;
  return { base, opt: Object.fromEntries(OPTS.map(k => [k, 0])) as Record<Opt, number>, km: 0, montage: 0, crane: 0 };
}

const WALLS: WallKey[] = ['f', 'b', 'l', 'r'];
const count = (w: Cfg['w'], k: 'door' | 'win' | 'fr' | 'pano') => WALLS.reduce((a, s) => a + (w[s][k] || 0), 0);

const pct = (v: number | undefined) => Math.min(100, Math.max(0, v || 0));
/** The price of one piece from the price list. */
export const unitOf = (id: string, c: Cfg, p: PriceList): number =>
  id === 'base' ? p.base[baseKey(c.type, c.L, c.W)] || 0 : id === 'km' || id === 'montage' || id === 'crane' ? p[id] : p.opt[id as Opt] || 0;

/**
 * Turns a configuration into priced lines: the container itself and one line for every kind of opening and equipment the client chose.
 * The employee may change the quantity, the price and the discount of each line, remove it, or add lines from the price list.
 * A line with no price in the price list and none typed in is marked as missing and the total as incomplete.
 */
export function quote(c: Cfg, p: PriceList, q: Quote): Result {
  const own: [string, number][] = [['base', c.count * c.floors]];
  for (const k of ['door', 'win', 'fr', 'pano'] as const) { const n = count(c.w, k); if (n) own.push([k, n]); }
  if (c.ins === '100') own.push(['ins100', 1]);
  if (c.floorIns === 50 || c.floorIns === 80 || c.floorIns === 100) own.push(['floor' + c.floorIns, 1]);
  for (const k of ['kitchen', 'wc', 'shower'] as const) if (c[k]) own.push([k, 1]);
  const has = new Set(own.map(o => o[0]));
  for (const id of q.added) if (!has.has(id)) { own.push([id, 1]); has.add(id); }

  const lines: Line[] = [];
  const push = (id: string, qty: number, unit: number, disc: number, missing: boolean, label?: string) =>
    lines.push({ id, label, qty, unit, disc, sum: Math.round(qty * unit * (1 - disc / 100)), missing });
  for (const [id, n] of own) {
    const e = q.rows[id] || {};
    if (e.off) continue;
    const listed = unitOf(id, c, p);
    push(id, e.qty ?? n, e.unit ?? listed, pct(e.disc), e.unit === undefined && !listed);
  }
  q.custom.forEach((x, i) => push('c' + i, x.qty, x.unit, pct(x.disc), false, x.label));

  const shown = new Set(lines.map(l => l.id));
  const subtotal = lines.reduce((a, l) => a + l.sum, 0);
  const discount = Math.round(subtotal * pct(q.discount) / 100);
  const total = subtotal - discount;
  return { lines, available: EXTRAS.filter(id => !shown.has(id)), subtotal, discount, total, vat: Math.round(total * (1 + VAT)), missing: lines.some(l => l.missing) };
}
