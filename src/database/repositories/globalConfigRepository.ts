import { getDatabase } from '../db';
import { nowUtc } from '../../utils/time';

export interface GlobalConfigRecord {
  key: string;
  value: string;
  updated_at: string;
}

export class GlobalConfigRepository {
  static get(key: string): string | null {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM global_config WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  static set(key: string, value: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO global_config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, nowUtc());
  }

  static getInt(key: string, defaultValue: number): number {
    const val = this.get(key);
    return val ? parseInt(val, 10) : defaultValue;
  }
}
