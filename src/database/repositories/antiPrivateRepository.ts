import { getDatabase } from '../db';
import { AntiPrivateSettingsRecord, PrivateChatCounterRecord } from '../../types';
import { nowUtc } from '../../utils/time';

/**
 * Repository untuk fitur anti-private-chat.
 * - anti_private_settings: konfigurasi global (hanya owner).
 * - private_chat_counters: penghitung bubble chat per pengirim.
 */

export class AntiPrivateRepository {
  static getSettings(): AntiPrivateSettingsRecord {
    const db = getDatabase();
    const row = db
      .prepare('SELECT enabled, message_limit, auto_block FROM anti_private_settings WHERE id = 1')
      .get() as unknown as AntiPrivateSettingsRecord | undefined;
    if (row) return row;
    // Fallback aman jika baris belum ada
    return { enabled: 1, message_limit: 5, auto_block: 0 };
  }

  static setEnabled(enabled: boolean): void {
    const db = getDatabase();
    db.prepare(
      'UPDATE anti_private_settings SET enabled = ?, updated_at = ? WHERE id = 1'
    ).run(enabled ? 1 : 0, nowUtc());
  }

  static setMessageLimit(limit: number): void {
    const db = getDatabase();
    db.prepare(
      'UPDATE anti_private_settings SET message_limit = ?, updated_at = ? WHERE id = 1'
    ).run(limit, nowUtc());
  }

  static setAutoBlock(enabled: boolean): void {
    const db = getDatabase();
    db.prepare(
      'UPDATE anti_private_settings SET auto_block = ?, updated_at = ? WHERE id = 1'
    ).run(enabled ? 1 : 0, nowUtc());
  }

  /**
   * Tambah hitungan pesan untuk pengirim.
   * Mengembalikan record terbaru.
   */
  static increment(userJid: string): PrivateChatCounterRecord {
    const db = getDatabase();
    const now = nowUtc();
    db.prepare(`
      INSERT INTO private_chat_counters (user_jid, message_count, warned, blocked, last_message_at)
      VALUES (?, 1, 0, 0, ?)
      ON CONFLICT(user_jid) DO UPDATE SET
        message_count = message_count + 1,
        last_message_at = excluded.last_message_at
    `).run(userJid, now);
    return this.getCounter(userJid)!;
  }

  static getCounter(userJid: string): PrivateChatCounterRecord | null {
    const db = getDatabase();
    return (
      (db
        .prepare('SELECT * FROM private_chat_counters WHERE user_jid = ?')
        .get(userJid) as unknown as PrivateChatCounterRecord | undefined) ?? null
    );
  }

  static markWarned(userJid: string): void {
    const db = getDatabase();
    db.prepare('UPDATE private_chat_counters SET warned = 1 WHERE user_jid = ?').run(userJid);
  }

  static markBlocked(userJid: string): void {
    const db = getDatabase();
    db.prepare('UPDATE private_chat_counters SET blocked = 1 WHERE user_jid = ?').run(userJid);
  }

  static isBlocked(userJid: string): boolean {
    const counter = this.getCounter(userJid);
    return counter?.blocked === 1;
  }

  static getAllCounters(): PrivateChatCounterRecord[] {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM private_chat_counters ORDER BY message_count DESC')
      .all() as unknown as PrivateChatCounterRecord[];
  }

  static resetCounter(userJid: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM private_chat_counters WHERE user_jid = ?').run(userJid);
  }
}
