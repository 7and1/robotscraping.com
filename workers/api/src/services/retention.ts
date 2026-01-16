export async function cleanupExpiredData(db: D1Database, now: number = Date.now()): Promise<void> {
  await db.prepare('DELETE FROM scrape_logs WHERE retention_until < ?').bind(now).run();
  await db.prepare('DELETE FROM event_logs WHERE retention_until < ?').bind(now).run();
  await db.prepare('DELETE FROM idempotency_entries WHERE expires_at < ?').bind(now).run();
  await db.prepare('DELETE FROM rate_limit_entries WHERE window_start < ?').bind(now).run();
}

export async function setRetentionPeriod(
  db: D1Database,
  table: 'scrape_logs' | 'event_logs',
  id: string,
  days: number,
): Promise<void> {
  const retentionUntil = Date.now() + days * 24 * 60 * 60 * 1000;
  await db
    .prepare(`UPDATE ${table} SET retention_until = ? WHERE id = ?`)
    .bind(retentionUntil, id)
    .run();
}
