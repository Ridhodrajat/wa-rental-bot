import { getDatabase } from '../db';
import {
  TransactionTemplateRecord,
  WelcomeGoodbyeRecord,
  ModerationSettingsRecord,
  GroupSettingsRecord,
  PaymentConfigRecord,
  UserAfkRecord,
} from '../../types';
import { nowUtc } from '../../utils/time';

/**
 * Repository untuk pengaturan grup, template, moderasi, AFK, dan pembayaran.
 * Semua data terisolasi per grup (kecuali payment_config yang bersifat global).
 */

// ============ Transaction Templates ============
export class TransactionTemplateRepository {
  static get(groupId: string): TransactionTemplateRecord | null {
    const db = getDatabase();
    return (
      (db
        .prepare('SELECT * FROM transaction_templates WHERE group_id = ?')
        .get(groupId) as unknown as TransactionTemplateRecord | undefined) ?? null
    );
  }

  static ensure(groupId: string): TransactionTemplateRecord {
    const existing = this.get(groupId);
    if (existing) return existing;
    const db = getDatabase();
    const now = nowUtc();
    db.prepare(`
      INSERT INTO transaction_templates (group_id, proses_template, done_template, created_at, updated_at)
      VALUES (?, NULL, NULL, ?, ?)
    `).run(groupId, now, now);
    return this.get(groupId)!;
  }

  static setProses(groupId: string, template: string | null): void {
    this.ensure(groupId);
    const db = getDatabase();
    db.prepare(
      'UPDATE transaction_templates SET proses_template = ?, updated_at = ? WHERE group_id = ?'
    ).run(template, nowUtc(), groupId);
  }

  static setDone(groupId: string, template: string | null): void {
    this.ensure(groupId);
    const db = getDatabase();
    db.prepare(
      'UPDATE transaction_templates SET done_template = ?, updated_at = ? WHERE group_id = ?'
    ).run(template, nowUtc(), groupId);
  }
}

// ============ Welcome / Goodbye ============
export class WelcomeGoodbyeRepository {
  static get(groupId: string): WelcomeGoodbyeRecord | null {
    const db = getDatabase();
    return (
      (db
        .prepare('SELECT * FROM welcome_goodbye WHERE group_id = ?')
        .get(groupId) as unknown as WelcomeGoodbyeRecord | undefined) ?? null
    );
  }

  static ensure(groupId: string): WelcomeGoodbyeRecord {
    const existing = this.get(groupId);
    if (existing) return existing;
    const db = getDatabase();
    const now = nowUtc();
    db.prepare(`
      INSERT INTO welcome_goodbye (group_id, welcome_enabled, welcome_template, goodbye_enabled, goodbye_template, created_at, updated_at)
      VALUES (?, 0, NULL, 0, NULL, ?, ?)
    `).run(groupId, now, now);
    return this.get(groupId)!;
  }

  static setWelcome(groupId: string, template: string | null, enabled?: boolean): void {
    this.ensure(groupId);
    const db = getDatabase();
    const current = this.get(groupId)!;
    const newEnabled = enabled !== undefined ? (enabled ? 1 : 0) : current.welcome_enabled;
    db.prepare(
      'UPDATE welcome_goodbye SET welcome_template = ?, welcome_enabled = ?, updated_at = ? WHERE group_id = ?'
    ).run(template, newEnabled, nowUtc(), groupId);
  }

  static setGoodbye(groupId: string, template: string | null, enabled?: boolean): void {
    this.ensure(groupId);
    const db = getDatabase();
    const current = this.get(groupId)!;
    const newEnabled = enabled !== undefined ? (enabled ? 1 : 0) : current.goodbye_enabled;
    db.prepare(
      'UPDATE welcome_goodbye SET goodbye_template = ?, goodbye_enabled = ?, updated_at = ? WHERE group_id = ?'
    ).run(template, newEnabled, nowUtc(), groupId);
  }

  static toggleWelcome(groupId: string, enabled: boolean): void {
    this.ensure(groupId);
    const db = getDatabase();
    db.prepare(
      'UPDATE welcome_goodbye SET welcome_enabled = ?, updated_at = ? WHERE group_id = ?'
    ).run(enabled ? 1 : 0, nowUtc(), groupId);
  }

  static toggleGoodbye(groupId: string, enabled: boolean): void {
    this.ensure(groupId);
    const db = getDatabase();
    db.prepare(
      'UPDATE welcome_goodbye SET goodbye_enabled = ?, updated_at = ? WHERE group_id = ?'
    ).run(enabled ? 1 : 0, nowUtc(), groupId);
  }
}

// ============ Moderation Settings ============
export class ModerationRepository {
  static get(groupId: string): ModerationSettingsRecord | null {
    const db = getDatabase();
    return (
      (db
        .prepare('SELECT * FROM moderation_settings WHERE group_id = ?')
        .get(groupId) as unknown as ModerationSettingsRecord | undefined) ?? null
    );
  }

  static ensure(groupId: string): ModerationSettingsRecord {
    const existing = this.get(groupId);
    if (existing) return existing;
    const db = getDatabase();
    const now = nowUtc();
    db.prepare(`
      INSERT INTO moderation_settings (group_id, antiwame_mode, antilink_mode, created_at, updated_at)
      VALUES (?, 0, 0, ?, ?)
    `).run(groupId, now, now);
    return this.get(groupId)!;
  }

  static setAntiwameMode(groupId: string, mode: number): void {
    this.ensure(groupId);
    const db = getDatabase();
    db.prepare(
      'UPDATE moderation_settings SET antiwame_mode = ?, updated_at = ? WHERE group_id = ?'
    ).run(mode, nowUtc(), groupId);
  }

  static setAntilinkMode(groupId: string, mode: number): void {
    this.ensure(groupId);
    const db = getDatabase();
    db.prepare(
      'UPDATE moderation_settings SET antilink_mode = ?, updated_at = ? WHERE group_id = ?'
    ).run(mode, nowUtc(), groupId);
  }
}

// ============ Group Settings ============
export class GroupSettingsRepository {
  static get(groupId: string): GroupSettingsRecord | null {
    const db = getDatabase();
    return (
      (db
        .prepare('SELECT * FROM group_settings WHERE group_id = ?')
        .get(groupId) as unknown as GroupSettingsRecord | undefined) ?? null
    );
  }

  static ensure(groupId: string): GroupSettingsRecord {
    const existing = this.get(groupId);
    if (existing) return existing;
    const db = getDatabase();
    const now = nowUtc();
    db.prepare(`
      INSERT INTO group_settings (group_id, custom_data, jeda_ms, created_at, updated_at)
      VALUES (?, NULL, 1500, ?, ?)
    `).run(groupId, now, now);
    return this.get(groupId)!;
  }

  static setCustomData(groupId: string, customData: string | null): void {
    this.ensure(groupId);
    const db = getDatabase();
    db.prepare(
      'UPDATE group_settings SET custom_data = ?, updated_at = ? WHERE group_id = ?'
    ).run(customData, nowUtc(), groupId);
  }

  static setJeda(groupId: string, jedaMs: number): void {
    this.ensure(groupId);
    const db = getDatabase();
    db.prepare('UPDATE group_settings SET jeda_ms = ?, updated_at = ? WHERE group_id = ?').run(
      jedaMs,
      nowUtc(),
      groupId
    );
  }
}

// ============ Payment Config (global) ============
export class PaymentConfigRepository {
  static get(): PaymentConfigRecord | null {
    const db = getDatabase();
    return (
      (db
        .prepare('SELECT * FROM payment_config ORDER BY id DESC LIMIT 1')
        .get() as unknown as PaymentConfigRecord | undefined) ?? null
    );
  }

  static set(content: string, updatedBy: string): void {
    const db = getDatabase();
    db.prepare('INSERT INTO payment_config (content, updated_by, updated_at) VALUES (?, ?, ?)').run(
      content,
      updatedBy,
      nowUtc()
    );
  }
}

// ============ User AFK ============
export class AfkRepository {
  static get(groupId: string, userJid: string): UserAfkRecord | null {
    const db = getDatabase();
    return (
      (db
        .prepare('SELECT * FROM user_afk WHERE group_id = ? AND user_jid = ?')
        .get(groupId, userJid) as unknown as UserAfkRecord | undefined) ?? null
    );
  }

  static set(groupId: string, userJid: string, reason: string | null): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO user_afk (group_id, user_jid, reason, start_time)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(group_id, user_jid) DO UPDATE SET reason = excluded.reason, start_time = excluded.start_time
    `).run(groupId, userJid, reason, nowUtc());
  }

  static remove(groupId: string, userJid: string): boolean {
    const db = getDatabase();
    const result = db
      .prepare('DELETE FROM user_afk WHERE group_id = ? AND user_jid = ?')
      .run(groupId, userJid);
    return result.changes > 0;
  }

  static getAllForGroup(groupId: string): UserAfkRecord[] {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM user_afk WHERE group_id = ?')
      .all(groupId) as unknown as UserAfkRecord[];
  }
}
