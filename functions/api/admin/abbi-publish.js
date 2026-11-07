import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { ensureTables, OWNER } from '../../_lib/catalog.js';

export async function onRequestPost({ request, env }) {
  const storage = env.ABBI_VIDEOS;
  if (!env.DB || !storage) return json({ ok: false, error: 'not_configured' }, 503);
  const identity = await authenticate(request, env);
  if (!identity?.sub) return json({ ok: false, error: 'login_required' }, 401);
  const user = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(identity.sub).first();
  if (String(user?.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);
  const body = await request.json().catch(() => ({}));
  const numbers = [...new Set(Array.isArray(body.videos) ? body.videos.map(String) : [])];
  if (numbers.length !== 36 || numbers.some(n => !/^(0[1-9]|[12][0-9]|3[0-6])$/.test(n))) {
    return json({ ok: false, error: 'bad_videos' }, 400);
  }
  numbers.sort();
  await ensureTables(env);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS abbi_publications (n TEXT PRIMARY KEY, published_at INTEGER NOT NULL)').run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS abbi_verifications (
    n TEXT PRIMARY KEY, key TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL,
    duration REAL NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
    video_codec TEXT NOT NULL, audio_codec TEXT NOT NULL, verified_at INTEGER NOT NULL
  )`).run();
  for (const n of numbers) {
    if (!/^(0[1-9]|[12][0-9]|3[0-6])$/.test(n)) return json({ ok: false, error: 'bad_videos' }, 400);
    const key = `abbi/v${n}.mp4`;
    const file = await storage.head(key);
    if (!file) return json({ ok: false, error: 'video_missing', video: n }, 409);
    const verified = await env.DB.prepare('SELECT key,size,sha256 FROM abbi_verifications WHERE n=?').bind(n).first();
    if (!verified || verified.key !== key || verified.size !== file.size || !/^[a-f0-9]{64}$/.test(verified.sha256 || '')) {
      return json({ ok: false, error: 'video_not_verified', video: n }, 409);
    }
  }
  for (const n of numbers) {
    await env.DB.prepare('INSERT OR IGNORE INTO abbi_publications (n, published_at) VALUES (?, ?)').bind(n, Date.now()).run();
  }
  return json({ ok: true, published: numbers, notifications_sent: 0 });
}
