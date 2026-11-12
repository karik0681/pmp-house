import { layout, postsOf, slots } from '../three/stage';
import { SIZES, PRICES } from './data';
import { num, money, dim } from '../core/format';

export type Kind = 'Y' | 'K' | 'P';
export type WallKey = 'f' | 'b' | 'l' | 'r';
export type Side = 'l' | 'm' | 'r';
export type Movable = 'door' | 'win' | 'fr';
/** counts of openings in one wall; pos = where the customer wants them (left, middle, right seen from outside) */
export interface Openings { door: number; win: number; win3: number; fr: number; pano: number; pos?: Partial<Record<Movable, Side>> }
export interface Post { w: 'f' | 'b'; i: number }
export interface Cfg {
  type: Kind; L: number; W: number; count: number; floors: number; rooms: number;
  kitchen: number; wc: number; shower: number; bathPos: 'l' | 'm' | 'r'; kitchenPos?: 'l' | 'm' | 'r';
  color: 'white' | 'wood' | 'ant'; joinery: 'white' | 'ant'; frJoin: 'white' | 'ant';
  ins: string; floorIns: number; posts: Post[]; w: Record<WallKey, Openings>;
}
type T = (k: string) => string;

export const blank = (): Openings => ({ door: 0, win: 0, win3: 0, fr: 0, pano: 0 });
export const shell = (type: Kind): Record<WallKey, Openings> => (type === 'P'
  ? { f: { ...blank(), fr: 1 }, b: blank(), l: blank(), r: { ...blank(), win: 1 } }
  : { f: { ...blank(), door: 1, win: 2 }, b: blank(), l: blank(), r: blank() });
export const fresh = (type: Kind, L: number, W: number): Cfg => ({
  type, L, W, count: 1, floors: 1, rooms: 1, kitchen: 0, wc: 0, shower: 0, bathPos: type === 'P' ? 'l' : 'r', kitchenPos: 'r',
  color: 'white', joinery: 'white', frJoin: 'ant', ins: '50', floorIns: 1, posts: [], w: shell(type),
});

export const sizesOf = (k: Kind): number[][] => SIZES[k];
export const priceOf = (c: Cfg): number | null => (PRICES as Record<string, Record<string, number>>)[c.type]?.[`${c.L}x${c.W}`] || null;
export const fromPrice = (k: Kind): number => PRICES[k]['6x3'];
export const isCustom = (c: Cfg) => !SIZES[c.type].some(([L, W]: number[]) => L === c.L && W === c.W);
export const valid = (c: Cfg) => !!layout(c);

/** Keeps a choice physically valid after a type or size change. */
/** How many plain doors or windows may stand beside French doors on one wall, at most one of them a door.
 *  Premium: doors pushed to the left or right leave the rest of the wall free.
 *  Economy and Standard: the fixed posts split the front and rear wall, the doors take the middle bay and the outer ones stay free. */
export function asideCap(c: Cfg, k: WallKey): number {
  const o = c.w[k];
  if (o.fr === 0 || (o.pano || 0) > 0) return 0;
  if (c.type === 'P') return o.pos?.fr === 'l' || o.pos?.fr === 'r' ? 2 : 0;
  return (k === 'f' || k === 'b') && postsOf(c).length ? 2 : 0;
}
/** On a wall with French doors or a panoramic window, keep only what may stand beside them. */
export function tidyWall(c: Cfg, k: WallKey) {
  const o = c.w[k], cap = asideCap(c, k);
  if (o.fr + (o.pano || 0) === 0) return;
  if (cap) { o.door = Math.min(o.door, 1); o.win = Math.min(o.win, cap - o.door); }
  else { o.door = 0; o.win = 0; if (o.pos) { delete o.pos.door; delete o.pos.win; } }
}
export function repair(c: Cfg) {
  /* insulation: there is no uninsulated version; walls 50 or 100 mm, floor standard (1) or +50/80/100 mm */
  if (c.ins !== '100') c.ins = '50';
  if (![1, 50, 80, 100].includes(c.floorIns)) c.floorIns = 1;
  if (c.type !== 'P') for (const w of Object.values(c.w)) if (w.pos) delete (w.pos as any).fr;
  for (const k of Object.keys(c.w) as WallKey[]) tidyWall(c, k);
  if (c.type !== 'P') c.floors = 1;
  if (c.type === 'P') { const n = slots(c.L); c.posts = c.posts.filter(p => p.i > 0 && p.i < n); }
  if (!layout(c)) for (const k of Object.keys(c.w) as WallKey[]) c.w[k].pano = 0;
  if (!layout(c)) { c.rooms = 1; c.kitchen = 0; c.wc = 0; c.shower = 0; }
  if (!layout(c)) c.w = { f: { ...blank(), door: 1, win: 1 }, b: blank(), l: blank(), r: blank() };
  if (!layout(c)) c.w = { f: { ...blank(), door: 1 }, b: blank(), l: blank(), r: blank() };
}

export function summaryLines(c: Cfg, t: T): string[] {
  const out = [`${t(c.type)} (${dim(c.L, c.W)}, ${num(+(c.L * c.W).toFixed(1))} m²)`];
  if (c.count > 1) out.push(`${t('modules')}: ${c.count}`);
  if (c.floors > 1) out.push(`${t('floors')}: ${c.floors}`);
  const lay: any = layout(c), custom: Post[] = postsOf(c);
  if (custom.length && lay) out.push(`${t('postsWord')}: ${custom.map(p => `${t(p.w === 'f' ? 'front' : 'rear')} ${num(+(.16 + p.i * lay.sw).toFixed(1))} m`).join(', ')}`);
  out.push(`${t('rooms')}: ${c.rooms}`);
  const eq = (['kitchen', 'wc', 'shower'] as const).filter(k => c[k]).map(t);
  if (eq.length) out.push(eq.join(', '));
  if (c.kitchen) out.push(`${t('kitchenPos')}: ${t(c.kitchenPos || 'r')}`);
  if (c.wc || c.shower) out.push(`${t('bathPos')}: ${t(c.bathPos)}`);
  for (const [k, n] of [['f', 'front'], ['b', 'rear'], ['l', 'left'], ['r', 'right']] as [WallKey, string][]) {
    const w = c.w[k], p = (['door', 'win', 'win3', 'fr', 'pano'] as const).filter(x => w[x]).map(x => `${t(x)} ${w[x]}${(w.pos as any)?.[x] ? ' (' + t((w.pos as any)[x]).toLowerCase() + ')' : ''}`);
    if (p.length) out.push(`${t(n)}: ${p.join(', ')}`);
  }
  out.push(`${t('walls')}: ${t(c.color)}, ${t('joinery')}: ${t(c.joinery)}, ${t('frJoin')}: ${t(c.frJoin)}`);
  out.push(`${t('insWall')}: ${t('insW' + c.ins)}`, `${t('insFloor')}: ${t('insF' + c.floorIns)}`);
  return out;
}

export const title = (c: Cfg, t: T) => `${t(c.type)} ${dim(c.L, c.W)}`;
export const priceText = (p: number | null, t: T) => (p ? `${t('from')} ${money(p)} ${t('noVat')}` : t('onReq'));

/** Floor plan as an SVG string, generated from the same layout the 3D model uses. */
export function planSvg(c: Cfg, t: T): string {
  const lay: any = layout(c); if (!lay) return '';
  const { L, W } = c, s = 60, pad = 58, F = .16;
  const X = (v: number) => pad + (v + L / 2) * s, Z = (v: number) => pad + (v + W / 2) * s, p: string[] = [];
  p.push(`<rect x="${pad}" y="${pad}" width="${L * s}" height="${W * s}" fill="#fff" stroke="#17392c" stroke-width="7"/>`);
  /* a bathroom at an end takes the whole width; one in the middle is a cabin against the rear wall */
  const bathH = lay.mid ? lay.cabin * s + F * s - 4 : W * s - 8;
  if (lay.zone) p.push(`<rect x="${X(lay.zone[0])}" y="${pad + 4}" width="${(lay.zone[1] - lay.zone[0]) * s}" height="${bathH}" fill="#dceee3"/>`);
  const wallV = (x: number) => p.push(`<line x1="${X(x)}" y1="${pad}" x2="${X(x)}" y2="${pad + W * s}" stroke="#17392c" stroke-width="4"/>`);
  const label = (x: number, y: number, tx: string, size = 18) => p.push(`<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="600" fill="#17392c">${tx}</text>`);
  const mark = (x1: number, y1: number, x2: number, y2: number, k: string) => { const col = k === 'door' ? '#c8742a' : k === 'vent' ? '#7e9489' : '#4d9fc4'; p.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="11"/>`); };
  const edge = (cells: any[], sw: number, total: number, fn: (a: number, b: number, k: string) => void) => {
    let x = -total / 2;
    for (const cell of cells) {
      const w = cell.span * sw;
      if (cell.k !== 'panel') { const o = cell.k === 'french' ? Math.min(2.5, w - .08) : cell.k === 'pano' ? w - .08 : cell.k === 'door' ? .845 : cell.k === 'vent' ? .5 : cell.k === 'win3' ? 1.5 : .97; fn(x + w / 2 - o / 2, x + w / 2 + o / 2, cell.k); }
      x += w;
    }
  };
  edge(lay.f, lay.sw, lay.inner, (a, b, k) => mark(X(a), Z(W / 2), X(b), Z(W / 2), k));
  edge(lay.b, lay.sw, lay.inner, (a, b, k) => mark(X(-a), Z(-W / 2), X(-b), Z(-W / 2), k));
  edge(lay.r, lay.sh, lay.innerW, (a, b, k) => mark(X(L / 2), Z(-a), X(L / 2), Z(-b), k));
  edge(lay.l, lay.sh, lay.innerW, (a, b, k) => mark(X(-L / 2), Z(a), X(-L / 2), Z(b), k));
  if (lay.mid) {
    p.push(`<path d="M${X(lay.zone[0])} ${pad}V${pad + 4 + bathH}H${X(lay.zone[1])}V${pad}" fill="none" stroke="#17392c" stroke-width="4"/>`);
    label(X(0), pad + 4 + bathH / 2 + 6, t('bath'), 15);
  } else if (lay.zone) { if (lay.pos !== 'l') wallV(lay.zone[0]); if (lay.pos !== 'r') wallV(lay.zone[1]); label(X((lay.zone[0] + lay.zone[1]) / 2), Z(0) + 6, t('bath')); }
  const big = lay.big, st = (big[1] - big[0]) / lay.parts;
  for (let i = 1; i < lay.parts; i++) wallV(big[0] + i * st);
  const rooms: number[] = [];
  for (const sg of lay.segs) { if (sg === big) for (let i = 0; i < lay.parts; i++) rooms.push(big[0] + (i + .5) * st); else rooms.push((sg[0] + sg[1]) / 2); }
  rooms.forEach((x, i) => label(X(x), Z(0) + 30, `${t('room')} ${i + 1}`));
  if (c.kitchen) { const len = lay.klen, xr = lay.kx - len / 2; p.push(`<rect x="${X(xr)}" y="${pad + 4}" width="${len * s}" height="${.6 * s}" fill="#ecd9b8" stroke="#17392c" stroke-width="2"/>`); label(X(xr + len / 2), pad + 28, t('kitchen'), 15); }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(`<rect x="${X(sx * (L / 2 - F / 2)) - 9}" y="${Z(sz * (W / 2 - F / 2)) - 9}" width="18" height="18" fill="#17392c"/>`);
  for (const q of lay.posts) p.push(`<rect x="${X(-lay.inner / 2 + q.i * lay.sw) - 9}" y="${Z((q.w === 'f' ? 1 : -1) * (W / 2 - F / 2)) - 9}" width="18" height="18" fill="#c8742a"/>`);
  label(X(0), pad - 22, `${num(L)} m`, 22);
  p.push(`<text x="${pad - 24}" y="${Z(0)}" text-anchor="middle" font-size="22" font-weight="600" fill="#17392c" transform="rotate(-90 ${pad - 24} ${Z(0)})">${num(W)} m</text>`);
  return `<svg viewBox="0 0 ${L * s + pad * 2} ${W * s + pad * 2}" role="img" aria-label="${t('viewPlan')}">${p.join('')}</svg>`;
}

/** Configuration ⇄ text for links and saved enquiries. */
export const encode = (c: Cfg) => btoa(unescape(encodeURIComponent(JSON.stringify(c))));
export function decode(s: string): Cfg | null {
  try { const c = JSON.parse(decodeURIComponent(escape(atob(s)))); return c && c.w && layout(c) ? c : null; } catch { return null; }
}
export const linkTo = (c: Cfg) => `${location.origin}/?c=${encodeURIComponent(encode(c))}`;
