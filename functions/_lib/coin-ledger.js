// Shared, private audit trail for every change to the coin wallet.
export async function ensureCoinLedger(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS coin_movements (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    delta INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    kind TEXT NOT NULL,
    reference TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_coin_movements_email_time ON coin_movements(email, created_at DESC)').run();
}

export function recordCoinMovement(db, email, delta, kind, reference = '') {
  return db.prepare(`INSERT INTO coin_movements (id,email,delta,balance_after,kind,reference)
    SELECT ?, lower(?), ?, coins, ?, ? FROM jenny_coins WHERE lower(email)=lower(?) AND changes()=1`)
    .bind(crypto.randomUUID(), email, delta, kind, reference, email);
}
