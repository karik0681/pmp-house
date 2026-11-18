/* The shared enquiry list (CRM) on the server: enquiries from the website are stored in the D1 database,
   staff log in to read and edit them, and every new enquiry is sent to the company by e-mail.

   Settings in Cloudflare (Workers → pmp-house → Settings → Variables and Secrets, all as "Secret"):
   - ADMIN_PASSWORD  the staff password for /admin; changing it logs everybody out
   - NOTIFY_EMAIL    where the e-mail about a new enquiry goes; several addresses separated by commas
                     (each must be a verified destination address in Email Routing)
   Anything missing simply switches that part off. */

export interface CrmEnv {
  DB?: D1;
  ADMIN_PASSWORD?: string;
  NOTIFY_EMAIL?: string;
  MAILER?: { send(message: unknown): Promise<void> };
}
interface D1 { prepare(sql: string): { bind(...v: unknown[]): D1Stmt } & D1Stmt }
interface D1Stmt { run(): Promise<{ meta?: { last_row_id?: number } }>; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null> }

type Json = Record<string, any>;
const COOKIE = 'pmp_s';
const DAYS = 14;
const SENDER = 'poptavky@pmphouse.cz';

const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const idOf = (n: number) => `P-${1000 + n}`;
const numOf = (id: string) => { const m = /^P-(\d+)$/.exec(id); return m ? +m[1] - 1000 : NaN; };

/* the table is created on first use, so there is no separate setup step */
let ready = false;
async function db(env: CrmEnv): Promise<D1> {
  if (!env.DB) throw new Error('no database');
  if (!ready) {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS leads (n INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, data TEXT NOT NULL)').run();
    ready = true;
  }
  return env.DB;
}

/* ---------- login ---------- */

const enc = new TextEncoder();
const b64url = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function sign(env: CrmEnv, payload: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(`pmp:${env.ADMIN_PASSWORD}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}
/** Compares two strings without leaking how much of them matched. */
async function same(a: string, b: string) {
  const [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const p = new Uint8Array(x), q = new Uint8Array(y);
  let d = 0; for (let i = 0; i < p.length; i++) d |= p[i] ^ q[i];
  return d === 0;
}

/** The logged-in staff member's name, or null. */
export async function staff(request: Request, env: CrmEnv): Promise<string | null> {
  if (!env.ADMIN_PASSWORD) return null;
  const raw = (request.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !(await same(sig, await sign(env, payload)))) return null;
  try {
    const s = JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))));
    return s.exp > Date.now() ? String(s.u) : null;
  } catch { return null; }
}

async function login(request: Request, env: CrmEnv) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'off' }, 503);
  let b: Json; try { b = await request.json(); } catch { return json({ error: 'input' }, 400); }
  const user = str(b['email'], 120), pass = String(b['password'] ?? '');
  if (!user || !(await same(pass, env.ADMIN_PASSWORD))) return json({ error: 'bad' }, 401);
  const payload = b64url(enc.encode(unescape(encodeURIComponent(JSON.stringify({ u: user, exp: Date.now() + DAYS * 864e5 })))));
  const token = `${payload}.${await sign(env, payload)}`;
  return json({ user }, 200, { 'set-cookie': `${COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${DAYS * 86400}` });
}

/* ---------- enquiries ---------- */

/** A new enquiry from the website (configurator or chat). Open to everybody, so everything is checked and shortened. */
async function create(request: Request, env: CrmEnv, wait: (p: Promise<unknown>) => void) {
  let b: Json; try { b = await request.json(); } catch { return json({ error: 'input' }, 400); }
  const name = str(b['name'], 100), email = str(b['email'], 200), phone = str(b['phone'], 40);
  if (!name || (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && phone.replace(/\D/g, '').length < 6)) return json({ error: 'input' }, 400);
  const cfg = b['cfg'] && typeof b['cfg'] === 'object' && JSON.stringify(b['cfg']).length < 6000 ? b['cfg'] : null;
  const price = typeof b['price'] === 'number' && isFinite(b['price']) ? Math.round(b['price']) : null;
  const now = new Date().toISOString();
  const lead: Json = {
    name, email, phone, place: str(b['place'], 200), clientNote: str(b['clientNote'], 8000), cfg, price,
    source: str(b['source'], 80) || 'Web', createdAt: now, status: 0, next: str(b['next'], 200), due: now.slice(0, 10),
    notes: [{ at: now, text: str(b['firstNote'], 300) }],
  };
  const d = await db(env);
  const r = await d.prepare('INSERT INTO leads (created_at, data) VALUES (?, ?)').bind(now, JSON.stringify(lead)).run();
  const id = idOf(Number(r.meta?.last_row_id));
  wait(notify(env, { ...lead, id }, new URL(request.url).origin));
  return json({ id });
}

async function list(env: CrmEnv) {
  const { results } = await (await db(env)).prepare('SELECT n, data FROM leads ORDER BY n DESC LIMIT 2000').all<{ n: number; data: string }>();
  return json(results.map(r => ({ ...JSON.parse(r.data), id: idOf(r.n) })));
}

/** Staff changes: a few fields, and a note added on top of the history. */
async function change(id: string, request: Request, env: CrmEnv, who: string) {
  const n = numOf(id);
  if (!Number.isFinite(n)) return json({ error: 'id' }, 404);
  let b: Json; try { b = await request.json(); } catch { return json({ error: 'input' }, 400); }
  const d = await db(env);
  const row = await d.prepare('SELECT data FROM leads WHERE n = ?').bind(n).first<{ data: string }>();
  if (!row) return json({ error: 'id' }, 404);
  const lead: Json = JSON.parse(row.data), p: Json = b['patch'] && typeof b['patch'] === 'object' ? b['patch'] : {};
  if (Number.isInteger(p['status']) && p['status'] >= 0 && p['status'] <= 4) lead['status'] = p['status'];
  if ('next' in p) lead['next'] = str(p['next'], 200);
  if ('due' in p) lead['due'] = /^\d{4}-\d{2}-\d{2}$/.test(String(p['due'])) ? p['due'] : '';
  if ('price' in p) lead['price'] = typeof p['price'] === 'number' && isFinite(p['price']) ? Math.round(p['price']) : null;
  if ('quote' in p && JSON.stringify(p['quote'] ?? null).length < 20000) lead['quote'] = p['quote'];
  const note = str(b['note'], 2000);
  if (note) lead['notes'] = [{ at: new Date().toISOString(), text: note, by: who }, ...(lead['notes'] || [])];
  await d.prepare('UPDATE leads SET data = ? WHERE n = ?').bind(JSON.stringify(lead), n).run();
  return json({ ...lead, id });
}

/** Deletes an enquiry for good (for example when the customer asks for their data to be erased under GDPR). */
async function remove(id: string, env: CrmEnv, who: string) {
  const n = numOf(id);
  if (!Number.isFinite(n)) return json({ error: 'id' }, 404);
  await (await db(env)).prepare('DELETE FROM leads WHERE n = ?').bind(n).run();
  console.log('deleted', id, 'by', who);   /* the log keeps who deleted which number, not the customer's data */
  return json({ deleted: id });
}

/* ---------- notifications ---------- */

function message(l: Json, site: string) {
  return [
    `Nová poptávka ${l['id']} (${l['source']})`, '',
    `Jméno: ${l['name']}`, `Telefon: ${l['phone'] || '-'}`, `E-mail: ${l['email'] || '-'}`, l['place'] ? `Místo: ${l['place']}` : '',
    typeof l['price'] === 'number' ? `Orientační cena z konfigurátoru: ${l['price'].toLocaleString('cs-CZ')} Kč bez DPH` : '',
    '', l['clientNote'] || '', '', `Kabinet: ${site}/admin`,
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
}

async function notify(env: CrmEnv, lead: Json, site: string) {
  const text = message(lead, site);
  const jobs: Promise<unknown>[] = [];
  /* NOTIFY_EMAIL may hold several addresses separated by commas: the site mailbox and staff mailboxes */
  const to = (env.NOTIFY_EMAIL || '').split(',').map(a => a.trim()).filter(a => /^[^\s@]+@[^\s@]+$/.test(a));
  if (env.MAILER) for (const a of to) jobs.push(mail(env, lead, text, a).catch(e => console.log('mail', String(e))));
  await Promise.allSettled(jobs);
}

/** A plain-text e-mail. "Reply" in the mail program answers the customer directly. */
export function mime(to: string, subject: string, text: string, replyTo: string) {
  const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
  const body = b64(text).replace(/.{76}/g, '$&\r\n');
  return [
    `From: "PMP House web" <${SENDER}>`, `To: ${to}`,
    ...(/^[^\s@<>]+@[^\s@<>]+$/.test(replyTo) ? [`Reply-To: ${replyTo}`] : []),
    `Subject: =?UTF-8?B?${b64(subject)}?=`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@pmphouse.cz>`, 'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body,
  ].join('\r\n');
}

async function mail(env: CrmEnv, lead: Json, text: string, to: string) {
  // @ts-ignore: provided by the Cloudflare runtime
  const { EmailMessage } = await import('cloudflare:email');
  const raw = mime(to, `Nová poptávka ${lead['id']}: ${lead['name']} (${lead['source']})`, text, lead['email']);
  await env.MAILER!.send(new EmailMessage(SENDER, to, raw));
}

/* ---------- clean-up ---------- */

/** Enquiries that did not end in a sale are deleted 2 years after the last activity, as the privacy notice says.
    notes[0] is the newest note, so its time is the last activity. Runs once a day (wrangler.jsonc, triggers). */
export async function cleanup(env: CrmEnv) {
  if (!env.DB) return;
  const before = new Date(Date.now() - 730 * 864e5).toISOString();
  const r = await (await db(env)).prepare(
    "DELETE FROM leads WHERE json_extract(data, '$.status') < 4 AND COALESCE(json_extract(data, '$.notes[0].at'), created_at) < ?",
  ).bind(before).run();
  console.log('cleanup', JSON.stringify((r as any).meta?.changes ?? 0));
}

/* ---------- routes ---------- */

export async function crm(request: Request, env: CrmEnv, pathname: string, wait: (p: Promise<unknown>) => void, busy: () => boolean): Promise<Response | null> {
  const m = request.method;
  try {
    if (pathname === '/api/login' && m === 'POST') return busy() ? json({ error: 'busy' }, 429) : await login(request, env);
    if (pathname === '/api/logout' && m === 'POST') return json({}, 200, { 'set-cookie': `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
    if (pathname === '/api/session') { const u = await staff(request, env); return u ? json({ user: u }) : json({ error: 'auth' }, 401); }
    if (pathname === '/api/leads' && m === 'POST') return busy() ? json({ error: 'busy' }, 429) : await create(request, env, wait);
    if (pathname === '/api/leads' || pathname.startsWith('/api/leads/')) {
      const who = await staff(request, env);
      if (!who) return json({ error: 'auth' }, 401);
      if (pathname === '/api/leads' && m === 'GET') return await list(env);
      const id = decodeURIComponent(pathname.slice('/api/leads/'.length));
      if (id && m === 'PATCH') return await change(id, request, env, who);
      if (id && m === 'DELETE') return await remove(id, env, who);
      return json({ error: 'method' }, 405);
    }
  } catch (e) {
    console.log('crm', String(e));
    return json({ error: 'server' }, 500);
  }
  return null;
}
