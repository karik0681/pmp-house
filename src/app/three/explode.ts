// @ts-nocheck
/* Exploded view: what a container is made of. Seven layers move apart as `amount` goes 0 → 1. */
import * as THREE from 'three';
import { skyEnv } from './stage';

const L = 6, W = 2.6, H = 2.7, BASE = .2, TOP = .2, POST = .16, WALL_T = .07;
const WH = H - BASE - TOP;                       /* wall height */
const ease = t => t * t * (3 - 2 * t);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m;
}
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);

export class Exploded {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
    const s = this.scene = new THREE.Scene();
    s.environment = skyEnv(r); s.environmentIntensity = .75;
    s.add(new THREE.HemisphereLight(0xffffff, 0xb9b4ae, .6));
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.4);
    sun.position.set(-8, 16, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.radius = 4;
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 12, bottom: -10, far: 50 });
    s.add(sun);
    const ground = mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: .25 }));
    ground.rotation.x = -Math.PI / 2; ground.castShadow = false; s.add(ground);
    this.camera = new THREE.PerspectiveCamera(28, 1, .1, 200);
    this.theta = -.62; this.phi = 1.13; this.radius = 22; this.target = new THREE.Vector3(0, 3.1, 0);
    this.amount = 0; this.dirty = true; this.visible = true;
    this.build();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas.parentElement);
    this.io = new IntersectionObserver(e => { this.visible = e[0].isIntersecting; if (this.visible) this.dirty = true; }); this.io.observe(canvas);
    this.resize();
    const loop = () => { this.raf = requestAnimationFrame(loop); if (this.visible && this.dirty) this.render(); };
    loop();
  }

  build() {
    const M = this.mats = {
      frame: new THREE.MeshStandardMaterial({ color: 0x3b4149, roughness: .42, metalness: .3 }),
      post: new THREE.MeshStandardMaterial({ color: 0xc8742a, roughness: .5, metalness: .3 }),
      sheet: new THREE.MeshStandardMaterial({ color: 0xf1f2ef, roughness: .45, metalness: .15 }),
      core: new THREE.MeshStandardMaterial({ color: 0xf0cf6b, roughness: .9 }),
      wool: new THREE.MeshStandardMaterial({ color: 0xe7c45a, roughness: 1 }),
      board: new THREE.MeshStandardMaterial({ color: 0xb8b3a8, roughness: .85 }),
      pvc: new THREE.MeshStandardMaterial({ color: 0xa79b86, roughness: .6 }),
      eps: new THREE.MeshStandardMaterial({ color: 0xe9eef0, roughness: .95 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x9aa1a5, roughness: .45, metalness: .55 }),
      pvcFrame: new THREE.MeshStandardMaterial({ color: 0xf7f7f4, roughness: .4 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x8fa4ad, roughness: .03, metalness: .9, transparent: true, opacity: .62 }),
      door: new THREE.MeshStandardMaterial({ color: 0x4a5056, roughness: .45, metalness: .3 }),
      block: new THREE.MeshStandardMaterial({ color: 0x9c9d98, roughness: .9 }),
    };
    this.dark = new THREE.Color(0x3b4149); this.orange = new THREE.Color(0xc8742a);
    const root = this.root = new THREE.Group(); root.position.y = .18; this.scene.add(root);
    /* foundation pads stay on the ground */
    for (const x of [-L / 2 + .25, 0, L / 2 - .25]) for (const z of [-W / 2 + .2, W / 2 - .2]) root.add(box(.42, .2, .3, M.block, x, -.08, z));

    this.layers = [];
    const layer = move => { const g = new THREE.Group(); root.add(g); this.layers.push({ g, move }); return g; };
    /* an invisible point on a part: the numbered tag follows it */
    const pin = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); this.layers[this.layers.length - 1].pin = o; };
    const postsX = [-1, 1];

    /* 1 base frame: perimeter beams, joists, corner castings */
    const base = layer([0, 0, 0]); pin(base, L / 2 - .4, BASE, W / 2);
    base.add(box(L, BASE, .16, M.frame, 0, BASE / 2, W / 2 - .08), box(L, BASE, .16, M.frame, 0, BASE / 2, -W / 2 + .08));
    base.add(box(.16, BASE, W - .32, M.frame, L / 2 - .08, BASE / 2, 0), box(.16, BASE, W - .32, M.frame, -L / 2 + .08, BASE / 2, 0));
    for (let i = 1; i < 6; i++) base.add(box(.08, BASE * .7, W - .32, M.frame, -L / 2 + i * L / 6, BASE * .35, 0));

    /* 2 floor: insulation, board, PVC */
    const floor = layer([0, 1.05, 0]); pin(floor, -L / 4, BASE + .05, W / 2 - .3);
    floor.add(box(L - .34, .1, W - .34, M.wool, 0, BASE - .05, 0));
    floor.add(box(L - .3, .025, W - .3, M.board, 0, BASE + .02, 0));
    floor.add(box(L - .3, .01, W - .3, M.pvc, 0, BASE + .04, 0));

    /* 3 posts: four corners and two in each long wall */
    const posts = layer([0, 2.1, 0]); pin(posts, -L / 2 + .08, BASE + WH * .75, W / 2 - .08);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) posts.add(box(POST, WH, POST, M.frame, sx * (L / 2 - POST / 2), BASE + WH / 2, sz * (W / 2 - POST / 2)));
    for (const x of postsX) for (const sz of [-1, 1]) posts.add(box(.12, WH, .12, M.post, x, BASE + WH / 2, sz * (W / 2 - .06)));

    /* 4 sandwich walls: steel sheet, foam core, steel sheet, with openings for the windows and the door */
    const walls = layer([0, 2.1, 0]);
    this.wallMove = [];
    const sandwich = (w, h) => {
      const g = new THREE.Group();
      g.add(box(w, h, .008, M.sheet, 0, 0, WALL_T / 2 - .004));
      g.add(box(w - .02, h - .02, WALL_T - .016, M.core, 0, 0, 0));
      g.add(box(w, h, .008, M.sheet, 0, 0, -WALL_T / 2 + .004));
      return g;
    };
    /* a long wall: three bays between posts, each with an optional opening */
    const longWall = (sign, openings) => {
      const g = new THREE.Group(); walls.add(g);
      const bays = [[-L / 2 + POST, -1.06], [-.94, .94], [1.06, L / 2 - POST]];
      bays.forEach(([a, b], i) => {
        const w = b - a, cx = (a + b) / 2, o = openings[i];
        if (!o) { const p = sandwich(w, WH); p.position.set(cx, BASE + WH / 2, 0); g.add(p); return; }
        const [ow, oh, sill] = o, side = (w - ow) / 2;
        const add = (pw, ph, x, y) => { const p = sandwich(pw, ph); p.position.set(x, y, 0); g.add(p); };
        add(side, WH, a + side / 2, BASE + WH / 2); add(side, WH, b - side / 2, BASE + WH / 2);
        if (sill > 0) add(ow, sill, cx, BASE + sill / 2);
        add(ow, WH - sill - oh, cx, BASE + sill + oh + (WH - sill - oh) / 2);
      });
      g.position.z = sign * (W / 2 - WALL_T / 2 - .02);
      if (sign < 0) g.rotation.y = Math.PI;
      this.wallMove.push({ g, d: [0, 0, sign * 1.5], z0: g.position.z, x0: 0 });
    };
    longWall(1, [[1.1, 1.2, .9], [.95, 2.05, 0], [1.1, 1.2, .9]]);
    longWall(-1, [null, [1.1, 1.2, .9], null]);
    for (const sx of [-1, 1]) {
      const p = sandwich(W - 2 * POST, WH); p.rotation.y = Math.PI / 2;
      const x = sx * (L / 2 - WALL_T / 2 - .02); p.position.set(x, BASE + WH / 2, 0); walls.add(p);
      this.wallMove.push({ g: p, d: [sx * 1.5, 0, 0], z0: 0, x0: x });
      if (sx > 0) pin(p, .2, .35, 0);
    }

    /* 5 windows and the door, which fly out further than the walls */
    const open = layer([0, 2.1, 0]);
    this.openMove = [];
    const windowAt = (x, z, rot, ow = 1.1, oh = 1.2, sill = .9) => {
      const g = new THREE.Group();
      const t = .07;
      g.add(box(ow, t, .1, M.pvcFrame, 0, oh / 2 - t / 2, 0), box(ow, t, .1, M.pvcFrame, 0, -oh / 2 + t / 2, 0));
      g.add(box(t, oh, .1, M.pvcFrame, -ow / 2 + t / 2, 0, 0), box(t, oh, .1, M.pvcFrame, ow / 2 - t / 2, 0, 0), box(.05, oh, .1, M.pvcFrame, 0, 0, 0));
      g.add(box(ow - .12, oh - .12, .02, M.glass));
      g.position.set(x, BASE + sill + oh / 2, z); g.rotation.y = rot; open.add(g);
      this.openMove.push({ g, p0: g.position.clone(), d: new THREE.Vector3(0, 0, Math.cos(rot) * 2.7) });
    };
    windowAt(-2.03, W / 2 - .04, 0); windowAt(2.03, W / 2 - .04, 0); windowAt(0, -W / 2 + .04, Math.PI);
    const door = new THREE.Group();
    door.add(box(.95, 2.05, .06, M.door, 0, 0, 0));
    door.add(box(.14, .03, .05, M.sheet, .32, -.05, .05));
    door.position.set(0, BASE + 2.05 / 2, W / 2 - .04); open.add(door); pin(door, 0, .35, .05);
    this.openMove.push({ g: door, p0: door.position.clone(), d: new THREE.Vector3(0, 0, 2.7) });

    /* 6 top frame and insulated ceiling */
    const top = layer([0, 4.1, 0]); pin(top, L / 2 - .5, H, W / 2);
    top.add(box(L, TOP, .16, M.frame, 0, H - TOP / 2, W / 2 - .08), box(L, TOP, .16, M.frame, 0, H - TOP / 2, -W / 2 + .08));
    top.add(box(.16, TOP, W - .32, M.frame, L / 2 - .08, H - TOP / 2, 0), box(.16, TOP, W - .32, M.frame, -L / 2 + .08, H - TOP / 2, 0));
    const ceil = new THREE.Group(); top.add(ceil);
    ceil.add(box(L - .34, .012, W - .34, M.sheet, 0, H - TOP + .006, 0));
    ceil.add(box(L - .36, .12, W - .36, M.eps, 0, H - TOP + .072, 0));
    this.ceil = ceil;

    /* 7 roof: profiled sheet */
    const roof = layer([0, 5.4, 0]); pin(roof, L / 4, H + .06, -W / 4);
    roof.add(box(L - .1, .015, W - .1, M.roof, 0, H + .01, 0));
    for (let z = -W / 2 + .2; z < W / 2 - .1; z += .26) roof.add(box(L - .1, .045, .07, M.roof, 0, H + .035, z));
  }

  /** 0 = assembled, 1 = fully apart. Layers start one after another. */
  setAmount(a) {
    this.amount = a;
    const n = this.layers.length;
    this.layers.forEach((l, i) => {
      /* the top comes off first, so nothing passes through anything else */
      const k = ease(clamp((a - (n - 1 - i) * .07) / .55));
      l.k = k;
      l.g.position.set(l.move[0] * k, l.move[1] * k, l.move[2] * k);
    });
    const kw = this.layers[3].k, ko = this.layers[4].k;
    for (const m of this.wallMove) {
      if (m.d[2]) m.g.position.z = m.z0 + m.d[2] * kw; else m.g.position.x = m.x0 + m.d[0] * kw;
    }
    for (const m of this.openMove) m.g.position.copy(m.p0).addScaledVector(m.d, ko);
    this.ceil.position.y = .55 * this.layers[5].k;
    /* the extra posts turn orange as they come apart, so they are easy to spot */
    this.mats.post.color.copy(this.dark).lerp(this.orange, this.layers[2].k);      /* the ceiling lifts off the top frame */
    /* the camera backs off and looks higher as the stack grows */
    const e = this.layers[n - 1].k;   /* the roof moves first and highest */
    this.target.y = 1.35 + 2.95 * e;
    if (this.r0) this.radius = this.r0 + (this.r1 - this.r0) * e;
    this.dirty = true;
  }
  setView(theta) { this.theta = theta; this.dirty = true; }

  /** Screen positions of the numbered tags, in CSS pixels of the canvas box. */
  anchors() {
    this.scene.updateMatrixWorld();
    return this.layers.map(l => {
      const v = l.pin.getWorldPosition(new THREE.Vector3()).project(this.camera);
      return [(v.x + 1) / 2 * this.w, (1 - v.y) / 2 * this.h];
    });
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.w = r.width; this.h = r.height;
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / r.height;
    /* the exploded stack is about 9 m tall and 9 m wide: keep it in frame on any screen */
    const vf = THREE.MathUtils.degToRad(this.camera.fov) / 2, hf = Math.atan(Math.tan(vf) * this.camera.aspect);
    const fitR = size => size / Math.sin(Math.min(vf, hf));
    const tall = this.camera.aspect < .9;   /* phones: the stack may use the full width */
    this.r0 = fitR(tall ? 3.3 : 3.7); this.r1 = fitR(tall ? 4.6 : 5.7);
    this.camera.updateProjectionMatrix(); this.setAmount(this.amount);
  }
  render() {
    this.camera.position.setFromSphericalCoords(this.radius, this.phi, this.theta).add(this.target);
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    this.onRender && this.onRender();
  }
  destroy() {
    cancelAnimationFrame(this.raf); this.ro.disconnect(); this.io.disconnect();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.renderer.dispose();
  }
}
