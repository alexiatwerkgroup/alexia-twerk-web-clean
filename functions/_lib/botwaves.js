// Descarta "olas" de bots que se colaron como humanos: en una misma hora, una misma ciudad manda >= 40 visitantes
// distintos, casi sin referrer. Reversible: guarda cada hit tocado en tw_hits_reclass_backup. Solo horas ya cerradas.
let lastRun = 0;
export async function sweepBotWaves(db, now = Date.now()) {
  if (now - lastRun < 600000) return;
  lastRun = now;
  try {
    await db.prepare('CREATE TABLE IF NOT EXISTS tw_hits_reclass_backup (hid TEXT PRIMARY KEY, old_human INTEGER, reason TEXT, at INTEGER)').run();
    const to = Math.floor(now / 3600000) * 3600000, from = to - 72 * 3600000;
    const where = `human = 1 AND uid IS NULL AND ref = '' AND ts >= ? AND ts < ?
      AND ((ts/3600000) || '|' || country || '|' || city) IN (
        SELECT (ts/3600000) || '|' || country || '|' || city FROM tw_hits WHERE ts >= ? AND ts < ?
        GROUP BY ts/3600000, country, city
        HAVING COUNT(DISTINCT vid) >= 40 AND SUM(CASE WHEN ref <> '' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) < 0.1)`;
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO tw_hits_reclass_backup (hid, old_human, reason, at) SELECT hid, human, 'auto-wave', ? FROM tw_hits WHERE ${where}`).bind(now, from, to, from, to),
      db.prepare(`UPDATE tw_hits SET human = 0 WHERE ${where}`).bind(from, to, from, to),
    ]);
  } catch (error) { console.warn('sweepBotWaves failed:', error); }
}
