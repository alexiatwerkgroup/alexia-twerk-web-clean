// Chat de ayuda dentro de la plataforma: bot primero (en el navegador), y si el visitante lo pide pasa a un agente (el dueño) desde /admin/help/.
let ready = false;
export async function ensureHelp(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS help_chats (id TEXT PRIMARY KEY, created INTEGER, updated INTEGER, status TEXT, path TEXT, email TEXT, lang TEXT, iph TEXT, ua TEXT, unread_admin INTEGER DEFAULT 0)'),
    db.prepare('CREATE TABLE IF NOT EXISTS help_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT, role TEXT, text TEXT, ts INTEGER)'),
    db.prepare('CREATE INDEX IF NOT EXISTS help_msgs_chat ON help_msgs (chat, id)'),
    db.prepare('CREATE TABLE IF NOT EXISTS help_meta (k TEXT PRIMARY KEY, v INTEGER)'),
    db.prepare('CREATE INDEX IF NOT EXISTS help_chats_upd ON help_chats (status, updated)')
  ]);
  ready = true;
}
export const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export function newId() { const a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a).map(x => x.toString(16).padStart(2, '0')).join(''); }
export async function ipHash(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || ''; if (!ip) return '';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((env.IP_HASH_SALT || 'twerkhub-ip-v1') + '|' + ip));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('');
}
export async function notify(env, text) {
  if (!env.HELP_WEBHOOK_URL) return;
  try { await fetch(env.HELP_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: text.slice(0, 1800) }) }); } catch (e) {}
}

// Aviso por mail al soporte (responder desde Gmail llega al usuario si dejo su email via reply-to).
export async function notifyMail(env, { subject, text, replyTo }) {
  try {
    const { sendEmail } = await import('./resend.js');
    const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    await sendEmail(env, { to: env.HELP_NOTIFY_EMAIL || 'twerkhub.lat@gmail.com', subject, text, html: '<pre style="font:14px/1.5 system-ui;white-space:pre-wrap">' + esc(text) + '</pre>', replyTo });
    return 'ok';
  } catch (e) { return 'fail: ' + String(e && e.message || e).slice(0, 160); }
}

// Resumen por mail: como maximo 1 cada 10 min, con TODOS los mensajes de visitantes que entraron desde el ultimo mail.
// Sin cron: se revisa en cada llamada al chat (visitante o panel). Reclamo atomico para no duplicar.
export async function flushDigest(env, now) {
  try {
    const db = env.DB, GAP = 600;
    await db.prepare("INSERT OR IGNORE INTO help_meta (k, v) VALUES ('mail_ts', 0), ('mail_msg', 0)").run();
    const ts = await db.prepare("SELECT v FROM help_meta WHERE k = 'mail_ts'").first();
    if (ts && now - ts.v < GAP) return;
    const from = (await db.prepare("SELECT v FROM help_meta WHERE k = 'mail_msg'").first() || { v: 0 }).v;
    const rows = (await db.prepare("SELECT m.id, m.chat, m.text, m.ts, c.email, c.lang, c.path FROM help_msgs m JOIN help_chats c ON c.id = m.chat WHERE m.role = 'user' AND m.id > ? ORDER BY m.id LIMIT 60").bind(from).all()).results || [];
    if (!rows.length) return;
    const claim = await db.prepare("UPDATE help_meta SET v = ? WHERE k = 'mail_ts' AND v = ?").bind(now, ts ? ts.v : 0).run();
    if (!claim.meta || !claim.meta.changes) return;
    await db.prepare("UPDATE help_meta SET v = ? WHERE k = 'mail_msg'").bind(rows[rows.length - 1].id).run();
    const by = {}; rows.forEach(r => (by[r.chat] = by[r.chat] || []).push(r));
    const chats = Object.keys(by);
    const text = rows.length + ' mensaje(s) nuevo(s) en ' + chats.length + ' chat(s) de ayuda de Twerkhub:\n\n' + chats.map(c => {
      const a = by[c], h = a[0];
      return '— Chat ' + c.slice(0, 6) + ' · ' + (h.email || 'sin email') + ' · ' + (h.lang || '?') + ' · ' + (h.path || '') + '\n' + a.map(m => '   ' + new Date(m.ts * 1000).toISOString().slice(11, 16) + ' UTC  ' + m.text.slice(0, 400)).join('\n');
    }).join('\n\n') + '\n\nResponder: https://twerkhub.lat/admin/help/';
    const em = chats.length === 1 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(by[chats[0]][0].email || '') ? by[chats[0]][0].email : undefined;
    await notifyMail(env, { subject: 'Twerkhub ayuda: ' + rows.length + ' mensaje(s) nuevo(s)', text, replyTo: em });
  } catch (e) {}
}
