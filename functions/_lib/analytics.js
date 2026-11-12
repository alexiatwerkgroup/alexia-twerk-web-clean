// TWERKHUB · first-party analytics (no IPs stored). Tables are created on first use.
export const OWNER = 'alexiatwerkoficial@gmail.com';
let ready = false, initializing = null;
export async function init(db) {
  if (ready) return;
  if (initializing) return initializing;
  initializing = (async () => {
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS tw_hits (hid TEXT PRIMARY KEY, ts INTEGER, vid TEXT, path TEXT, country TEXT, region TEXT, city TEXT, tz TEXT, device TEXT, browser TEXT, os TEXT, lang TEXT, ref TEXT, is_new INTEGER, reg INTEGER, dur INTEGER DEFAULT 0, scroll INTEGER DEFAULT 0)'),
      db.prepare('CREATE TABLE IF NOT EXISTS tw_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, hid TEXT, vid TEXT, name TEXT, detail TEXT)'),
      db.prepare('CREATE INDEX IF NOT EXISTS tw_hits_ts ON tw_hits(ts)'),
      db.prepare('CREATE INDEX IF NOT EXISTS tw_hits_vid ON tw_hits(vid)'),
      db.prepare('CREATE INDEX IF NOT EXISTS tw_ev_ts ON tw_events(ts)'),
    ]);
    const columns = new Set(((await db.prepare('PRAGMA table_info(tw_hits)').all()).results || []).map(row => row.name));
    for (const c of ['human INTEGER DEFAULT 0','lat REAL','lon REAL','uid TEXT','last_active INTEGER','last_engaged INTEGER','iph TEXT']) {
      if (columns.has(c.split(' ')[0])) continue;
      try { await db.prepare('ALTER TABLE tw_hits ADD COLUMN ' + c).run(); }
      catch (error) { if (!/duplicate column name/i.test(String(error?.message || error))) throw error; }
    }
    await db.prepare('CREATE INDEX IF NOT EXISTS tw_hits_active ON tw_hits(last_active)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS tw_hits_uid_active ON tw_hits(uid,last_active)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS tw_hits_human_ts ON tw_hits(human,ts)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS tw_hits_vid_ts ON tw_hits(vid,ts)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS tw_hits_iph_ts ON tw_hits(iph,ts)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS tw_events_vid_ts ON tw_events(vid,ts)').run();
    await db.prepare('CREATE TABLE IF NOT EXISTS tw_marks (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, label TEXT, channel TEXT)').run();
    ready = true;
  })();
  try { await initializing; } finally { initializing = null; }
}
export function parseUA(ua) {
  ua = ua || '';
  const device = /iPad|Tablet/i.test(ua) ? 'Tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  return { device, browser, os };
}
export const isBot = ua => !ua || /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|monitor|curl|wget|python|axios|node-fetch|go-http|scrapy/i.test(ua);
export function cookie(req, name) { const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
