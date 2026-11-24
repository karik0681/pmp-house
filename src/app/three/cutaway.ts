import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Cut-away 3D model of a 6 × 3 m container: bolted galvanised frame, sandwich walls (sheet, PUR, sheet),
 * ribbed roof, steel floor frame, fibre-cement board and vinyl. Numbered markers sit on the model and
 * hide when the part is behind something; a magnifier shows the bolted corner joint close up.
 */
const L = 6, W = 3, H = 2.6, P = 0.14, T = 0.085, S = 0.004, RT = 0.12;

/** marker anchors in model space, same order as the layer list */
export const CUT_ANCHORS: [number, number, number][] = [
  [4.5, H - 0.08, W + 0.08],
  [L + 0.12, H - 0.11, W + 0.12],
  [3.45, 0.225, 1.7],
  [0.28, 0.75, W],
  [0.95, 2.05, W],
  [1.5, H + 0.2, 1.2],
];
/** camera for each layer: point to look at (model space), direction to it, share of the full-view distance */
const VIEWS: { t: [number, number, number]; d: [number, number, number]; k: number }[] = [
  { t: [3, 1.4, 1.5], d: [1, 0.55, 1.1], k: 0.95 },
  { t: [L, H - 0.1, W], d: [1, 0.45, 1], k: 0.42 },
  { t: [3.9, 0.2, 1.5], d: [0.9, 1.15, 0.85], k: 0.62 },
  { t: [1.2, 1.3, W], d: [0.35, 0.3, 1], k: 0.55 },
  { t: [1.6, 1.45, W], d: [-0.1, 0.15, 1], k: 0.5 },
  { t: [1.6, H + 0.06, 1.4], d: [0.45, 1.35, 0.75], k: 0.68 },
];
const HOME = { t: [3, 0.88, 1.5] as [number, number, number], d: [9.5, 5.2, 10.5] as [number, number, number], k: 1 };
/** markers that make sense on the closed container (floor is hidden there) */
const FULL_OK = [0, 1, 3, 4, 5];

export class Cutaway {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  private ctl: OrbitControls;
  private root = new THREE.Group();
  private fullOnly: THREE.Object3D[] = [];
  private ray = new THREE.Raycaster();
  private v = new THREE.Vector3();
  private wp = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private rt = new THREE.WebGLRenderTarget(512, 512, { samples: 4 });
  private zcam = new THREE.PerspectiveCamera(30, 1, 0.02, 20);
  private ztarget = new THREE.Vector3();
  private ov = new THREE.Scene();
  private ocam = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
  private lens = new THREE.Group();
  private lineG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private running = false;
  private disposables: { dispose(): void }[] = [];
  cut = true;
  lensOn = false;
  active = -1;
  private lensBox: { x: number; y: number; r: number } | null = null;
  private bg = new THREE.Color(0xf1f4f1);
  private fit = 14;
  private goT = new THREE.Vector3();
  private goP = new THREE.Vector3();
  private flying = false;
  private lastT = 0;

  constructor(private canvas: HTMLCanvasElement, private markers: HTMLElement[]) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.cam.position.set(9.5, 6.2, 10.5);
    const ctl = this.ctl = new OrbitControls(this.cam, canvas);
    ctl.target.set(0, 1.0, 0); ctl.enableDamping = true; ctl.enableZoom = false; ctl.enablePan = false;
    ctl.maxPolarAngle = Math.PI * 0.49; ctl.minPolarAngle = Math.PI * 0.12;
    /* on touch: a sideways swipe with one finger turns the model,
       an up/down swipe still scrolls the page (touch-action: pan-y) */
    ctl.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
    canvas.style.touchAction = 'pan-y';
    ctl.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches; ctl.autoRotateSpeed = 0.35;
    canvas.addEventListener('pointerdown', () => { ctl.autoRotate = false; this.flying = false; });

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f88, 0.9));
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.4);
    sun.position.set(6, 10, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 }); sun.shadow.bias = -0.0004;
    this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);

    this.root.position.set(-3, 0.12, -1.5); this.scene.add(this.root);
    this.build();
    this.ztarget.set(L + 0.05, H - 0.17, W + 0.05).add(this.root.position);
    this.buildLens();

    const sec = canvas.closest('section'); if (sec) { const c = getComputedStyle(sec).backgroundColor; if (c && !c.startsWith('rgba(0, 0, 0, 0')) this.bg.setStyle(c); }
    this.ro = new ResizeObserver(() => this.size()); this.ro.observe(canvas);
    this.io = new IntersectionObserver(es => es[0].isIntersecting ? this.start() : this.stop(), { rootMargin: '100px' });
    this.io.observe(canvas);
    this.size();
  }

  setCut(c: boolean) { this.cut = c; this.fullOnly.forEach(g => g.visible = !c); }
  setActive(i: number) {
    this.active = i; this.lensOn = i === 1;
    this.ctl.autoRotate = false;
    const v = VIEWS[i] ?? HOME, o = this.root.position;
    this.goT.set(v.t[0], v.t[1], v.t[2]).add(o);
    this.goP.set(v.d[0], v.d[1], v.d[2]).normalize().multiplyScalar(this.fit * v.k).add(this.goT);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { this.ctl.target.copy(this.goT); this.cam.position.copy(this.goP); this.flying = false; }
    else { this.flying = true; this.lastT = 0; }
  }

  private start() { if (this.running) return; this.running = true; this.renderer.setAnimationLoop(() => this.frame()); }
  private stop() { this.running = false; this.renderer.setAnimationLoop(null); }

  private size() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.fov = 32;
    this.cam.updateProjectionMatrix();
    /* keep the whole container in view whatever the shape of the box */
    const vf = THREE.MathUtils.degToRad(32), hf = 2 * Math.atan(Math.tan(vf / 2) * this.cam.aspect);
    const dist = this.fit = 3.75 / Math.sin(Math.min(vf, hf) / 2);
    if (this.active >= 0) return;
    const d = this.v.copy(this.cam.position).sub(this.ctl.target).normalize();
    this.cam.position.copy(this.ctl.target).addScaledVector(d, dist);
    this.ocam.right = w; this.ocam.top = h; this.ocam.updateProjectionMatrix();
  }

  private frame() {
    if (this.flying) {
      const now = performance.now(), dt = Math.min(0.1, (now - (this.lastT || now)) / 1000); this.lastT = now;
      const a = 1 - Math.exp(-dt * 4.5);
      this.ctl.target.lerp(this.goT, a); this.cam.position.lerp(this.goP, a);
      if (this.cam.position.distanceTo(this.goP) < 0.01) this.flying = false;
    }
    this.ctl.update();
    this.renderer.render(this.scene, this.cam);
    this.lensBox = null;
    if (this.lensOn) this.drawLens();
    this.place();
  }

  /* ---------- markers ---------- */
  private place() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    CUT_ANCHORS.forEach((a, i) => {
      const el = this.markers[i]; if (!el) return;
      this.wp.set(a[0], a[1], a[2]).add(this.root.position);
      let vis = this.cut || FULL_OK.includes(i);
      if (vis) {
        this.dir.copy(this.wp).sub(this.cam.position); const dist = this.dir.length();
        this.ray.set(this.cam.position, this.dir.normalize()); this.ray.far = dist;
        const hit = this.ray.intersectObject(this.root, true).find(x => x.object.visible && x.object.parent!.visible);
        if (hit && hit.distance < dist - 0.18) vis = false;
      }
      this.v.copy(this.wp).project(this.cam);
      const sx = (this.v.x + 1) / 2 * w, sy = (1 - this.v.y) / 2 * h;
      if (sx < 8 || sx > w - 8 || sy < 8 || sy > h - 8) vis = false;
      const lb = this.lensBox;
      if (lb && i !== 1 && Math.hypot(sx - lb.x, sy - lb.y) < lb.r + 14) vis = false;
      const wide = i === this.active ? el.offsetWidth : 26, left = sx + wide - 13 > w - 4;
      el.classList.toggle('left', left);
      el.style.transform = `translate(${left ? sx - wide + 26 : sx}px,${sy}px)`;
      el.classList.toggle('hid', !vis);
    });
  }

  /* ---------- magnifier ---------- */
  private buildLens() {
    const basic = (c: number) => new THREE.MeshBasicMaterial({ color: c });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ map: this.rt.texture }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.09, 64), basic(0x4a3526)); ring.position.z = 0.01;
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.09, 1.12, 64), basic(0x8a6a4e)); ring2.position.z = 0.01;
    const handle = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.2), basic(0x3a2a1f)); handle.position.set(0.95, -1.45, 0); handle.rotation.z = 0.72;
    const collar = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), basic(0x8a8d90)); collar.position.set(0.72, -1.18, 0.005); collar.rotation.z = 0.72;
    this.lens.add(disc, ring, ring2, handle, collar); this.ov.add(this.lens);
    this.ov.add(new THREE.Line(this.lineG, new THREE.LineBasicMaterial({ color: 0x4a3526 })));
  }

  private drawLens() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, r = this.renderer;
    const zd = this.v.copy(this.cam.position).sub(this.ztarget).normalize();
    this.zcam.position.copy(this.ztarget).addScaledVector(zd, 0.7); this.zcam.lookAt(this.ztarget);
    r.setClearColor(this.bg, 1); r.setRenderTarget(this.rt); r.clear(); r.render(this.scene, this.zcam);
    r.setRenderTarget(null); r.setClearColor(0x000000, 0);
    const rad = Math.min(w, h) * (w < 520 ? 0.17 : 0.15);
    this.v.copy(this.ztarget).project(this.cam);
    const tx = (this.v.x + 1) / 2 * w, ty = (this.v.y + 1) / 2 * h;
    const lx = Math.min(w - rad * 1.25, Math.max(rad * 1.25, tx + rad * 1.6));
    const ly = Math.max(rad * 2.2, Math.min(h - rad * 1.2, ty + rad * 0.9));
    this.lens.position.set(lx, ly, 0); this.lens.scale.setScalar(rad);
    this.lensBox = { x: lx, y: h - ly, r: rad * 1.15 };
    const p = this.lineG.attributes['position'] as THREE.BufferAttribute;
    const ang = Math.atan2(ty - ly, tx - lx);
    p.setXYZ(0, tx, ty, 0); p.setXYZ(1, lx + Math.cos(ang) * rad * 1.1, ly + Math.sin(ang) * rad * 1.1, 0); p.needsUpdate = true;
    r.autoClear = false; r.clearDepth(); r.render(this.ov, this.ocam); r.autoClear = true;
  }

  /* ---------- model ---------- */
  private build() {
    const root = this.root;
    const keep = <X extends { dispose(): void }>(x: X) => (this.disposables.push(x), x);
    const std = (o: THREE.MeshStandardMaterialParameters) => keep(new THREE.MeshStandardMaterial(o));
    const sheetBump = keep(sheetTex());
    const M = {
      frame: std({ color: 0xa58e6b, metalness: 0.55, roughness: 0.42 }),
      frameD: std({ color: 0x7d6a4e, metalness: 0.5, roughness: 0.5 }),
      galv: std({ color: 0xb9bdc0, metalness: 0.9, roughness: 0.3 }),
      sheet: std({ color: 0xf1eee4, metalness: 0.3, roughness: 0.48, bumpMap: sheetBump, bumpScale: 0.6 }),
      roofSheet: std({ color: 0xeeebe2, metalness: 0.4, roughness: 0.42 }),
      groove: std({ color: 0x8d887c, roughness: 0.7 }),
      pur: std({ map: keep(foamTex()), roughness: 0.95 }),
      joint: std({ color: 0xcfcabd, metalness: 0.2, roughness: 0.6 }),
      joist: std({ color: 0x5e6366, metalness: 0.6, roughness: 0.45 }),
      cement: std({ color: 0xa9a69e, roughness: 0.95 }),
      vinyl: std({ map: keep(planks()), roughness: 0.55 }),
      pvc: std({ color: 0xfafafa, roughness: 0.35 }),
      glass: keep(new THREE.MeshPhysicalMaterial({ color: 0x8fb8ad, roughness: 0.05, transmission: 0.55, transparent: true, opacity: 0.55 })),
      door: std({ color: 0xeeebe3, metalness: 0.3, roughness: 0.45 }),
      hole: std({ color: 0x2a241c, roughness: 0.9 }),
      steel: std({ color: 0x8a8d90, metalness: 1, roughness: 0.25 }),
      foot: std({ color: 0x9a9a96, roughness: 0.9 }),
    };
    const geos = new Map<string, THREE.BoxGeometry>();
    const box = (sx: number, sy: number, sz: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D = root) => {
      const k = `${sx}|${sy}|${sz}`;
      let g = geos.get(k); if (!g) { g = keep(new THREE.BoxGeometry(sx, sy, sz)); geos.set(k, g); }
      const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
    };

    /* corners: the post continues into a corner piece of the same colour, with bolt holes (no bolts shown) */
    const holeGeo = keep(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 20));
    const hole = (x: number, y: number, z: number, ax: 'x' | 'z') => {
      const m = new THREE.Mesh(holeGeo, M.hole);
      if (ax === 'x') m.rotation.z = Math.PI / 2; else m.rotation.x = Math.PI / 2;
      m.position.set(x, y, z); root.add(m);
    };
    /* 2 holes, one above the other, on each outer face of the post at its top and at its bottom */
    const corner = (x: number, top: boolean, z: number) => {
      const sx = x < 1 ? -1 : 1, sz = z < 1 ? -1 : 1, fz = z + sz * (P / 2 + 0.0015), fx = x + sx * (P / 2 + 0.0015);
      for (let r = 0; r < 2; r++) {
        const y = top ? H - 0.06 - r * 0.07 : 0.06 + r * 0.07;
        hole(x - sx * 0.035, y, fz, 'z'); hole(fx, y, z - sz * 0.035, 'x');
      }
    };
    for (const x of [0, L]) for (const z of [0, W]) {
      box(0.3, 0.12, 0.3, x, -0.06, z, M.foot); box(P, H, P, x, H / 2, z, M.frame);
      box(0.02, H - 0.62, 0.004, x + (x < 1 ? -1 : 1) * 0.03, H / 2, z + (z < 1 ? -1 : 1) * (P / 2 + 0.002), M.frameD);
      corner(x, true, z); corner(x, false, z);
    }
    for (const y of [0.1, H - 0.08]) {
      const hh = y < 1 ? 0.2 : 0.16;
      for (const z of [0, W]) { box(L, hh, P, L / 2, y, z, M.frame); box(L - 0.6, 0.025, 0.004, L / 2, y, z + (z < 1 ? -1 : 1) * (P / 2 + 0.002), M.frameD); }
      for (const x of [0, L]) { box(P, hh, W, x, y, W / 2, M.frame); box(0.004, 0.025, W - 0.6, x + (x < 1 ? -1 : 1) * (P / 2 + 0.002), y, W / 2, M.frameD); }
    }

    /* floor */
    for (let x = 0.6; x < L; x += 0.6) box(0.07, 0.12, W - 0.1, x, 0.12, W / 2, M.joist);
    box(L - 0.1, 0.1, 0.07, L / 2, 0.12, W / 2, M.joist);
    box(4.4, 0.014, W - 0.1, 2.25, 0.205, W / 2, M.cement);
    box(3.6, 0.008, W - 0.12, 1.85, 0.216, W / 2, M.vinyl);

    /* sandwich walls */
    const sandwich = (x0: number, x1: number, y0: number, y1: number, z: number, out: number, parent: THREE.Object3D = root) => {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sx = x1 - x0, sy = y1 - y0;
      box(sx, sy, S, cx, cy, z + out * (T / 2 - S / 2), M.sheet, parent); box(sx, sy, T - 2 * S, cx, cy, z, M.pur, parent); box(sx, sy, S, cx, cy, z - out * (T / 2 - S / 2), M.sheet, parent);
      for (let jx = Math.ceil(x0 + 0.01); jx < x1 - 0.05; jx += 1) {
        const zz = z + out * (T / 2); box(0.034, sy, 0.007, jx, cy, zz + out * 0.0035, M.joint, parent);
        for (const d of [-0.021, 0.021]) box(0.004, sy, 0.003, jx + d, cy, zz + out * 0.0012, M.groove, parent);
      }
    };
    const sandwichZ = (z0: number, z1: number, y0: number, y1: number, x: number, out: number, parent: THREE.Object3D = root) => {
      const cz = (z0 + z1) / 2, cy = (y0 + y1) / 2, sz = z1 - z0, sy = y1 - y0;
      box(S, sy, sz, x + out * (T / 2 - S / 2), cy, cz, M.sheet, parent); box(T - 2 * S, sy, sz, x, cy, cz, M.pur, parent); box(S, sy, sz, x - out * (T / 2 - S / 2), cy, cz, M.sheet, parent);
      for (let jz = 1; jz < z1 - 0.05; jz += 1) {
        const xx = x + out * (T / 2); box(0.007, sy, 0.034, xx + out * 0.0035, cy, jz, M.joint, parent);
        for (const d of [-0.021, 0.021]) box(0.003, sy, 0.004, xx + out * 0.0012, cy, jz + d, M.groove, parent);
      }
    };
    const y0 = 0.21, y1 = H - 0.16, zb = 0.06, zf = W - 0.06;
    sandwich(0.07, L - 0.07, y0, y1, zb, -1);
    sandwichZ(0.07, W - 0.07, y0, y1, 0.06, -1);

    const front = new THREE.Group(); root.add(front);
    sandwich(0.07, 0.5, y0, y1, zf, 1, front); sandwich(0.5, 1.4, y0, 1.0, zf, 1, front); sandwich(0.5, 1.4, 2.0, y1, zf, 1, front);
    sandwich(1.4, 1.9, y0, y1, zf, 1, front); sandwich(1.9, 2.8, 2.1, y1, zf, 1, front); sandwich(2.8, 2.93, y0, y1, zf, 1, front);
    const win = new THREE.Group(); front.add(win);
    box(0.9, 0.07, 0.08, 0.95, 1.035, zf, M.pvc, win); box(0.9, 0.07, 0.08, 0.95, 1.965, zf, M.pvc, win);
    box(0.07, 1.0, 0.08, 0.535, 1.5, zf, M.pvc, win); box(0.07, 1.0, 0.08, 1.365, 1.5, zf, M.pvc, win); box(0.06, 0.9, 0.07, 0.95, 1.5, zf, M.pvc, win);
    box(0.76, 0.86, 0.012, 0.95, 1.5, zf, M.glass, win); box(0.95, 0.04, 0.16, 0.95, 0.99, zf + 0.05, M.pvc, win);
    box(0.9, 1.89, 0.045, 2.35, 0.21 + 0.945, zf, M.door, front);
    for (let i = 0; i < 2; i++) box(0.7, 0.7, 0.006, 2.35, 0.65 + i * 0.85, zf + 0.025, M.door, front);
    box(0.14, 0.025, 0.05, 2.12, 1.12, zf + 0.045, M.steel, front); box(0.04, 0.12, 0.012, 2.08, 1.1, zf + 0.026, M.steel, front);
    const frontFull = new THREE.Group(); root.add(frontFull); this.fullOnly.push(frontFull);
    sandwich(3.07, L - 0.07, y0, y1, zf, 1, frontFull);
    const winB = win.clone(); winB.position.x = 2.6; frontFull.add(winB);
    const endFull = new THREE.Group(); root.add(endFull); this.fullOnly.push(endFull);
    sandwichZ(0.07, W - 0.07, y0, y1, L - 0.06, 1, endFull);

    /* roof */
    const trap = (b: number, t: number, h: number, len: number) => {
      const sh = new THREE.Shape(); sh.moveTo(-b / 2, 0); sh.lineTo(-t / 2, h); sh.lineTo(t / 2, h); sh.lineTo(b / 2, 0); sh.lineTo(-b / 2, 0);
      return keep(new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }));
    };
    const ribG = trap(0.075, 0.028, 0.036, W + 0.08), capG = trap(0.11, 0.04, 0.052, W + 0.1);
    const rib = (g: THREE.Object3D, geo: THREE.BufferGeometry, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, M.roofSheet); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m);
    };
    const roof = (x0: number, x1: number) => {
      const g = new THREE.Group(); root.add(g);
      const b0 = H + 0.002, top = b0 + RT + 2 * S;
      box(x1 - x0, S, W + 0.08, (x0 + x1) / 2, b0 + S / 2, W / 2, M.sheet, g);
      box(x1 - x0, RT, W + 0.08, (x0 + x1) / 2, b0 + S + RT / 2, W / 2, M.pur, g);
      box(x1 - x0, S, W + 0.08, (x0 + x1) / 2, top - S / 2, W / 2, M.sheet, g);
      for (let px = x0; px < x1 - 0.01; px += 1) for (const r of [0.25, 0.5, 0.75]) rib(g, ribG, px + r, top, -0.04);
      for (let px = x0 + 1; px < x1 - 0.01; px += 1) rib(g, capG, px, top, -0.05);
      return g;
    };
    roof(0, 3); this.fullOnly.push(roof(3, L));
    this.setCut(true);
  }

  destroy() {
    this.stop(); this.ro.disconnect(); this.io.disconnect(); this.ctl.dispose();
    this.disposables.forEach(d => d.dispose()); this.rt.dispose();
    this.scene.environment?.dispose(); this.renderer.dispose();
  }
}

function sheetTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = '#808080'; g.fillRect(0, 0, 64, 512);
  for (let y = 0; y < 512; y += 16) { g.fillStyle = '#b8b8b8'; g.fillRect(0, y, 64, 5); g.fillStyle = '#5a5a5a'; g.fillRect(0, y + 5, 64, 2); }
  const d = g.getImageData(0, 0, 64, 512);
  for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - .5) * 26; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 10); return t;
}
function foamTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!;
  g.fillStyle = '#efc85a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = Math.random() < .5 ? 'rgba(160,110,20,.25)' : 'rgba(255,240,180,.35)';
    g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 0.6 + Math.random() * 2.2, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function planks() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d')!;
  const tones = ['#8a5a36', '#7a4d2c', '#94623b', '#83552f', '#9b6a42'];
  for (let r = 0; r < 8; r++) {
    let x = -(r * 97 % 300);
    while (x < 1024) {
      const w = 260 + ((r * 7 + x) % 5) * 40; g.fillStyle = tones[(r * 3 + Math.abs(x)) % 5]; g.fillRect(x, r * 128, w, 128);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = 'rgba(40,20,10,' + (0.06 + ((k * 13 + r) % 5) * 0.02) + ')'; g.lineWidth = 1 + (k % 3);
        g.beginPath(); const y = r * 128 + 8 + k * 8.5; g.moveTo(x, y); g.bezierCurveTo(x + w * .3, y + 3, x + w * .6, y - 3, x + w, y + 1); g.stroke();
      }
      g.fillStyle = 'rgba(30,15,5,.55)'; g.fillRect(x, r * 128, 2, 128); x += w;
    }
    g.fillStyle = 'rgba(30,15,5,.6)'; g.fillRect(0, r * 128, 1024, 2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 0.8); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
