import { describe, it, expect } from 'vitest';
import { layout } from './three/stage';
import { fresh, repair, valid } from './configurator/model';

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
