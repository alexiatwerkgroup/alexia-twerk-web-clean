import { isOwner, isVip, retiredCfg, isRetired } from './vip.js';

let accessTableReady;
export async function ensureClipAccess(db) {
  if (!accessTableReady) accessTableReady = db.prepare('CREATE TABLE IF NOT EXISTS nv_clip_access (kind TEXT NOT NULL, slug TEXT NOT NULL, vid INTEGER NOT NULL, start INTEGER NOT NULL DEFAULT 0, slow INTEGER NOT NULL DEFAULT 0, access TEXT NOT NULL DEFAULT \'public\', PRIMARY KEY(kind,slug,vid,start,slow))').run().catch((e) => { accessTableReady = null; throw e; });
  await accessTableReady;
}

export async function clipAccessMap(db, kind, slug) {
  await ensureClipAccess(db);
  const rows = (await db.prepare('SELECT vid,start,slow,access FROM nv_clip_access WHERE kind=? AND slug=?').bind(kind, slug).all()).results || [];
  const out = {};
  rows.forEach((r) => { out[`${r.vid}/${r.start || 0}/${r.slow ? 1 : 0}`] = r.access === 'vip' ? 'vip' : 'public'; });
  return out;
}

export async function clipCanView(request, env, kind, slug, vid, start = 0, slow = 0) {
  if (isRetired(await retiredCfg(env), slug, vid)) return await isOwner(request, env);
  if (await isOwner(request, env) || await isVip(request, env)) return true;
  await ensureClipAccess(env.DB);
  const row = await env.DB.prepare('SELECT access FROM nv_clip_access WHERE kind=? AND slug=? AND vid=? AND start=? AND slow=?').bind(kind, slug, vid, start || 0, slow ? 1 : 0).first();
  return !row || row.access !== 'vip';
}

export async function changeClipAccess(request, env, kind, slug, vid, start = 0, slow = 0, access) {
  if (!(await isOwner(request, env))) return false;
  await ensureClipAccess(env.DB);
  await env.DB.prepare('INSERT INTO nv_clip_access(kind,slug,vid,start,slow,access) VALUES(?,?,?,?,?,?) ON CONFLICT(kind,slug,vid,start,slow) DO UPDATE SET access=excluded.access').bind(kind, slug, vid, start || 0, slow ? 1 : 0, access).run();
  return true;
}
