// Publico. POST {chat?, text, transcript?, email?, path?, lang?} · GET ?chat=ID&since=N
import { ensureHelp, J, newId, ipHash, notify, notifyMail } from '../../_lib/help.js';
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
export async function onRequest({ request, env }) {
  if (!env.DB) return J({ ok: false, error: 'no_db' }, 503);
  await ensureHelp(env.DB);
  const now = Math.floor(Date.now() / 1000), url = new URL(request.url);
  if (request.method === 'GET') {
    const id = clean(url.searchParams.get('chat'), 40), since = parseInt(url.searchParams.get('since')) || 0;
    if (!/^[0-9a-f]{32}$/.test(id)) return J({ ok: false, error: 'bad_chat' }, 400);
    const c = await env.DB.prepare('SELECT status, created FROM help_chats WHERE id = ?').bind(id).first(); if (!c) return J({ ok: false, error: 'not_found' }, 404);
    const r = (await env.DB.prepare('SELECT id, role, text, ts FROM help_msgs WHERE chat = ? AND id > ? ORDER BY id LIMIT 100').bind(id, since).all()).results || [];
    return J({ ok: true, status: c.status, ahead: c.status === 'waiting' ? await ahead(env, id) : 0, msgs: r });
  }
  if (request.method !== 'POST') return J({ ok: false }, 405);
  let b = {}; try { b = await request.json(); } catch (e) {}
  const text = clean(b.text, 800); if (!text) return J({ ok: false, error: 'empty' }, 400);
  if (b.close && /^[0-9a-f]{32}$/.test(clean(b.chat, 40))) { const cid = clean(b.chat, 40); await env.DB.prepare("UPDATE help_chats SET status = 'closed', updated = ? WHERE id = ?").bind(now, cid).run(); await env.DB.prepare('INSERT INTO help_msgs (chat, role, text, ts) VALUES (?,?,?,?)').bind(cid, 'bot', 'El usuario cerro la charla.', now).run(); return J({ ok: true }); }
  let id = clean(b.chat, 40), created = false, lastTs = 0; const iph = await ipHash(request, env);
  if (id) {
    if (!/^[0-9a-f]{32}$/.test(id)) return J({ ok: false, error: 'bad_chat' }, 400);
    const c = await env.DB.prepare('SELECT id FROM help_chats WHERE id = ?').bind(id).first(); if (!c) id = '';
  }
  if (!id) {
    if (iph) { const n = await env.DB.prepare('SELECT COUNT(*) n FROM help_chats WHERE iph = ? AND created > ?').bind(iph, now - 3600).first(); if (n && n.n >= 5) return J({ ok: false, error: 'too_many' }, 429); }
    id = newId(); created = true;
    await env.DB.prepare('INSERT INTO help_chats (id, created, updated, status, path, email, lang, iph, ua, unread_admin) VALUES (?,?,?,?,?,?,?,?,?,0)')
      .bind(id, now, now, 'waiting', clean(b.path, 160), clean(b.email, 120), clean(b.lang, 8), iph, clean(request.headers.get('user-agent'), 120)).run();
    const tr = Array.isArray(b.transcript) ? b.transcript.slice(-16) : [];
    for (const m of tr) { const t = clean(m && m.text, 400); if (t) await env.DB.prepare('INSERT INTO help_msgs (chat, role, text, ts) VALUES (?,?,?,?)').bind(id, m.role === 'user' ? 'user' : 'bot', t, now).run(); }
  } else {
    const last = await env.DB.prepare("SELECT ts FROM help_msgs WHERE chat = ? AND role = 'user' ORDER BY id DESC LIMIT 1").bind(id).first();
    if (last && now - last.ts < 1) return J({ ok: false, error: 'slow_down' }, 429);
    lastTs = last ? last.ts : 0;
    const cnt = await env.DB.prepare('SELECT COUNT(*) n FROM help_msgs WHERE chat = ?').bind(id).first(); if (cnt && cnt.n > 300) return J({ ok: false, error: 'limit' }, 429);
    if (b.email) { await env.DB.prepare('UPDATE help_chats SET email = ? WHERE id = ?').bind(clean(b.email, 120), id).run(); if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean(b.email, 120))) await notifyMail(env, { subject: 'Twerkhub chat: el usuario dejo su email', text: 'Email del usuario: ' + clean(b.email, 120) + '\nMensaje: ' + text.slice(0, 500) + '\nResponder desde el panel: https://twerkhub.lat/admin/help/ (o respondele a este mail).', replyTo: clean(b.email, 120) }); }
  }
  const r = await env.DB.prepare('INSERT INTO help_msgs (chat, role, text, ts) VALUES (?,?,?,?)').bind(id, 'user', text, now).run();
  await env.DB.prepare("UPDATE help_chats SET updated = ?, unread_admin = unread_admin + 1, status = CASE WHEN status = 'open' THEN 'open' ELSE 'waiting' END WHERE id = ?").bind(now, id).run();
  let mailSt; const followUp = !created && b.chat && lastTs && now - lastTs >= 120; if (created || !b.chat || followUp) { const em = clean(b.email, 120); mailSt = await notifyMail(env, { subject: followUp ? 'Nuevo mensaje en el chat de ayuda de Twerkhub' : 'Nuevo chat de ayuda en Twerkhub', text: 'Mensaje: ' + text.slice(0, 500) + '\nEmail del usuario: ' + (em || '(no dejo)') + '\nIdioma: ' + clean(b.lang, 8) + ' · Pagina: ' + clean(b.path, 160) + '\nResponder: https://twerkhub.lat/admin/help/', replyTo: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) ? em : undefined }); }
  if (created || !b.chat) await notify(env, 'Nuevo chat de ayuda en Twerkhub: ' + text.slice(0, 200) + '\nResponder: https://twerkhub.lat/admin/help/');
  return J({ ok: true, chat: id, id: r.meta && r.meta.last_row_id, ahead: await ahead(env, id), ...(b.diag ? { mail: mailSt } : {}) });
}

// Cuantos chats en espera se crearon antes que este (posicion en la fila).
async function ahead(env, id) { const r = await env.DB.prepare("SELECT COUNT(*) n FROM help_chats WHERE status = 'waiting' AND created < (SELECT created FROM help_chats WHERE id = ?)").bind(id).first(); return (r && r.n) || 0; }
