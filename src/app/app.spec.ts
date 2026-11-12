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

describe('price calculation in the cabinet', () => {
  const prices = () => { const p = defaultPrices(); p.base['K:6x3'] = 100000; p.opt.win = 5000; p.opt.kitchen = 20000; p.km = 30; return p; };
  it('the standard doors and windows are part of the base price', () => {
    const r = quote(fresh('K', 6, 3), prices(), blankQuote());
    expect(r.total).toBe(100000);
    expect(r.missing).toBe(false);
  });
  it('extra windows, equipment, delivery and a discount add up', () => {
    const c = fresh('K', 6, 3); c.w.b.win = 2; c.kitchen = 1;
    const r = quote(c, prices(), { ...blankQuote(), km: 100, discount: 10 });
    expect(r.subtotal).toBe(100000 + 2 * 5000 + 20000 + 100 * 30);
    expect(r.total).toBe(119700);
    expect(r.vat).toBe(144837);
  });
  it('a price that is not filled in marks the calculation as incomplete', () => {
    const c = fresh('K', 6, 3); c.wc = 1;
    expect(quote(c, prices(), blankQuote()).missing).toBe(true);
  });
});
