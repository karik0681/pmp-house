/* Conversations from the chat window on the website, kept so the staff can read what visitors ask,
   also when the visitor leaves no contact. The server writes each visitor message and each answer itself,
   so nothing the browser claims to have been said ends up in the record.
   A conversation without a contact is deleted after 90 days; one that became an enquiry stays with the enquiry. */

import type { CrmEnv } from './crm';
import { who } from './staff';

export interface ChatMsg { role: 'user' | 'assistant'; content: string; at: string }

type D1 = NonNullable<CrmEnv['DB']>;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/** the browser makes a random id when the chat window is first used */
export const chatId = (v: unknown) => (typeof v === 'string' && /^[a-z0-9-]{16,40}$/i.test(v) ? v : '');

let ready = false;
async function db(env: CrmEnv): Promise<D1> {
  if (!env.DB) throw new Error('no database');
  if (!ready) {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, page TEXT, lead TEXT, msgs TEXT NOT NULL)').run();
    ready = true;
  }
  return env.DB;
}

/** Adds the visitor's message and the answer to the conversation. A failure here never breaks the chat itself. */
export async function record(env: CrmEnv, id: string, page: string, question: string, answer: string) {
  if (!id || !env.DB) return;
  try {
    const d = await db(env), now = new Date().toISOString();
    const row = await d.prepare('SELECT msgs FROM chats WHERE id = ?').bind(id).first<{ msgs: string }>();
    const msgs: ChatMsg[] = row ? JSON.parse(row.msgs) : [];
    msgs.push({ role: 'user', content: question, at: now });
    if (answer) msgs.push({ role: 'assistant', content: answer, at: now });
    const keep = JSON.stringify(msgs.slice(-80));
    if (row) await d.prepare('UPDATE chats SET msgs = ?, updated_at = ? WHERE id = ?').bind(keep, now, id).run();
    else await d.prepare('INSERT INTO chats (id, created_at, updated_at, page, lead, msgs) VALUES (?, ?, ?, ?, NULL, ?)').bind(id, now, now, page.slice(0, 200), keep).run();
  } catch (e) { console.log('chat record', String(e)); }
}

/** Marks the conversation with the number of the enquiry the visitor left in it. */
export async function linkLead(env: CrmEnv, id: string, lead: string) {
  if (!id || !env.DB) return;
  try { await (await db(env)).prepare('UPDATE chats SET lead = ? WHERE id = ?').bind(lead, id).run(); } catch (e) { console.log('chat link', String(e)); }
}

/** Once a day: conversations without an enquiry, untouched for 90 days, are deleted. */
export async function cleanupChats(env: CrmEnv) {
  if (!env.DB) return;
  const before = new Date(Date.now() - 90 * 864e5).toISOString();
  await (await db(env)).prepare('DELETE FROM chats WHERE lead IS NULL AND updated_at < ?').bind(before).run();
}

/** /api/chats for logged-in staff: the list (newest first) and deleting one conversation. */
export async function chatRoutes(request: Request, env: CrmEnv, pathname: string): Promise<Response | null> {
  if (pathname !== '/api/chats' && !pathname.startsWith('/api/chats/')) return null;
  const w = await who(request, env);
  if (!w || w.s !== 'full') return json({ error: 'auth' }, 401);
  const d = await db(env);
  if (pathname === '/api/chats' && request.method === 'GET') {
    const { results } = await d.prepare('SELECT id, created_at, updated_at, page, lead, msgs FROM chats ORDER BY updated_at DESC LIMIT 300')
      .all<{ id: string; created_at: string; updated_at: string; page: string; lead: string | null; msgs: string }>();
    return json(results.map(r => ({ id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, page: r.page || '', lead: r.lead, msgs: JSON.parse(r.msgs) })));
  }
  const id = chatId(decodeURIComponent(pathname.slice('/api/chats/'.length)));
  if (id && request.method === 'DELETE') {
    await d.prepare('DELETE FROM chats WHERE id = ?').bind(id).run();
    console.log('chat deleted by', w.name || w.u);
    return json({ deleted: id });
  }
  return json({ error: 'method' }, 405);
}
