import { getDatabase } from '../db';
import { nowUtc } from '../../utils/time';

/**
 * Repository konfigurasi global (key-value) yang hanya dikelola owner.
 */

export class GlobalConfigRepository {
  static get(key: string): string | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT value FROM global_config WHERE key = ?')
      .get(key) as unknown as { value: string } | undefined;
    return row?.value ?? null;
  }

  static set(key: string, value: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO global_config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, nowUtc());
  }

  static delete(key: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM global_config WHERE key = ?').run(key);
  }
}
