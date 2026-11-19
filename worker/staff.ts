/* Staff login for /admin: every person has an own account with a password and a 6-digit code
   from an authenticator app (Google Authenticator, Microsoft Authenticator and the like).

   How it starts: while there is no account yet, the e-mail + ADMIN_PASSWORD (Cloudflare secret) create the
   first account, the owner. Everyone, the owner too, then sets an own password and scans a QR code once.
   After that ADMIN_PASSWORD is only the key that signs sessions; changing it logs everybody out.
   The owner adds and switches off staff in the cabinet ("Zaměstnanci"). */

type Json = Record<string, any>;
interface D1 { prepare(sql: string): { bind(...v: unknown[]): D1Stmt } & D1Stmt }
interface D1Stmt { run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null> }
export interface StaffEnv { DB?: D1; ADMIN_PASSWORD?: string }

interface Row { email: string; name: string; role: 'owner' | 'staff'; salt: string; hash: string; totp: string | null; pending: string | null; last_step: number; active: number }
/** a session: who, at which stage ('setup' = must still set a password and the app, 'full' = signed in) */
export interface Who { u: string; name: string; role: 'owner' | 'staff'; s: 'setup' | 'full' }

const COOKIE = 'pmp_s';
const DAYS = 14;
const SETUP_MIN = 30;
const ISSUER = 'PMP House';
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

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes: Uint8Array) {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
export function unbase32(s: string) {
  const out: number[] = []; let bits = 0, val = 0;
  for (const c of s.replace(/=+$/, '').toUpperCase()) { const i = B32.indexOf(c); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return new Uint8Array(out);
}

/** The code an authenticator app shows for a 30-second step (RFC 6238, SHA-1, 6 digits). */
export async function totpAt(secret: string, step: number, digits = 6) {
  const key = await crypto.subtle.importKey('raw', unbase32(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new Uint8Array(8); let s = step;
  for (let i = 7; i >= 0; i--) { msg[i] = s & 255; s = Math.floor(s / 256); }
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digits).padStart(digits, '0');
}
/** Checks a code with one step of slack for clock drift; returns the matched step, or 0. Older steps are refused (no reuse). */
export async function checkTotp(secret: string, code: string, after = 0, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return 0;
  const t = Math.floor(now / 30000);
  for (const step of [t, t - 1, t + 1]) if (step > after && (await same(await totpAt(secret, step), code))) return step;
  return 0;
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
  /* a full session needs the app to be set up; after a reset by the owner it drops back to setup */
  const stage: Who['s'] = s['s'] === 'full' && row.totp ? 'full' : 'setup';
  return { u: row.email, name: row.name, role: row.role, s: stage };
}

/* ---------- login and first-time setup ---------- */

async function login(request: Request, env: StaffEnv) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'off' }, 503);
  let b: Json; try { b = await request.json(); } catch { return json({ error: 'input' }, 400); }
  const email = mailOf(b['email']), pass = String(b['password'] ?? ''), code = str(b['code'], 6);
  if (!isMail(email) || !pass) return json({ error: 'bad' }, 401);
  const d = await db(env);
  let row = await d.prepare('SELECT * FROM staff WHERE email = ?').bind(email).first<Row>();
  if (!row) {
    /* the very first login creates the owner with the start password; it works only while there is no account */
    const any = await d.prepare('SELECT COUNT(*) AS n FROM staff').first<{ n: number }>();
    if ((any?.n ?? 0) > 0 || !(await same(pass, env.ADMIN_PASSWORD))) return json({ error: 'bad' }, 401);
    const h = await hashPassword(pass);
    await d.prepare('INSERT INTO staff (email, name, role, salt, hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(email, email.split('@')[0], 'owner', h.salt, h.hash, new Date().toISOString()).run();
    row = await d.prepare('SELECT * FROM staff WHERE email = ?').bind(email).first<Row>();
  }
  if (!row || !row.active || !(await same((await hashPassword(pass, row.salt)).hash, row.hash))) return json({ error: 'bad' }, 401);
  if (!row.totp) return json({ setup: true }, 200, { 'set-cookie': await cookie(env, row.email, 'setup') });
  if (!code) return json({ error: 'code' }, 401);
  const step = await checkTotp(row.totp, code, row.last_step);
  if (!step) return json({ error: 'code' }, 401);
  await d.prepare('UPDATE staff SET last_step = ? WHERE email = ?').bind(step, row.email).run();
  return json({ user: row.email, name: row.name, role: row.role }, 200, { 'set-cookie': await cookie(env, row.email, 'full') });
}

/** Step 1 of the setup: a new secret for the app (shown as a QR code). */
async function setupStart(env: StaffEnv, w: Who) {
  const secret = base32(crypto.getRandomValues(new Uint8Array(20)));
  await (await db(env)).prepare('UPDATE staff SET pending = ? WHERE email = ?').bind(secret, w.u).run();
  const label = encodeURIComponent(`${ISSUER}:${w.u}`);
  return json({ secret, uri: `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30` });
}

/** Step 2: the person's own new password and the first code from the app; then the account is ready. */
async function setupFinish(request: Request, env: StaffEnv, w: Who) {
  let b: Json; try { b = await request.json(); } catch { return json({ error: 'input' }, 400); }
  const pass = String(b['password'] ?? ''), code = str(b['code'], 6);
  if (pass.length < 10) return json({ error: 'short' }, 400);
  const d = await db(env);
  const row = await d.prepare('SELECT * FROM staff WHERE email = ?').bind(w.u).first<Row>();
  if (!row?.pending) return json({ error: 'nosecret' }, 400);
  if (await same(pass, env.ADMIN_PASSWORD!)) return json({ error: 'reuse' }, 400);
  const step = await checkTotp(row.pending, code);
  if (!step) return json({ error: 'code' }, 400);
  const h = await hashPassword(pass);
  await d.prepare('UPDATE staff SET salt = ?, hash = ?, totp = pending, pending = NULL, last_step = ? WHERE email = ?').bind(h.salt, h.hash, step, w.u).run();
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

/** Switch an account off or on, or reset its app (lost phone): the person sets it up again at the next login. */
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
  if (pathname === '/api/setup/start' && m === 'POST') { const w = await who(request, env); return w ? setupStart(env, w) : json({ error: 'auth' }, 401); }
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
