// Owner-only (session or X-Grant-Key). POST /api/jenny/notify { subject, message, link? , test? }
//   -> emails every subscriber of Jenny updates (one email each, addresses never exposed). test:true sends only to the owner.
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { sendEmail } from '../../_lib/resend.js';
import { OWNER } from '../../_lib/jenny.js';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  const key = request.headers.get('X-Grant-Key') || '';
  const keyOk = !!env.GRANT_KEY && env.GRANT_KEY.length >= 24 && key === env.GRANT_KEY;
  if (!keyOk) { const me = await authenticate(request, env); if (!me || String(me.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'forbidden' }, 403); }
  let b = {}; try { b = await request.json(); } catch {}
  const subject = String(b.subject || '').trim().slice(0, 140), message = String(b.message || '').trim().slice(0, 2000);
  if (!subject || !message) return json({ ok: false, error: 'subject_and_message_required' }, 400);
  const link = /^https:\/\/twerkhub\.lat\//.test(b.link || '') ? b.link : 'https://twerkhub.lat/jenny/';
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#0b0b10;color:#fff;padding:28px;border-radius:12px"><div style="font-size:12px;letter-spacing:.2em;color:#ff8a00">TWERKHUB · JENNY</div><h2 style="margin:12px 0">${esc(subject)}</h2><p style="line-height:1.5;color:#ddd">${esc(message).replace(/\n/g, '<br>')}</p><p><a href="${link}" style="display:inline-block;background:#ff8a00;color:#000;padding:14px 22px;border-radius:6px;text-decoration:none;font-weight:700">See the new videos</a></p><p style="font-size:11px;color:#888">You get this because you tapped “Get notified” on Jenny's page. Turn it off anytime with the same button: https://twerkhub.lat/jenny/ · Adults 18+ only.</p></div>`;
  let to = [OWNER];
  if (!b.test) { const r = await env.DB.prepare('SELECT email FROM jenny_follow ORDER BY created').all(); to = (r.results || []).map(x => x.email); }
  let sent = 0, failed = 0;
  for (const email of to.slice(0, 500)) { try { await sendEmail(env, { to: email, subject, html }); sent++; } catch (e) { if (String(e.message) === 'resend_not_configured') return json({ ok: false, error: 'resend_not_configured' }, 501); failed++; } }
  return json({ ok: true, sent, failed, total: to.length });
}
