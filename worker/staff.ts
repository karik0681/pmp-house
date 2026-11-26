/* Staff login for /admin: every person has an own account with a password, and at each login a
   6-digit code is sent to their e-mail (worker/mail.ts). No app on the phone is needed.

   How it starts: while there is no account yet, the e-mail + ADMIN_PASSWORD (Cloudflare secret) + the code
   from that mailbox create the first account, the owner. Everyone, the owner too, then sets an own password.
   After that ADMIN_PASSWORD is only the key that signs sessions; changing it logs everybody out.
   The owner adds and switches off staff in the cabinet ("Zaměstnanci").
   The free Cloudflare plan sends only to verified addresses: each staff mailbox is confirmed once in
   Email Routing → Destination addresses (Cloudflare sends a link to click). */

import { Mailer, sendMail } from './mail';

type Json = Record<string, any>;
interface D1 { prepare(sql: string): { bind(...v: unknown[]): D1Stmt } & D1Stmt }
interface D1Stmt { run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null> }
export interface StaffEnv { DB?: D1; ADMIN_PASSWORD?: string; MAILER?: Mailer }

interface Row { email: string; name: string; role: 'owner' | 'staff'; salt: string; hash: string; totp: string | null; pending: string | null; last_step: number; active: number }
/** a session: who, at which stage ('setup' = must still set a password and the app, 'full' = signed in) */
export interface Who { u: string; name: string; role: 'owner' | 'staff'; s: 'setup' | 'full' }

const COOKIE = 'pmp_s';
const DAYS = 14;
const SETUP_MIN = 30;
const CODE_MIN = 10;
const CODE_TRIES = 5;
const enc = new TextEncoder();

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const mailOf = (v: unknown) => str(v, 120).toLowerCase();
const isMail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

let ready = false;
async function db(env: StaffEnv): Promise<D1> {
  if (!env.DB) throw new Error('no database');
  if (!ready) {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS staff (email TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL,
      salt TEXT NOT NULL, hash TEXT NOT NULL, totp TEXT, pending TEXT, last_step INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)`).run();
    /* the login codes sent by e-mail: one live code per address, kept only as a hash */
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS codes (email TEXT PRIMARY KEY, hash TEXT NOT NULL, exp INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0)').run();
    ready = true;
  }
  return env.DB;
}

/* ---------- small crypto helpers ---------- */

const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => new Uint8Array((s.match(/../g) || []).map(h => parseInt(h, 16)));

/** Compares two strings without leaking how much of them matched. */
export async function same(a: string, b: string) {
  const [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const p = new Uint8Array(x), q = new Uint8Array(y);
  let d = 0; for (let i = 0; i < p.length; i++) d |= p[i] ^ q[i];
  return d === 0;
}

/** Password hash: PBKDF2-SHA256, 100 000 rounds (the most Cloudflare Workers allow), own salt per person. */
export async function hashPassword(pass: string, saltHex?: string) {
  const salt = saltHex ? unhex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return { salt: hex(salt), hash: hex(bits) };
}

/** The hash a login code is kept as: tied to the address and to the server secret. */
async function codeHash(env: StaffEnv, email: string, code: string) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(`code:${email}:${code}:${env.ADMIN_PASSWORD}`)));
}
/** A random 6-digit code. */
export function newCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, '0');
}

/* ---------- sessions ---------- */

async function sign(env: StaffEnv, payload: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(`pmp:${env.ADMIN_PASSWORD}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}
async function cookie(env: StaffEnv, u: string, s: Who['s']) {
  const life = s === 'full' ? DAYS * 864e5 : SETUP_MIN * 6e4;
  const payload = b64url(enc.encode(unescape(encodeURIComponent(JSON.stringify({ u, s, exp: Date.now() + life })))));
  return `${COOKIE}=${payload}.${await sign(env, payload)}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.round(life / 1000)}`;
}
const clear = `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

/** Who sent this request, checked against the database, so a switched-off account stops working at once. */
export async function who(request: Request, env: StaffEnv): Promise<Who | null> {
  if (!env.ADMIN_PASSWORD || !env.DB) return null;
  const raw = (request.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !(await same(sig, await sign(env, payload)))) return null;
  let s: Json;
  try { s = JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return null; }
  if (!(s['exp'] > Date.now()) || (s['s'] !== 'full' && s['s'] !== 'setup')) return null;
  const row = await (await db(env)).prepare('SELECT * FROM staff WHERE email = ?').bind(s['u']).first<Row>();
  if (!row || !row.active) return null;
  /* a full session needs an own password; after a reset by the owner it drops back to setup */
  const stage: Who['s'] = s['s'] === 'full' && row.totp ? 'full' : 'setup';
  return { u: row.email, name: row.name, role: row.role, s: stage };
}

/* ---------- login and first-time setup ---------- */

/** Step 1 (no code yet): the password is right, so a code goes to the e-mail. Step 2: the same plus the code. */
async function login(request: Request, env: StaffEnv) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'off' }, 503);
  let b: Json; try { b = await request.json(); } catch { return json({ error: 'input' }, 400); }
  const email = mailOf(b['email']), pass = String(b['password'] ?? ''), code = str(b['code'], 6);
  if (!isMail(email) || !pass) return json({ error: 'bad' }, 401);
  const d = await db(env);
  let row = await d.prepare('SELECT * FROM staff WHERE email = ?').bind(email).first<Row>();
  /* the very first login (no account at all) creates the owner with the start password */
  let first = false;
  if (!row) {
    const any = await d.prepare('SELECT COUNT(*) AS n FROM staff').first<{ n: number }>();
    if ((any?.n ?? 0) > 0 || !(await same(pass, env.ADMIN_PASSWORD))) return json({ error: 'bad' }, 401);
    first = true;
  } else if (!row.active || !(await same((await hashPassword(pass, row.salt)).hash, row.hash))) return json({ error: 'bad' }, 401);

  if (!/^\d{6}$/.test(code)) {
    if (!env.MAILER) return json({ error: 'off' }, 503);
    const c = newCode();
    await d.prepare('INSERT OR REPLACE INTO codes (email, hash, exp, tries) VALUES (?, ?, ?, 0)')
      .bind(email, await codeHash(env, email, c), Date.now() + CODE_MIN * 6e4).run();
    try {
      await sendMail(env.MAILER, email, `PMP House: kód pro přihlášení ${c}`,
        `Váš kód pro přihlášení do kabinetu PMP House:\n\n${c}\n\nKód platí ${CODE_MIN} minut. Pokud jste se nepřihlašovali vy, e-mail ignorujte a změňte si heslo.`);
    } catch (e) {
      console.log('code mail', String(e));
      await d.prepare('DELETE FROM codes WHERE email = ?').bind(email).run();
      return json({ error: 'mail' }, 503);
    }
    return json({ sent: true });
  }

  const c = await d.prepare('SELECT * FROM codes WHERE email = ?').bind(email).first<{ hash: string; exp: number; tries: number }>();
  if (!c || c.exp < Date.now() || c.tries >= CODE_TRIES) return json({ error: 'expired' }, 401);
  if (!(await same(await codeHash(env, email, code), c.hash))) {
    await d.prepare('UPDATE codes SET tries = tries + 1 WHERE email = ?').bind(email).run();
    return json({ error: 'code' }, 401);
  }
  await d.prepare('DELETE FROM codes WHERE email = ?').bind(email).run();
  if (first) {
    /* checked again: nobody may have become the owner in the meantime */
    const any = await d.prepare('SELECT COUNT(*) AS n FROM staff').first<{ n: number }>();
    if ((any?.n ?? 0) > 0) return json({ error: 'bad' }, 401);
    const h = await hashPassword(pass);
    await d.prepare('INSERT INTO staff (email, name, role, salt, hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(email, email.split('@')[0], 'owner', h.salt, h.hash, new Date().toISOString()).run();
    row = await d.prepare('SELECT * FROM staff WHERE email = ?').bind(email).first<Row>();
  }
  if (!row) return json({ error: 'bad' }, 401);
  if (!row.totp) return json({ setup: true }, 200, { 'set-cookie': await cookie(env, row.email, 'setup') });
  return json({ user: row.email, name: row.name, role: row.role }, 200, { 'set-cookie': await cookie(env, row.email, 'full') });
}

/** First login (or after a reset by the owner): the person replaces the start password with an own one. */
async function setupFinish(request: Request, env: StaffEnv, w: Who) {
  let b: Json; try { b = await request.json(); } catch { return json({ error: 'input' }, 400); }
  const pass = String(b['password'] ?? '');
  if (pass.length < 10) return json({ error: 'short' }, 400);
  if (await same(pass, env.ADMIN_PASSWORD!)) return json({ error: 'reuse' }, 400);
  const d = await db(env);
  const row = await d.prepare('SELECT * FROM staff WHERE email = ?').bind(w.u).first<Row>();
  if (!row) return json({ error: 'auth' }, 401);
  if (await same((await hashPassword(pass, row.salt)).hash, row.hash)) return json({ error: 'reuse' }, 400);
  const h = await hashPassword(pass);
  /* "totp" now only marks that the own password is set ('email' = codes come by e-mail) */
  await d.prepare("UPDATE staff SET salt = ?, hash = ?, totp = 'email', pending = NULL WHERE email = ?").bind(h.salt, h.hash, w.u).run();
  return json({ user: w.u, name: w.name, role: w.role }, 200, { 'set-cookie': await cookie(env, w.u, 'full') });
}

/* ---------- the owner manages staff ---------- */

async function staffList(env: StaffEnv) {
  const { results } = await (await db(env)).prepare('SELECT email, name, role, active, totp IS NOT NULL AS ready, created_at FROM staff ORDER BY created_at').all<Json>();
  return json(results.map(r => ({ ...r, active: !!r['active'], ready: !!r['ready'] })));
}

async function staffAdd(request: Request, env: StaffEnv) {
  let b: Json; try { b = await request.json(); } catch { return json({ error: 'input' }, 400); }
  const email = mailOf(b['email']), name = str(b['name'], 80), pass = String(b['password'] ?? '');
  if (!isMail(email) || !name || pass.length < 10) return json({ error: 'input' }, 400);
  const d = await db(env);
  if (await d.prepare('SELECT 1 FROM staff WHERE email = ?').bind(email).first()) return json({ error: 'exists' }, 409);
  const h = await hashPassword(pass);
  await d.prepare('INSERT INTO staff (email, name, role, salt, hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(email, name, 'staff', h.salt, h.hash, new Date().toISOString()).run();
  return staffList(env);
}

/** Switch an account off or on, or give it a new start password (forgotten password): the person sets an own one at the next login. */
async function staffChange(email: string, request: Request, env: StaffEnv, w: Who) {
  let b: Json; try { b = await request.json(); } catch { return json({ error: 'input' }, 400); }
  if (email === w.u) return json({ error: 'self' }, 400);
  const d = await db(env);
  if (typeof b['active'] === 'boolean') await d.prepare('UPDATE staff SET active = ? WHERE email = ?').bind(b['active'] ? 1 : 0, email).run();
  if (b['resetApp'] === true) {
    const pass = String(b['password'] ?? '');
    if (pass.length < 10) return json({ error: 'input' }, 400);
    const h = await hashPassword(pass);
    await d.prepare('UPDATE staff SET totp = NULL, pending = NULL, last_step = 0, salt = ?, hash = ? WHERE email = ?').bind(h.salt, h.hash, email).run();
  }
  return staffList(env);
}

/* ---------- routes ---------- */

/** Handles the login and staff addresses; returns null for anything else. `busy` limits attempts per visitor. */
export async function staffRoutes(request: Request, env: StaffEnv, pathname: string, busy: () => boolean): Promise<Response | null> {
  const m = request.method;
  if (pathname === '/api/login' && m === 'POST') return busy() ? json({ error: 'busy' }, 429) : login(request, env);
  if (pathname === '/api/logout' && m === 'POST') return json({}, 200, { 'set-cookie': clear });
  if (pathname === '/api/session') { const w = await who(request, env); return w ? json({ user: w.u, name: w.name, role: w.role, setup: w.s === 'setup' }) : json({ error: 'auth' }, 401); }
  if (pathname === '/api/setup/finish' && m === 'POST') {
    if (busy()) return json({ error: 'busy' }, 429);
    const w = await who(request, env); return w ? setupFinish(request, env, w) : json({ error: 'auth' }, 401);
  }
  if (pathname === '/api/staff' || pathname.startsWith('/api/staff/')) {
    const w = await who(request, env);
    if (!w || w.s !== 'full') return json({ error: 'auth' }, 401);
    if (w.role !== 'owner') return json({ error: 'owner' }, 403);
    if (pathname === '/api/staff' && m === 'GET') return staffList(env);
    if (pathname === '/api/staff' && m === 'POST') return staffAdd(request, env);
    const email = decodeURIComponent(pathname.slice('/api/staff/'.length)).toLowerCase();
    if (email && m === 'PATCH') return staffChange(email, request, env, w);
    return json({ error: 'method' }, 405);
  }
  return null;
}
