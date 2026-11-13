// Chat de ayuda dentro de la plataforma: bot primero (en el navegador), y si el visitante lo pide pasa a un agente (el dueño) desde /admin/help/.
let ready = false;
export async function ensureHelp(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS help_chats (id TEXT PRIMARY KEY, created INTEGER, updated INTEGER, status TEXT, path TEXT, email TEXT, lang TEXT, iph TEXT, ua TEXT, unread_admin INTEGER DEFAULT 0)'),
    db.prepare('CREATE TABLE IF NOT EXISTS help_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT, role TEXT, text TEXT, ts INTEGER)'),
    db.prepare('CREATE INDEX IF NOT EXISTS help_msgs_chat ON help_msgs (chat, id)'),
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
  } catch (e) {}
}
