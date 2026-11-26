/* The shared enquiry list (CRM) on the server: enquiries from the website are stored in the D1 database,
   staff log in to read and edit them, and every new enquiry is sent to the company by e-mail.

   Settings in Cloudflare (Workers → pmp-house → Settings → Variables and Secrets, all as "Secret"):
   - ADMIN_PASSWORD  the start password for the first /admin account and the key that signs sessions (staff.ts)
   - NOTIFY_EMAIL    (in wrangler.jsonc, vars) where the e-mail about a new enquiry goes; several addresses separated by commas
                     (each must be a verified destination address in Email Routing)
   Anything missing simply switches that part off. */

import { staffRoutes, who } from './staff';
import { Mailer, sendMail } from './mail';
import { chatId, chatRoutes, linkLead } from './chats';

export interface CrmEnv {
  DB?: D1;
  ADMIN_PASSWORD?: string;
  NOTIFY_EMAIL?: string;
  MAILER?: Mailer;
}
interface D1 { prepare(sql: string): { bind(...v: unknown[]): D1Stmt } & D1Stmt }
interface D1Stmt { run(): Promise<{ meta?: { last_row_id?: number } }>; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null> }

type Json = Record<string, any>;

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
  if (chatId(b['chat'])) lead['chat'] = chatId(b['chat']);
  const d = await db(env);
  const r = await d.prepare('INSERT INTO leads (created_at, data) VALUES (?, ?)').bind(now, JSON.stringify(lead)).run();
  const id = idOf(Number(r.meta?.last_row_id));
  const chat = chatId(b['chat']);
  if (chat) wait(linkLead(env, chat, id));
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
  /* the chat conversation the enquiry came from goes with it */
  await env.DB!.prepare('DELETE FROM chats WHERE lead = ?').bind(id).run().catch(() => undefined);
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

async function mail(env: CrmEnv, lead: Json, text: string, to: string) {
  await sendMail(env.MAILER!, to, `Nová poptávka ${lead['id']}: ${lead['name']} (${lead['source']})`, text, lead['email']);
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
    const auth = await staffRoutes(request, env, pathname, busy);
    if (auth) return auth;
    const chats = await chatRoutes(request, env, pathname);
    if (chats) return chats;
    if (pathname === '/api/leads' && m === 'POST') return busy() ? json({ error: 'busy' }, 429) : await create(request, env, wait);
    if (pathname === '/api/leads' || pathname.startsWith('/api/leads/')) {
      const w = await who(request, env);
      if (!w || w.s !== 'full') return json({ error: 'auth' }, 401);
      const by = w.name || w.u;
      if (pathname === '/api/leads' && m === 'GET') return await list(env);
      const id = decodeURIComponent(pathname.slice('/api/leads/'.length));
      if (id && m === 'PATCH') return await change(id, request, env, by);
      if (id && m === 'DELETE') return await remove(id, env, by);
      return json({ error: 'method' }, 405);
    }
  } catch (e) {
    console.log('crm', String(e));
    return json({ error: 'server' }, 500);
  }
  return null;
}
