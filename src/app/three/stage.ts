// @ts-nocheck
/* 3D engine (Three.js). Plain JS kept as-is from the prototype; Angular wraps it in components. */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const F = 0.16, WT = 0.07;
let BASE = 0.18, ROOF = 0.18;
export const HEIGHT = { Y: 2.57, K: 2.64, P: 2.8 };
let H = 2.64, WALL_H = H - BASE - ROOF;
const BATH_D = 1.7;
export const SLOT = .285;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t * t * t * (t * (t * 6 - 15) + 10);

export function skyEnv(renderer) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d'), sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#6f9fd0'); sky.addColorStop(.75, '#cfe1ee'); sky.addColorStop(1, '#f2f5f4');
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = 'rgba(255,255,255,.75)';
  for (const [x, y, r] of [[150, 120, 70], [240, 135, 50], [560, 95, 85], [670, 125, 55], [880, 140, 60]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.fillStyle = '#4f6a4a'; g.fillRect(0, 225, 1024, 31);
  g.fillStyle = '#74706a'; g.fillRect(0, 256, 1024, 256);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromEquirectangular(t); t.dispose(); pm.dispose();
  return rt.texture;
}
function tex(draw, size = 1024) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function whiteTex() {
  return tex((g, s) => {
    g.fillStyle = '#f3f4f1'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 24; i++) {
      const x = i * s / 24;
      g.fillStyle = '#c6cbc8'; g.fillRect(x, 0, 4, s);
      g.fillStyle = '#ffffff'; g.fillRect(x + 4, 0, 4, s);
    }
  });
}
function smoothTex() {
  const t = tex((g, s) => {
    g.fillStyle = '#f2f3f1'; g.fillRect(0, 0, s / 2, s);
    g.fillStyle = '#eceeec'; g.fillRect(s / 2, 0, s / 2, s);
    g.fillStyle = '#b9bdbc'; g.fillRect(0, 0, 3, s); g.fillRect(s / 2, 0, 3, s);
  });
  t.repeat.set(.87, 1);
  return t;
}
function plateTex() {
  return tex((g, s) => {
    g.fillStyle = '#c9cecf'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#1b2023'; g.font = 'italic 800 190px Arial,sans-serif'; g.fillText('PMP', 60, 380);
    g.fillStyle = '#2f7a4a'; g.font = '700 150px Arial,sans-serif'; g.fillText('house', 520, 380);
    g.fillStyle = '#555b5e'; g.fillRect(60, 470, 900, 22); g.fillRect(60, 530, 620, 22);
  });
}
function antTex() {
  return tex((g, s) => {
    g.fillStyle = '#41484d'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++) { const x = i * s / 8; g.fillStyle = '#2e3438'; g.fillRect(x, 0, 3, s); g.fillStyle = '#566066'; g.fillRect(x + 3, 0, 3, s); }
  });
}
function woodTex() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return tex((g, s) => {
    const n = 8, w = s / n, tones = ['#a9774a', '#b98a5a', '#9d6b40', '#c0935f', '#ae7d4e'];
    for (let i = 0; i < n; i++) {
      g.fillStyle = tones[Math.floor(rnd() * tones.length)]; g.fillRect(i * w, 0, w, s);
      for (let k = 0; k < 26; k++) {
        const x = i * w + rnd() * w;
        g.strokeStyle = `rgba(70,40,18,${0.06 + rnd() * 0.14})`; g.lineWidth = 1 + rnd() * 2;
        g.beginPath(); g.moveTo(x, 0);
        g.bezierCurveTo(x + rnd() * 14 - 7, s * .3, x + rnd() * 14 - 7, s * .7, x + rnd() * 8 - 4, s);
        g.stroke();
      }
      g.fillStyle = '#5c3b20'; g.fillRect(i * w, 0, 4, s);
    }
  });
}

/* A box whose UVs are measured in metres, so ribs keep their real width on every piece. */
function box(w, h, d, mat, x = 0, y = 0, z = 0, uv0 = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4);
    const su = face < 2 ? d : w, sv = face === 2 || face === 3 ? d : h;
    uv.setXY(i, uv.getX(i) * su / 2 + uv0 / 2, uv.getY(i) * sv / 2);
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  return m;
}

function disc(rx, h, rz, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, h, 40), mat);
  m.scale.set(rx, 1, rz); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  return m;
}

/* Places openings bay by bay: posts and the bathroom split a wall into bays, and an opening can never cross a post. */
function seq(w, n, sw, reserved, blocked, frM, frPos = false, flip = false) {
  /* the customer may ask for doors and windows on the left, in the middle or on the right of a wall (seen from outside) */
  const P = w.pos || {}, side = k => { const v = P[k]; return flip && v === 'l' ? 'r' : flip && v === 'r' ? 'l' : v; };
  const list = [], sp = m => Math.ceil(m / sw);
  for (let i = 0; i < (w.pano || 0); i++) list.push({ k: 'pano', span: sp(4.5) });
  /* French doors: left/middle/right only on Premium (no fixed posts); otherwise always in the middle of their bay */
  for (let i = 0; i < w.fr; i++) list.push({ k: 'french', span: sp(frM), pos: frPos ? side('fr') : undefined });
  for (let i = 0; i < w.door; i++) list.push({ k: 'door', span: sp(.95), pos: side('door') });
  for (let i = 0; i < (w.win3 || 0); i++) list.push({ k: 'win3', span: sp(1.6) });
  for (let i = 0; i < w.win; i++) list.push({ k: 'window', span: sp(1.07), pos: side('win') });
  const bays = []; let cur = null;
  for (let i = 0; i < n; i++) {
    if (reserved.has(i)) { cur = null; continue; }
    if (!cur || blocked.has(i)) { cur = { a: i, b: i + 1, items: [] }; bays.push(cur); } else cur.b = i + 1;
  }
  bays.forEach(b => { b.free = b.b - b.a; });
  const off = b => Math.abs((b.a + b.b) / 2 - n / 2);
  for (const it of list) {
    const fit = bays.filter(b => b.free >= it.span);
    if (!fit.length) return null;
    const best = it.pos === 'l' ? fit[0] : it.pos === 'r' ? fit[fit.length - 1]
      : it.pos === 'm' ? fit.reduce((x, b) => (off(b) < off(x) ? b : x))
      : fit.reduce((x, b) => (b.free > x.free ? b : x));
    best.items.push(it); best.free -= it.span;
  }
  const out = []; let i = 0;
  const put = (k, span) => { out.push({ k, span, at: i }); i += span; };
  const panels = c => { for (let g = 0; g < c; g++) put('panel', 1); };
  for (const b of bays) {
    while (i < b.a) put('panel', 1);
    if (b.items.some(it => it.pos === 'l' || it.pos === 'r')) {
      /* left ones against the left edge of the bay, right ones against the right edge, the rest centred between them */
      const mid = b.items.filter(it => it.pos !== 'l' && it.pos !== 'r'), c = mid.length;
      const gap = c ? Math.floor(b.free / (c + 1)) : 0, lead = c ? Math.floor((b.free - gap * (c - 1)) / 2) : b.free;
      b.items.filter(it => it.pos === 'l').forEach(it => put(it.k, it.span));
      panels(lead); mid.forEach((it, x) => { if (x) panels(gap); put(it.k, it.span); }); panels(b.free - lead - gap * Math.max(0, c - 1));
      b.items.filter(it => it.pos === 'r').forEach(it => put(it.k, it.span));
    } else {
      /* a single opening with an odd number of spare cells takes one more cell, so it sits exactly in the middle */
      if (b.items.length === 1 && b.free % 2) { b.items[0].span += 1; b.free -= 1; }
      const c = b.items.length, gap = c ? Math.floor(b.free / (c + 1)) : 0, lead = c ? Math.floor((b.free - gap * (c - 1)) / 2) : 0;
      panels(lead);
      b.items.forEach((it, x) => { if (x) panels(gap); put(it.k, it.span); });
    }
    while (i < b.b) put('panel', 1);
  }
  while (i < n) put('panel', 1);
  return out;
}
const merge = cells => cells.reduce((o, c) => { const l = o[o.length - 1]; if (l && l.k === 'panel' && c.k === 'panel') l.span += c.span; else o.push({ ...c }); return o; }, []);
export const hasBath = c => !!(c.wc || c.shower);
export const slots = L => 2 * Math.max(1, Math.round((L - 2 * F) / (2 * SLOT)));
/* Economy and Standard: two fixed posts on each long side from 6 m up. Premium: posts only where the customer puts them. */
export function postsOf(c) {
  if (c.type === 'P') return c.posts || [];
  if (c.L < 6) return [];
  const n = slots(c.L), a = Math.round(n * .25);   /* a quarter of the wall from each end: French doors fit between them with a strip of wall on both sides */
  const v = braced(c);
  return [a, n - a].flatMap(i => [{ w: 'f', i, v }, { w: 'b', i, v }]);
}
/* Standard 9 x 3 m and 12 x 4 m: instead of an upright post, two flat braces run from the lifting lug down and apart, about half a metre to each side */
export const braced = c => c.type === 'K' && ((c.L === 9 && c.W === 3) || (c.L === 12 && c.W === 4));
export function layout(c) {
  const { L, W } = c, inner = L - 2 * F, innerW = W - 2 * F, ex = L / 2 - F;
  const n = slots(L), sw = inner / n;
  const m = 2 * Math.max(1, Math.round(innerW / (2 * SLOT))), sh = innerW / m;
  const bath = hasBath(c), pos = c.bathPos || 'r';
  const zone = !bath ? null : pos === 'r' ? [ex - BATH_D, ex] : pos === 'l' ? [-ex, -ex + BATH_D] : [-BATH_D / 2, BATH_D / 2];
  const segs = !zone ? [[-ex, ex]] : pos === 'r' ? [[-ex, zone[0]]] : pos === 'l' ? [[zone[1], ex]] : [[-ex, zone[0]], [zone[1], ex]];
  if (segs.some(s => s[1] - s[0] < 1)) return null;
  const extra = Math.max(0, c.rooms - segs.length), big = segs.reduce((a, s) => (s[1] - s[0] > a[1] - a[0] ? s : a));
  const parts = extra + 1, room = Math.min(...segs.map(s => (s === big ? (s[1] - s[0]) / parts : s[1] - s[0])));
  if (room < 1 || (c.kitchen && room < 1.5)) return null;
  const res = new Set();
  if (zone) for (let i = Math.floor((zone[0] + inner / 2) / sw + .001); i < Math.ceil((zone[1] + inner / 2) / sw - .001); i++) res.add(i);
  const resB = new Set([...res].map(i => n - 1 - i));
  const posts = postsOf(c);
  const bf = new Set(posts.filter(p => p.w === 'f').map(p => p.i)), bb = new Set(posts.filter(p => p.w === 'b').map(p => n - p.i));
  /* the panels under a pair of braces stay plain wall: no door or window there */
  const under = s => new Set(posts.filter(p => p.v && p.w === s).flatMap(p => { const i = s === 'f' ? p.i : n - p.i; return [i - 2, i - 1, i, i + 1]; }));
  const resF2 = new Set([...res, ...under('f')]), resB2 = new Set([...resB, ...under('b')]);
  const frM = c.type === 'P' ? 2.5 : 2.2;
  const frPos = c.type === 'P';
  let f = seq(c.w.f, n, sw, resF2, bf, frM, frPos), b = seq(c.w.b, n, sw, resB2, bb, frM, frPos), l = seq(c.w.l, m, sh, new Set(), new Set(), frM, frPos), r = seq(c.w.r, m, sh, new Set(), new Set(), frM, frPos);
  const busy = w => w.door + w.win + w.fr + (w.pano || 0) + (w.win3 || 0) > 0;
  if (!f || !b || !l || !r) return null;
  if ((bath && pos === 'r' && busy(c.w.r)) || (bath && pos === 'l' && busy(c.w.l))) return null;
  if (bath) {
    /* a bathroom always gets a small window in the rear wall, as close to its middle as the wall allows */
    const zoneIdx = [...resB].sort((x, y) => x - y), centre = (zoneIdx[0] + zoneIdx[zoneIdx.length - 1]) / 2;
    const spots = zoneIdx.filter(i => resB.has(i + 1)).sort((x, y) => Math.abs(x + .5 - centre) - Math.abs(y + .5 - centre));
    for (const idx of spots) {
      const at = b.findIndex(x => x.at === idx);
      if (b[at] && b[at + 1] && b[at].k === 'panel' && b[at + 1].k === 'panel') { b.splice(at, 2, { k: 'vent', span: 2, at: idx }); break; }
    }
  }
  f = merge(f); b = merge(b); l = merge(l); r = merge(r);
  return { n, sw, m, sh, f, b, l, r, inner, innerW, bath, zone, segs, big, parts, room, posts, pos };
}

export class Stage {
  constructor(canvas, { interactive = false } = {}) {
    this.canvas = canvas; this.interactive = interactive;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene = new THREE.Scene();
    this.scene.environment = skyEnv(this.renderer); this.scene.environmentIntensity = .8;
    this.camera = new THREE.PerspectiveCamera(26, 1, .1, 200);
    this.offset = [0, 0];

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b4ae, .55));
    const sun = this.sun = new THREE.DirectionalLight(0xfff4e6, 2.7);
    sun.position.set(-9, 15, 11); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 5;
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, far: 60 });
    this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.ShadowMaterial({ opacity: .3 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);

    this.mats = {
      frame: new THREE.MeshStandardMaterial({ color: 0x3b4149, roughness: .42, metalness: .25 }),
      white: new THREE.MeshStandardMaterial({ map: whiteTex(), roughness: .6 }),
      whiteP: new THREE.MeshStandardMaterial({ map: smoothTex(), roughness: .3, metalness: .04 }),
      roofP: new THREE.MeshStandardMaterial({ map: whiteTex(), roughness: .5, metalness: .1 }),
      plate: new THREE.MeshStandardMaterial({ map: plateTex(), roughness: .35, metalness: .3 }),
      frost: new THREE.MeshStandardMaterial({ color: 0x4a5257, roughness: .22, metalness: .3 }),
      block: new THREE.MeshStandardMaterial({ color: 0x9c9d98, roughness: .9 }),
      wood: new THREE.MeshStandardMaterial({ map: woodTex(), roughness: .7 }),
      ant: new THREE.MeshStandardMaterial({ map: antTex(), roughness: .55 }),
      bolt: new THREE.MeshStandardMaterial({ color: 0xdfe3e4, roughness: .3, metalness: .7 }),
      cast: new THREE.MeshStandardMaterial({ color: 0x15181a, roughness: .5 }),
      inner: new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: .8 }),
      lino: new THREE.MeshStandardMaterial({ color: 0xa8a08f, roughness: .7 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x8fa4ad, roughness: .03, metalness: .95, transparent: true, opacity: .66 }),
      jAnt: new THREE.MeshStandardMaterial({ color: 0x33393f, roughness: .42, metalness: .2 }),
      jWhite: new THREE.MeshStandardMaterial({ color: 0xf6f6f3, roughness: .5 }),
      san: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .25 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x24282b, roughness: .4 }),
      oak: new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: .6 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x8b9194, roughness: .7, metalness: .4 }),
      post: new THREE.MeshStandardMaterial({ color: 0xc8742a, roughness: .5, metalness: .3 }),
      steel: new THREE.MeshStandardMaterial({ color: 0xc4c9cc, roughness: .3, metalness: .6 }),
      hole: new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: .3 }),
    };
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.parts = []; this.roofs = []; this.covers = []; this.topBits = []; this.plates = [];
    this.skel = 0; this.skelTo = 0; this.t = 1; this.lift = 0; this.liftTo = 0;
    this.theta = -.62; this.phi = 1.23; this.radius = 30; this.radiusTo = 30; this.target = new THREE.Vector3(0, 1.3, 0);
    this.camTo = null; this.anim = null; this.visible = true; this.px = 0;

    if (interactive) {
      const ctl = this.controls = new OrbitControls(this.camera, canvas);
      ctl.enablePan = false; ctl.enableZoom = false; ctl.enableDamping = true; ctl.dampingFactor = .08;
      ctl.minPolarAngle = .18; ctl.maxPolarAngle = 1.52;
      canvas.style.touchAction = 'pan-y';
      ctl.addEventListener('start', () => { this.camTo = null; });
      ctl.addEventListener('change', () => { this.dirty = true; });
    }
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas.parentElement);
    this.io = new IntersectionObserver(e => { this.visible = e[0].isIntersecting; if (this.visible) this.dirty = true; }); this.io.observe(canvas);
    this.resize();
    const loop = () => { this.raf = requestAnimationFrame(loop); this.tick(); };
    loop();
  }
  /* frees the GPU and stops the render loop when Angular destroys the component */
  destroy() {
    cancelAnimationFrame(this.raf); this.ro.disconnect(); this.io.disconnect();
    if (this.controls) this.controls.dispose();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.renderer.dispose();
  }
  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.w = r.width; this.h = r.height;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    this.fit(); this.applyOffset(); this.radius = this.radiusTo; this.dirty = true;
  }
  setOffset(x, y) { this.offset = [x, y]; this.applyOffset(); this.dirty = true; }
  applyOffset() {
    const { w, h } = this;
    if (!w) return;
    this.camera.setViewOffset(w, h, -w * this.offset[0], -h * this.offset[1], w, h);
    this.camera.updateProjectionMatrix();
  }
  fit() {
    const b = this.bounds; if (!b) return;
    const r = .5 * Math.hypot(b.x, b.y, b.z);
    const vf = THREE.MathUtils.degToRad(this.camera.fov) / 2;
    const hf = Math.atan(Math.tan(vf) * this.camera.aspect);
    this.radiusTo = (r / Math.sin(Math.min(vf, hf))) * (this.fitScale || 1);
    this.target.set(0, b.y * .46, 0);
  }

  panel(c) {
    if (c.type === 'P') { if (c.color === 'white') return this.mats.whiteP; if (c.color === 'wood') return this.woodP || (this.woodP = Object.assign(this.mats.wood.clone(), { roughness: .36 })); }
    return this.mats[c.color] || this.mats.white;
  }
  joinery(c) { return c.joinery === 'white' ? this.mats.jWhite : this.mats.jAnt; }

  opening(g, w, h, ow, oh, sill, mat, join, x0) {
    const t = WT, sideW = (w - ow) / 2;
    if (sideW > .001) {
      g.add(box(sideW, h, t, mat, -w / 2 + sideW / 2, h / 2, 0, x0));
      g.add(box(sideW, h, t, mat, w / 2 - sideW / 2, h / 2, 0, x0 + sideW + ow));
    }
    if (sill > .001) g.add(box(ow, sill, t, mat, 0, sill / 2, 0, x0 + sideW));
    const top = h - sill - oh;
    if (top > .001) g.add(box(ow, top, t, mat, 0, h - top / 2, 0, x0 + sideW));
    const fr = .07, d = t + .06, cy = sill + oh / 2;
    g.add(box(ow, fr, d, join, 0, sill + fr / 2, 0));
    g.add(box(ow, fr, d, join, 0, sill + oh - fr / 2, 0));
    g.add(box(fr, oh, d, join, -ow / 2 + fr / 2, cy, 0));
    g.add(box(fr, oh, d, join, ow / 2 - fr / 2, cy, 0));
    return cy;
  }
  segment(w, kind, c) {
    const g = new THREE.Group(), mat = this.panel(c), big = kind === 'french' || kind === 'pano', join = big ? (c.frJoin === 'white' ? this.mats.jWhite : this.mats.jAnt) : this.joinery(c), h = WALL_H + .03;
    const x0 = Math.random() * 2;
    if (kind === 'panel') g.add(box(w, h, WT, mat, 0, h / 2, 0, x0));
    if (kind === 'window' || kind === 'win3' || kind === 'french' || kind === 'vent' || kind === 'pano') {
      /* French doors and panoramic windows stand on the bottom frame; the strip of wall panel stays above them */
      const frSill = 0, frOh = Math.round((WALL_H - .26) * 100) / 100;
      const [ow, oh, sill, bars] = kind === 'window' ? [.97, 1.2, .78, 1] : kind === 'win3' ? [1.5, 1.2, .78, 2]
        : kind === 'french' ? [Math.min(2.5, w - .08), frOh, frSill, 2] : kind === 'pano' ? [w - .08, frOh, frSill, 3] : [.5, .45, 1.55, 0];
      const cy = this.opening(g, w, h, ow, oh, sill, mat, join, x0);
      const gl = box(ow - .08, oh - .08, .012, this.mats.glass, 0, cy, 0);
      gl.castShadow = false; g.add(gl);
      for (let i = 1; i <= bars; i++) g.add(box(.05, oh, WT + .05, join, -ow / 2 + ow * i / (bars + 1), cy, 0));
      if (kind === 'french') g.add(box(.022, .2, .05, this.mats.bolt, -ow / 2 + ow / 3 + .07, frSill + frOh * .44, .07));
    }
    if (kind === 'door') {
      const ow = .845, oh = 1.96;
      this.opening(g, w, h, ow, oh, .02, mat, join, x0);
      g.add(box(ow - .08, oh - .07, .05, join, 0, .03 + oh / 2, .01));
      if (c.type === 'P') { g.add(box(ow - .34, 1.05, .012, this.mats.frost, 0, 1.38, .04)); g.add(box(.03, .18, .05, this.mats.bolt, ow / 2 - .15, 1, .07)); }
      else g.add(box(.12, .022, .05, this.mats.dark, ow / 2 - .17, 1.03, .06));
    }
    return g;
  }

  part(obj, a, b, s0, s1) {
    this.parts.push({ obj, a, b, s0, s1 });
    return obj;
  }
  run(group, c, cells, sw, total, ry, place, front) {
    let x = -total / 2;
    for (const s of cells) {
      const w = s.span * sw, seg = this.segment(w, s.k, c), cx = x + w / 2; x += w;
      group.add(seg);
      const idx = this.wi++, at = place(cx);
      this.part(seg,
        { p: [at[0] * .985, BASE + .05 + this.ly * .085, at[1]], r: [-Math.PI / 2, ry] },
        { p: [at[0], BASE, at[1]], r: [0, ry] }, .3 + idx * .012, .62 + idx * .012);
      const pt = this.parts[this.parts.length - 1]; pt.wall = true; if (front) pt.front = true;
    }
  }
  interior(group, c, L, W, lay) {
    const inside = new THREE.Group(); group.add(inside);
    this.anch = {}; this.anchGroup = group;
    const san = this.mats.san, inner = this.mats.inner, dark = this.mats.dark, oak = this.mats.oak, steel = this.mats.steel, hole = this.mats.hole;
    const hw = WALL_H, zb = -W / 2 + F, y0 = BASE, ex = L / 2 - F;
    const partition = (xp, dz) => {
      const dw = .8, a = dz - dw / 2 - zb, zf = W / 2 - F, c2 = zf - (dz + dw / 2);
      inside.add(box(.08, hw, a, inner, xp, y0 + hw / 2, zb + a / 2));
      inside.add(box(.08, hw, c2, inner, xp, y0 + hw / 2, zf - c2 / 2));
      inside.add(box(.08, hw - 2, dw, inner, xp, y0 + 2 + (hw - 2) / 2, dz));
      inside.add(box(.05, 2, dw - .04, oak, xp, y0 + 1, dz));
    };
    if (lay.bath) {
      const [x0, x1] = lay.zone, sgn = lay.pos === 'l' ? -1 : 1, e = sgn > 0 ? x1 : x0, xp = sgn > 0 ? x0 : x1, at = d => e - sgn * d;
      if (lay.pos !== 'l') partition(x0, W / 2 - F - .6);
      if (lay.pos !== 'r') partition(x1, W / 2 - F - .6);
      if (c.shower) {
        const sx = at(.47), sz = zb + .47;
        inside.add(box(.9, .1, .9, san, sx, y0 + .05, sz));
        inside.add(disc(.05, .012, .05, dark, sx, y0 + .105, sz));
        inside.add(box(.012, 1.9, .9, this.mats.glass, at(.94), y0 + 1.05, sz));
        inside.add(disc(.1, .02, .1, steel, at(.17), y0 + 2, sz - .3));
      }
      if (c.wc) {
        const wz = W / 2 - F - .42;
        inside.add(box(.18, .78, .4, san, at(.1), y0 + .39, wz));
        inside.add(disc(.25, .4, .19, san, at(.42), y0 + .2, wz));
        inside.add(disc(.19, .012, .13, hole, at(.42), y0 + .405, wz));
        const bz = zb + .24, bx = xp + sgn * .3;
        inside.add(box(.46, .14, .4, san, bx, y0 + .82, bz));
        inside.add(disc(.17, .012, .13, hole, bx, y0 + .895, bz));
        inside.add(box(.03, .16, .03, steel, bx - .2, y0 + .96, bz));
      }
      this.anch.bath = [(x0 + x1) / 2, y0 + .02, W / 2 - F - 1.05];
    }
    const big = lay.big, step = (big[1] - big[0]) / lay.parts;
    for (let i = 1; i < lay.parts; i++) partition(big[0] + i * step, 0);
    if (c.kitchen) {
      const seg = lay.segs[0], len = Math.min(1.8, lay.room - .3);
      const xr = lay.pos === 'l' && lay.bath ? seg[0] + .1 + len / 2 : seg[1] - .1 - len / 2;
      inside.add(box(len, .86, .6, inner, xr, y0 + .43, zb + .3));
      inside.add(box(len + .02, .04, .62, oak, xr, y0 + .88, zb + .31));
      const hx = xr - len / 4, kx = xr + len / 4, kz = zb + .3;
      inside.add(box(.56, .012, .48, dark, hx, y0 + .906, kz));
      for (const [ox, oz] of [[-.13, -.11], [.13, -.11], [-.13, .11], [.13, .11]]) inside.add(disc(.075, .004, .075, hole, hx + ox, y0 + .914, kz + oz));
      inside.add(box(.44, .012, .38, steel, kx, y0 + .906, kz));
      inside.add(box(.34, .004, .28, hole, kx, y0 + .914, kz));
      inside.add(box(.03, .18, .03, steel, kx, y0 + 1, kz - .23));
      inside.add(box(len, .6, .26, inner, xr, y0 + 1.82, zb + .13));
      this.anch.kitchen = [xr, y0 + .02, zb + .95];
    }
    this.part(inside, { s: .001 }, { s: 1 }, .84, 1);
    this.parts[this.parts.length - 1].inside = true;
  }

  module(c, L, W, pos, isTop) {
    const g = new THREE.Group(); g.position.set(...pos); this.root.add(g);
    this.wi = 0;
    const fm = this.mats.frame;
    g.add(box(L, BASE, W, fm, 0, BASE / 2, 0));
    const fl = box(L - .3, .012, W - .3, this.mats.lino, 0, BASE + .006, 0); g.add(fl);

    const lay = layout(c);
    const zF = W / 2 - .09, xR = L / 2 - .09;
    this.ly = 0; this.run(g, c, lay.f, lay.sw, lay.inner, 0, x => [x, zF], true);
    this.ly = 1; this.run(g, c, lay.b, lay.sw, lay.inner, Math.PI, x => [-x, -zF]);
    this.ly = 2; this.run(g, c, lay.r, lay.sh, lay.innerW, Math.PI / 2, x => [xR, -x]);
    this.ly = 3; this.run(g, c, lay.l, lay.sh, lay.innerW, -Math.PI / 2, x => [-xR, x]);
    const stackTop = BASE + .12 + 4 * .085;

    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const pw = c.type === 'P' ? .2 : F;
      const post = new THREE.Group(); post.add(box(pw, WALL_H, pw, fm, 0, WALL_H / 2, 0));
      g.add(post);
      const x = sx * (L / 2 - pw / 2), z = sz * (W / 2 - pw / 2);
      this.part(post, { p: [x, stackTop, z], r: [0, 0], z: sx * Math.PI / 2 }, { p: [x, BASE, z], r: [0, 0], z: 0 }, 0, .3);
      if (sz > 0) this.parts[this.parts.length - 1].front = true;
    }
    for (const p of lay.posts) {
      const post = new THREE.Group(), sz = p.w === 'f' ? 1 : -1;
      if (p.v) {
        /* two flat braces: together under the lug at the top, half a metre apart on each side at the bottom */
        const top = .05, run = 2 * lay.sw - top, len = Math.hypot(run, WALL_H);
        for (const s of [-1, 1]) { const bar = box(.085, len, .05, this.mats.post, s * (top + run / 2), WALL_H / 2, sz * (F / 2 - .03)); bar.rotation.z = s * Math.atan(run / WALL_H); post.add(bar); }
      } else post.add(box(.15, WALL_H, F, this.mats.post, 0, WALL_H / 2, 0));
      g.add(post);
      const x = -lay.inner / 2 + p.i * lay.sw, z = sz * (W / 2 - F / 2);
      this.part(post, { p: [x, BASE, z], r: [0, 0] }, { p: [x, BASE, z], r: [0, 0] }, 0, .3);
      if (p.w === 'f') this.parts[this.parts.length - 1].front = true;
    }
    /* what you see on the facade: bolted plates on Standard and Economy, corner fittings on Premium */
    if (c.type === 'P') {
      const hole = (x, y, z, ry, rx, ry2) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .012, 28).rotateX(Math.PI / 2), this.mats.cast);
        m.scale.set(rx, ry2, 1); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m;
      };
      for (const sx of [-1, 1]) for (const sz of [1, -1]) {
        const z = sz * (W / 2 + .002), x = sx * (L / 2 + .002);
        this.topBits.push(hole(sx * (L / 2 - .1), H - .11, z, 0, .04, .06), hole(x, H - .11, sz * (W / 2 - .1), Math.PI / 2, .04, .06));
        hole(sx * (L / 2 - .1), .1, z, 0, .035, .035); hole(x, .1, sz * (W / 2 - .1), Math.PI / 2, .035, .035);
      }
    } else {
      const fp = lay.posts.filter(p => p.w === 'f'), px = p => -lay.inner / 2 + p.i * lay.sw;
      /* bolted plates: at the corners, at every post, and at the feet of the braces */
      const spots = [-L / 2 + F / 2, L / 2 - F / 2].flatMap(x => [[x, BASE / 2], [x, H - ROOF / 2]]);
      for (const p of fp) { if (p.v) spots.push([px(p) - 2 * lay.sw, BASE / 2], [px(p) + 2 * lay.sw, BASE / 2]); else spots.push([px(p), BASE / 2]); }
      for (const [x, y] of spots) for (const sz of [1, -1]) for (const [ox, oy] of [[-.05, -.045], [.05, -.045], [-.05, .045], [.05, .045]]) {
        const b = box(.022, .022, .012, this.mats.bolt, x + ox, y + oy, sz * (W / 2 + .004)); b.castShadow = false; g.add(b); if (y > 1) this.topBits.push(b);
      }
    }
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(.36, .17), this.mats.plate);
    plate.position.set(L / 2 - .55, H - ROOF - .2, W / 2 - .05); g.add(plate); this.plates.push(plate);
    if (pos[1] === 0) for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) {
      const b = box(.42, .2, .3, this.mats.block, sx * (L / 2 - .2), -.08, sz * (W / 2 - .15)); g.add(b);
    }
    const roof = new THREE.Group();
    roof.add(box(L, ROOF, F, fm, 0, ROOF / 2, W / 2 - F / 2)); roof.add(box(L, ROOF, F, fm, 0, ROOF / 2, -W / 2 + F / 2));
    roof.add(box(F, ROOF, W, fm, L / 2 - F / 2, ROOF / 2, 0)); roof.add(box(F, ROOF, W, fm, -L / 2 + F / 2, ROOF / 2, 0));
    const cover = new THREE.Group();
    cover.add(box(L - 2 * F, .1, W - 2 * F, this.mats.roof, 0, ROOF - .05, 0));
    cover.add(box(L - .3, .03, W - .3, c.type === 'P' ? this.mats.roofP : this.mats.roof, 0, ROOF + .012, 0));
    roof.add(cover); this.covers.push(cover);
    if (c.type !== 'P') {
      /* lifting lugs for the crane: above the fixed posts, or near the corners on short containers without them */
      const px = lay.posts.filter(p => p.w === 'f').map(p => -lay.inner / 2 + p.i * lay.sw), xs = px.length ? px : [-L / 2 + .3, L / 2 - .3];
      for (const x of xs) for (const sz of [1, -1]) {
        /* a square plate bolted to the face of the top frame, with an ear and an eye for the crane hook standing above the roof */
        const lug = new THREE.Group(), pw = .15, eh = .075;
        lug.add(box(pw, pw, .014, fm, 0, ROOF - pw / 2, 0));
        lug.add(box(.08, eh, .014, fm, 0, ROOF + eh / 2 - .005, 0));
        const top = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .014, 28).rotateX(Math.PI / 2), fm); top.position.y = ROOF + eh - .005; top.castShadow = true; lug.add(top);
        const eye = new THREE.Mesh(new THREE.CylinderGeometry(.017, .017, .018, 20).rotateX(Math.PI / 2), this.mats.hole); eye.position.y = ROOF + eh - .003; lug.add(eye);
        for (const [ox, oy] of [[-.05, -.05], [.05, -.05], [-.05, .05], [.05, .05]]) { const b = box(.02, .02, .01, this.mats.bolt, ox, ROOF - pw / 2 + oy, sz * .009); b.castShadow = false; lug.add(b); }
        lug.position.set(x, 0, sz * (W / 2 + .007)); roof.add(lug);
      }
    }
    g.add(roof);
    this.part(roof, { p: [0, stackTop, 0] }, { p: [0, H - ROOF, 0] }, 0, .3);
    if (isTop) this.roofs.push(roof);
    this.interior(g, c, L, W, lay);
  }

  build(c) {
    const L = c.L, W = c.W;
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.root.clear(); this.parts = []; this.roofs = []; this.covers = []; this.topBits = []; this.plates = [];
    H = HEIGHT[c.type] || 2.64; BASE = c.type === 'P' ? .2 : .17; ROOF = c.type === 'P' ? .21 : .17;
    this.root.position.y = .18; WALL_H = H - BASE - ROOF;
    const n = c.count || 1, f = c.floors || 1, gapZ = W + .04, stackY = H + .02;
    for (let i = 0; i < n; i++) for (let k = 0; k < f; k++)
      this.module(c, L, W, [0, k * stackY, (i - (n - 1) / 2) * gapZ], k === f - 1);
    this.bounds = { x: L, y: f * H, z: n * W };
    this.fit();
    this.pose(); this.dirty = true;
  }
  pose() {
    for (const p of this.parts) {
      const k = ease(clamp((this.t - p.s0) / (p.s1 - p.s0)));
      const { obj: o, a, b } = p;
      if (b.s !== undefined) { const s = a.s + (b.s - a.s) * k; o.scale.setScalar(s); o.visible = k > .001 && this.skel < .5; continue; }
      o.position.set(...a.p.map((v, i) => v + (b.p[i] - v) * k));
      o.rotation.order = 'YXZ';
      if (a.r) {
        o.rotation.x = a.r[0] + (b.r[0] - a.r[0]) * k;
        o.rotation.y = a.r[1] + (b.r[1] - a.r[1]) * k;
      }
      if (a.z !== undefined) o.rotation.z = a.z * (1 - k);
      if (p.front || p.wall) {
        const cut = p.front ? 1 - .82 * this.lift : 1;  /* cutaway: the near wall drops so the room stays visible */
        o.scale.y = Math.max(.002, cut * (p.wall ? 1 - this.skel : 1));
        if (p.wall) o.visible = this.skel < .985;
      }
    }
    for (const c of this.covers) c.visible = this.skel < .5;
    for (const b of this.topBits) b.visible = this.lift < .1;
    for (const b of this.plates) b.visible = this.lift < .1 && this.skel < .5;
    this.mats.post.color.set(this.skel > .4 ? 0xc8742a : 0x3b4149);
    for (const r of this.roofs) {
      r.position.y += this.lift * 12;
      r.visible = this.lift < .45;
    }
  }
  dropIn() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const list = [...this.root.children].sort((a, b) => a.position.y - b.position.y || a.position.z - b.position.z);
    list.forEach(g => { g.userData.y0 = g.position.y; g.position.y += 14; });
    this.drop = { list, start: performance.now() + 350 };
  }
  animateTo(to, ms = 2400, done) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { this.t = to; this.pose(); this.dirty = true; done && done(); return; }
    this.anim = { from: this.t, to, ms, start: performance.now(), done };
  }
  look(theta, phi) { this.camTo = { theta, phi }; }
  syncFromCamera() {
    const d = this.camera.position.clone().sub(this.target);
    const s = new THREE.Spherical().setFromVector3(d);
    this.theta = s.theta; this.phi = s.phi;
  }
  placeTags() {
    const on = this.lift > .6 && this.t > .98, g = this.anchGroup;
    for (const k in this.tags) {
      const el = this.tags[k], a = this.anch && this.anch[k];
      if (!on || !a || !g) { el.hidden = true; continue; }
      const v = new THREE.Vector3(...a).add(g.position).project(this.camera);
      el.hidden = false;
      el.style.transform = `translate(-50%,-50%) translate(${(v.x + 1) / 2 * this.w}px,${(1 - v.y) / 2 * this.h}px)`;
    }
  }
  tick() {
    if (!this.visible) return;
    let moved = false;
    if (this.anim) {
      const a = this.anim, k = clamp((performance.now() - a.start) / a.ms);
      this.t = a.from + (a.to - a.from) * k; this.pose(); moved = true;
      if (k >= 1) { this.anim = null; a.done && a.done(); }
    }
    if (this.drop) {
      const el = performance.now() - this.drop.start; let live = false;
      this.drop.list.forEach((g, i) => {
        const k = clamp((el - i * 620) / 1050); if (k < 1) live = true;
        g.position.y = g.userData.y0 + 14 * (1 - ease(k));
      });
      moved = true; if (!live) this.drop = null;
    }
    if (Math.abs(this.skel - this.skelTo) > .002) {
      this.skel += (this.skelTo - this.skel) * .11;
      if (Math.abs(this.skel - this.skelTo) <= .002) this.skel = this.skelTo;
      this.pose(); moved = true;
    }
    if (Math.abs(this.lift - this.liftTo) > .002) {
      this.lift += (this.liftTo - this.lift) * .1;
      if (Math.abs(this.lift - this.liftTo) <= .002) this.lift = this.liftTo;
      this.pose(); moved = true;
    }
    if (Math.abs(this.radius - this.radiusTo) > .01) { this.radius += (this.radiusTo - this.radius) * .12; moved = true; }
    if (this.controls && this.placed) { this.syncFromCamera(); }
    if (this.camTo) {
      this.theta += (this.camTo.theta - this.theta) * .09;
      this.phi += (this.camTo.phi - this.phi) * .09;
      if (Math.abs(this.camTo.theta - this.theta) + Math.abs(this.camTo.phi - this.phi) < .003) this.camTo = null;
      moved = true;
    }
    const pos = new THREE.Vector3().setFromSphericalCoords(this.radius, this.phi, this.theta + this.px).add(this.target);
    if (moved || this.dirty || !this.placed) {
      this.camera.position.copy(pos);
      this.placed = true;
      if (this.controls) { this.controls.target.copy(this.target); }
      else this.camera.lookAt(this.target);
    }
    if (this.controls) this.controls.update();
    if (moved || this.dirty) { this.renderer.render(this.scene, this.camera); this.dirty = false; if (this.tags) this.placeTags(); }
  }
}
