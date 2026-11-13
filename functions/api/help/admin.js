// Solo dueño. GET -> lista · GET ?chat=ID -> mensajes · POST {chat,text} responde · POST {chat,close:true} cierra
import { authenticate } from '../../_lib/auth.js';
import { OWNER } from '../../_lib/analytics.js';
import { ensureHelp, J } from '../../_lib/help.js';
async function owner(request, env) {
  const p = await authenticate(request, env); if (!p || !p.sub) return false;
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  return !!u && String(u.email).toLowerCase() === OWNER;
}
export async function onRequest({ request, env }) {
  if (!(await owner(request, env))) return J({ ok: false, error: 'owner_only' }, 403);
  await ensureHelp(env.DB);
  const now = Math.floor(Date.now() / 1000), url = new URL(request.url), id = url.searchParams.get('chat');
  if (request.method === 'GET') {
    if (id) {
      const since = parseInt(url.searchParams.get('since')) || 0;
      const c = await env.DB.prepare('SELECT id, status, path, email, lang, ua, created FROM help_chats WHERE id = ?').bind(id).first(); if (!c) return J({ ok: false, error: 'not_found' }, 404);
      const m = (await env.DB.prepare('SELECT id, role, text, ts FROM help_msgs WHERE chat = ? AND id > ? ORDER BY id LIMIT 300').bind(id, since).all()).results || [];
      await env.DB.prepare('UPDATE help_chats SET unread_admin = 0 WHERE id = ?').bind(id).run();
      return J({ ok: true, chat: c, msgs: m });
    }
    const l = (await env.DB.prepare("SELECT c.id, c.status, c.path, c.email, c.updated, c.unread_admin, (SELECT text FROM help_msgs m WHERE m.chat = c.id AND m.role != 'bot' ORDER BY m.id DESC LIMIT 1) last FROM help_chats c WHERE c.status != 'closed' OR c.updated > ? ORDER BY CASE c.status WHEN 'waiting' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, c.updated DESC LIMIT 80").bind(now - 86400 * 3).all()).results || [];
    return J({ ok: true, now, chats: l, waiting: l.filter(x => x.status === 'waiting').length });
  }
  if (request.method === 'POST') {
    let b = {}; try { b = await request.json(); } catch (e) {}
    const cid = String(b.chat || ''); if (!/^[0-9a-f]{32}$/.test(cid)) return J({ ok: false, error: 'bad_chat' }, 400);
    if (b.close) { await env.DB.prepare("UPDATE help_chats SET status = 'closed', updated = ? WHERE id = ?").bind(now, cid).run(); return J({ ok: true }); }
    const text = String(b.text || '').trim().slice(0, 1500); if (!text) return J({ ok: false, error: 'empty' }, 400);
    await env.DB.prepare('INSERT INTO help_msgs (chat, role, text, ts) VALUES (?,?,?,?)').bind(cid, 'agent', text, now).run();
    await env.DB.prepare("UPDATE help_chats SET status = 'open', updated = ?, unread_admin = 0 WHERE id = ?").bind(now, cid).run();
    return J({ ok: true });
  }
  return J({ ok: false }, 405);
}
