import { readdirSync, readFileSync } from 'node:fs';
export function transaction(db, callback) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function migrate(db) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  );
  const directory = new URL('./migrations/', import.meta.url);
  for (const name of readdirSync(directory)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    if (db.prepare('SELECT 1 FROM schema_migrations WHERE name=?').get(name)) continue;
    transaction(db, () => {
      db.exec(readFileSync(new URL(name, directory), 'utf8'));
      db.prepare('INSERT INTO schema_migrations VALUES (?,?)').run(name, new Date().toISOString());
    });
  }
}
