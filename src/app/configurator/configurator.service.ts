import { Injectable, computed, signal } from '@angular/core';
import { layout, postsOf } from '../three/stage';
import { Cfg, Kind, WallKey, fresh, isCustom, priceOf, repair, shell, sizesOf, Movable, Side } from './model';

export type View = '3d' | 'skel' | 'plan';

/** Single source of truth for the configurator. Components read signals and call these methods. */
/** The configurator steps, in the order the visitor walks through them. */
export const STEPS = ['type', 'walls', 'look', 'inside', 'send'] as const;

@Injectable({ providedIn: 'root' })
export class ConfiguratorService {
  readonly cfg = signal<Cfg>(fresh('P', 6, 3));
  readonly step = signal(0);
  readonly stepKey = computed(() => STEPS[this.step()]);
  readonly wall = signal<WallKey>('f');
  readonly view = signal<View>('3d');

  readonly lay = computed<any>(() => layout(this.cfg()));
  readonly price = computed(() => priceOf(this.cfg()));
  readonly custom = computed(() => isCustom(this.cfg()));
  readonly posts = computed<any[]>(() => postsOf(this.cfg()));

  private edit(fn: (c: Cfg) => void, fix = false) {
    const c: Cfg = structuredClone(this.cfg());
    fn(c);
    if (fix) repair(c);
    this.cfg.set(c);
  }

  /** Would the configuration still be buildable with this change? */
  fits(patch: Partial<Cfg>) { return !!layout({ ...this.cfg(), ...patch }); }
  fitsWall(k: string, v: number) {
    const c = this.cfg(), w = this.wall();
    return !!layout({ ...c, w: { ...c.w, [w]: { ...c.w[w], [k]: v } } });
  }

  /** Where on the current wall the doors or windows of one kind should sit; picking the same side again returns to automatic. */
  setPos(k: Movable, side: Side) {
    const w = this.wall();
    this.edit(c => { const pos = { ...(c.w[w].pos || {}) }; if (pos[k] === side) delete pos[k]; else pos[k] = side; c.w[w].pos = pos; });
  }
  fitsPos(k: Movable, side: Side) {
    const c = this.cfg(), w = this.wall();
    return !!layout({ ...c, w: { ...c.w, [w]: { ...c.w[w], pos: { ...(c.w[w].pos || {}), [k]: side } } } });
  }

  /** Opens a saved configuration. Three-part windows are no longer offered, so old links lose them. */
  load(c: Cfg) { for (const w of Object.values(c.w)) w.win3 = 0; this.cfg.set(c); }
  set<K extends keyof Cfg>(k: K, v: Cfg[K]) { this.edit(c => { c[k] = v; }); }
  toggle(k: 'kitchen' | 'wc' | 'shower' | 'floorIns') { this.edit(c => { c[k] = c[k] ? 0 : 1; }); }
  bump(k: 'count' | 'floors', d: number) { this.edit(c => { c[k] += d; }); }
  bumpWall(k: string, d: number) { const w = this.wall(); this.edit(c => { (c.w[w] as any)[k] = ((c.w[w] as any)[k] || 0) + d; }); }

  setType(type: Kind) {
    this.edit(c => {
      /* an untouched facade follows the new type, the way each one is really sold */
      if (JSON.stringify(c.w) === JSON.stringify(shell(c.type))) { c.w = shell(type); if (type === 'P') c.bathPos = 'l'; }
      const wasCustom = isCustom(c);
      c.type = type;
      if (wasCustom || !sizesOf(type).some(([L, W]) => L === c.L && W === c.W)) { c.L = 6; c.W = 3; }   /* 3 × 6 m exists in every type */
    }, true);
  }
  setSize(L: number, W: number) { this.edit(c => { c.L = L; c.W = W; }, true); }
  togglePost(w: 'f' | 'b', i: number) {
    this.edit(c => {
      const on = c.posts.some(p => p.w === w && p.i === i);
      c.posts = on ? c.posts.filter(p => !(p.w === w && p.i === i)) : [...c.posts, { w, i }];
    });
  }

  go(i: number) {
    this.step.set(Math.max(0, Math.min(STEPS.length - 1, i)));
  }
}
