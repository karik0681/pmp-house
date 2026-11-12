import { describe, it, expect } from 'vitest';
import { layout } from './three/stage';
import { fresh, repair, valid } from './configurator/model';
import { blankQuote, defaultPrices, quote } from './admin/quote';

describe('container layout rules', () => {
  it('a 6 m Standard has two fixed posts on each long wall', () => {
    expect(layout(fresh('K', 6, 3))?.posts.length).toBe(4);
  });
  it('a panoramic window does not fit across the fixed posts of a 6 m Standard', () => {
    const c = fresh('K', 6, 3); c.w.f = { door: 0, win: 0, win3: 0, fr: 0, pano: 1 };
    expect(valid(c)).toBe(false);
  });
  it('the same panoramic window fits on a Premium', () => {
    const c = fresh('P', 6, 3); c.w.f = { door: 0, win: 0, win3: 0, fr: 0, pano: 1 };
    expect(valid(c)).toBe(true);
  });
  it('repair() always returns a buildable configuration', () => {
    const c = fresh('P', 6, 3); c.w.f.pano = 2; c.kitchen = 1; c.wc = 1; c.rooms = 3; c.L = 2.4; c.W = 2.4;
    repair(c);
    expect(valid(c)).toBe(true);
  });
});

describe('inside the container', () => {
  it('a bathroom in the middle has no shower and leaves the front wall free', () => {
    const c = fresh('K', 6, 3); c.wc = 1; c.shower = 1; c.bathPos = 'm';
    expect(valid(c)).toBe(false);
    c.shower = 0;
    expect(valid(c)).toBe(true);
    expect(layout(c)?.mid).toBe(true);
  });
  it('the kitchen goes left, middle or right, but not into a bathroom in the middle', () => {
    const c = fresh('P', 9, 3); c.kitchen = 1;
    const x = (p: 'l' | 'm' | 'r') => layout({ ...c, kitchenPos: p })!.kx;
    expect(x('l')).toBeLessThan(x('m'));
    expect(x('m')).toBeLessThan(x('r'));
    expect(valid({ ...c, wc: 1, bathPos: 'm', kitchenPos: 'm' })).toBe(false);
  });
});

describe('price calculation in the cabinet', () => {
  const prices = () => { const p = defaultPrices(); p.base['K:6x3'] = 100000; p.opt.door = 8000; p.opt.win = 5000; p.opt.kitchen = 20000; p.km = 30; return p; };
  it('every part of the configuration is its own line', () => {
    const r = quote(fresh('K', 6, 3), prices(), blankQuote());
    expect(r.lines.map(l => l.id)).toEqual(['base', 'door', 'win']);
    expect(r.total).toBe(100000 + 8000 + 2 * 5000);
    expect(r.missing).toBe(false);
  });
  it('a line can be removed, repriced and discounted, and lines can be added', () => {
    const c = fresh('K', 6, 3); c.kitchen = 1;
    const q = { ...blankQuote(), rows: { door: { off: true }, win: { unit: 6000, disc: 50 }, km: { qty: 100 } }, added: ['km'], custom: [{ label: 'Schody', qty: 1, unit: 4000, disc: 0 }], discount: 10 };
    const r = quote(c, prices(), q);
    expect(r.lines.map(l => l.id)).toEqual(['base', 'win', 'kitchen', 'km', 'c0']);
    expect(r.subtotal).toBe(100000 + 6000 + 20000 + 3000 + 4000);
    expect(r.total).toBe(119700);
    expect(r.available).toContain('door');
  });
  it('a price that is not filled in marks the calculation as incomplete until one is typed into the line', () => {
    const c = fresh('K', 6, 3); c.wc = 1;
    expect(quote(c, prices(), blankQuote()).missing).toBe(true);
    expect(quote(c, prices(), { ...blankQuote(), rows: { wc: { unit: 0 } } }).missing).toBe(false);
  });
});
