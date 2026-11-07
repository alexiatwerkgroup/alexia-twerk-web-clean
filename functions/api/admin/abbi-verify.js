import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { OWNER } from '../../_lib/catalog.js';

const VIDEO_RE = /^(0[1-9]|[12][0-9]|3[0-6])$/;

export async function onRequestGet({ request, env }) {
  if (!env.DB || !env.ABBI_VIDEOS) return json({ ok: false, error: 'not_configured' }, 503);
  const identity = await authenticate(request, env).catch(() => null);
  if (!identity?.sub) return json({ ok: false, error: 'login_required' }, 401);
  const user = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(identity.sub).first();
  if (String(user?.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS abbi_verifications (
    n TEXT PRIMARY KEY, key TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL,
    duration REAL NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
    video_codec TEXT NOT NULL, audio_codec TEXT NOT NULL, verified_at INTEGER NOT NULL
  )`).run();
  const rows = await env.DB.prepare('SELECT n,key,size,verified_at FROM abbi_verifications ORDER BY n').all();
  return json({ ok: true, videos: rows.results || [] });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.ABBI_VIDEOS) return json({ ok: false, error: 'not_configured' }, 503);
  const identity = await authenticate(request, env).catch(() => null);
  if (!identity?.sub) return json({ ok: false, error: 'login_required' }, 401);
  const user = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(identity.sub).first();
  if (String(user?.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);

  const body = await request.json().catch(() => ({}));
  const n = String(body.n || '');
  const key = `abbi/v${n}.mp4`;
  const size = Number(body.size);
  const sha256 = String(body.sha256 || '').toLowerCase();
  const duration = Number(body.duration);
  const width = Number(body.width), height = Number(body.height);
  const videoCodec = String(body.videoCodec || ''), audioCodec = String(body.audioCodec || '');
  if (!VIDEO_RE.test(n) || body.key !== key || !Number.isSafeInteger(size) || size < 1 ||
      !/^[a-f0-9]{64}$/.test(sha256) || !Number.isFinite(duration) || duration <= 0 ||
      !Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1 ||
      !videoCodec || !audioCodec || body.localObjectMatch !== true || body.decodeOk !== true) {
    return json({ ok: false, error: 'verification_data_required' }, 400);
  }

  const object = await env.ABBI_VIDEOS.head(key);
  if (!object || object.size !== size) return json({ ok: false, error: 'object_size_mismatch', key }, 409);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS abbi_verifications (
    n TEXT PRIMARY KEY, key TEXT NOT NULL, size INTEGER NOT NULL, sha256 TEXT NOT NULL,
    duration REAL NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
    video_codec TEXT NOT NULL, audio_codec TEXT NOT NULL, verified_at INTEGER NOT NULL
  )`).run();
  await env.DB.prepare(`INSERT INTO abbi_verifications
    (n,key,size,sha256,duration,width,height,video_codec,audio_codec,verified_at)
    VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(n) DO UPDATE SET
    key=excluded.key,size=excluded.size,sha256=excluded.sha256,duration=excluded.duration,
    width=excluded.width,height=excluded.height,video_codec=excluded.video_codec,
    audio_codec=excluded.audio_codec,verified_at=excluded.verified_at`)
    .bind(n, key, size, sha256, duration, width, height, videoCodec, audioCodec, Date.now()).run();
  return json({ ok: true, key, size, verified: true });
}
