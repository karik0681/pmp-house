import { Cfg, Kind, WallKey, shell } from '../configurator/model';
import { PRICES } from '../configurator/data';

/** Everything the company prices on top of the base container. */
export const OPTS = ['door', 'win', 'fr', 'pano', 'ins100', 'floor50', 'floor80', 'floor100', 'kitchen', 'wc', 'shower'] as const;
export type Opt = typeof OPTS[number];
/** All prices are without VAT. 0 means "not filled in yet". */
export interface PriceList { base: Record<string, number>; opt: Record<Opt, number>; km: number; montage: number; crane: number }
/** What the employee adds to one enquiry: delivery, services, one free line and a discount in percent. */
export interface Quote { km: number; montage: boolean; crane: boolean; extraLabel: string; extra: number; discount: number }
export interface Line { key: string; opt?: Opt; label?: string; qty: number; unit: number; sum: number; missing: boolean }
export interface Result { lines: Line[]; subtotal: number; discount: number; total: number; vat: number; missing: boolean }

export const VAT = .21;
export const baseKey = (type: Kind, L: number, W: number) => `${type}:${L}x${W}`;
export const blankQuote = (): Quote => ({ km: 0, montage: false, crane: false, extraLabel: '', extra: 0, discount: 0 });

/** The price list the cabinet starts with: only the "from" prices already published on the website. The rest is for the company to fill in. */
export function defaultPrices(): PriceList {
  const base: Record<string, number> = {};
  for (const [type, sizes] of Object.entries(PRICES as Record<string, Record<string, number>>)) for (const [size, price] of Object.entries(sizes)) base[`${type}:${size}`] = price;
  return { base, opt: Object.fromEntries(OPTS.map(k => [k, 0])) as Record<Opt, number>, km: 0, montage: 0, crane: 0 };
}

const WALLS: WallKey[] = ['f', 'b', 'l', 'r'];
const count = (w: Cfg['w'], k: 'door' | 'win' | 'fr' | 'pano') => WALLS.reduce((a, s) => a + (w[s][k] || 0), 0);

/**
 * Turns a configuration into priced lines.
 * The base price already contains the standard doors and windows of the type, so only the openings above that count are charged.
 * A line whose price is still 0 in the price list is marked as missing and the total as incomplete.
 */
export function quote(c: Cfg, p: PriceList, q: Quote): Result {
  const lines: Line[] = [];
  const add = (key: string, qty: number, unit: number, more: Partial<Line> = {}) => lines.push({ key, qty, unit, sum: qty * unit, missing: !unit, ...more });
  add('base', c.count * c.floors, p.base[baseKey(c.type, c.L, c.W)] || 0);
  const std = shell(c.type);
  for (const k of ['door', 'win', 'fr', 'pano'] as const) {
    const over = count(c.w, k) - count(std, k);
    if (over > 0) add('over', over, p.opt[k], { opt: k });
  }
  if (c.ins === '100') add('opt', 1, p.opt.ins100, { opt: 'ins100' });
  if (c.floorIns === 50 || c.floorIns === 80 || c.floorIns === 100) { const k = ('floor' + c.floorIns) as Opt; add('opt', 1, p.opt[k], { opt: k }); }
  for (const k of ['kitchen', 'wc', 'shower'] as const) if (c[k]) add('opt', 1, p.opt[k], { opt: k });
  if (q.km > 0) add('km', q.km, p.km);
  if (q.montage) add('montage', 1, p.montage);
  if (q.crane) add('crane', 1, p.crane);
  if (q.extra) lines.push({ key: 'extra', label: q.extraLabel, qty: 1, unit: q.extra, sum: q.extra, missing: false });
  const subtotal = lines.reduce((a, l) => a + l.sum, 0);
  const discount = Math.round(subtotal * Math.min(100, Math.max(0, q.discount || 0)) / 100);
  const total = subtotal - discount;
  return { lines, subtotal, discount, total, vat: Math.round(total * (1 + VAT)), missing: lines.some(l => l.missing) };
}
