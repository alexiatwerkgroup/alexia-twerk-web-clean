import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { ensureTables, OWNER } from '../../_lib/catalog.js';
import { sendEmail } from '../../_lib/resend.js';

export async function onRequestPost({ request, env }) {
  const storage = env.ABBI_VIDEOS || env.JENNY_VIDEOS;
  if (!env.DB || !storage) return json({ ok: false, error: 'not_configured' }, 503);
  const identity = await authenticate(request, env);
  if (!identity?.sub) return json({ ok: false, error: 'login_required' }, 401);
  const user = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(identity.sub).first();
  if (String(user?.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);
  const body = await request.json().catch(() => ({}));
  const numbers = [...new Set(Array.isArray(body.videos) ? body.videos.map(String) : [])];
  if (!numbers.length || numbers.length > 99 || numbers.some(n => !/^(0[1-9]|[1-9][0-9])$/.test(n))) {
    return json({ ok: false, error: 'bad_videos' }, 400);
  }
  await ensureTables(env);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS abbi_publications (n TEXT PRIMARY KEY, published_at INTEGER NOT NULL)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS abbi_launch_notice (email TEXT PRIMARY KEY, sent_at INTEGER NOT NULL)').run();
  for (const n of numbers) {
    const file = await storage.head(`abbi/v${n}.mp4`);
    if (!file) return json({ ok: false, error: 'video_missing', video: n }, 409);
  }
  for (const n of numbers) {
    await env.DB.prepare('INSERT OR IGNORE INTO abbi_publications (n, published_at) VALUES (?, ?)').bind(n, Date.now()).run();
  }
  let sent = 0, failed = 0;
  if (body.notify) {
    const result = await env.DB.prepare("SELECT f.email FROM catalog_follow f LEFT JOIN abbi_launch_notice n ON n.email = f.email WHERE f.slug = 'abbi' AND n.email IS NULL ORDER BY f.created LIMIT 50").all();
    for (const row of result.results || []) {
      try {
        await sendEmail(env, {
          to: row.email,
          subject: 'Abbi is live on Twerkhub',
          html: '<div style="font:16px/1.6 Arial,sans-serif;max-width:520px;margin:auto;background:#110b12;color:#fff;padding:28px"><h1 style="color:#ff6fa8">Abbi is live.</h1><p>Her first videos are now on Twerkhub.</p><p><a href="https://twerkhub.lat/abbi/#videos" style="display:inline-block;padding:14px 20px;background:#ff6fa8;color:#180a12;font-weight:bold;text-decoration:none">See Abbi’s videos</a></p><p style="font-size:12px;color:#bfb6c0">You requested one launch alert on Abbi’s page. You can turn notifications off there at any time. Adults 18+ only.</p></div>'
        });
        await env.DB.prepare('INSERT OR IGNORE INTO abbi_launch_notice (email, sent_at) VALUES (?, ?)').bind(row.email, Date.now()).run();
        sent++;
      } catch (error) {
        failed++;
        if (String(error?.message) === 'resend_not_configured') return json({ ok: true, published: numbers, sent, failed, notice_error: 'email_not_configured' });
      }
    }
  }
  const pendingRow = await env.DB.prepare("SELECT COUNT(*) AS pending FROM catalog_follow f LEFT JOIN abbi_launch_notice n ON n.email = f.email WHERE f.slug = 'abbi' AND n.email IS NULL").first();
  return json({ ok: true, published: numbers, sent, failed, pending: pendingRow?.pending || 0 });
}
