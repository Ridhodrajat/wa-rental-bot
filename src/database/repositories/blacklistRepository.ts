import { getDatabase } from '../db';
import { BlacklistRecord } from '../../types';
import { nowUtc } from '../../utils/time';

/**
 * Repository blacklist per grup (penyimpanan permanen).
 * Nomor dinormalisasi (hanya digit) agar konsisten antar format input.
 */

export function normalizeNumber(input: string | null | undefined): string {
  return (input ?? '').replace(/[^0-9]/g, '');
}

export class BlacklistRepository {
  /** Cache nomor blacklist per grup agar pengecekan tiap pesan tidak query DB. */
  private static cache = new Map<string, Set<string>>();

  private static invalidate(groupId: string): void {
    this.cache.delete(groupId);
  }

  static clearCache(): void {
    this.cache.clear();
  }

  /** Set nomor blacklist grup (cached). */
  static getNumberSet(groupId: string): Set<string> {
    let set = this.cache.get(groupId);
    if (!set) {
      set = new Set(this.getAll(groupId).map((b) => b.number));
      this.cache.set(groupId, set);
    }
    return set;
  }

  /** Tambah atau perbarui nomor pada blacklist grup. */
  static add(
    groupId: string,
    number: string,
    reason: string | null,
    addedBy: string | null
  ): BlacklistRecord {
    const db = getDatabase();
    const normalized = normalizeNumber(number);
    const now = nowUtc();
    db.prepare(
      `INSERT INTO blacklist (group_id, number, reason, added_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(group_id, number)
       DO UPDATE SET reason = excluded.reason, updated_at = excluded.updated_at`
    ).run(groupId, normalized, reason, addedBy, now, now);
    this.invalidate(groupId);
    return this.get(groupId, normalized)!;
  }

  /** Perbarui alasan blacklist. Mengembalikan false bila nomor tidak ada. */
  static updateReason(groupId: string, number: string, reason: string | null): boolean {
    const db = getDatabase();
    const info = db
      .prepare('UPDATE blacklist SET reason = ?, updated_at = ? WHERE group_id = ? AND number = ?')
      .run(reason, nowUtc(), groupId, normalizeNumber(number));
    this.invalidate(groupId);
    return Number(info.changes) > 0;
  }

  /** Hapus nomor dari blacklist. Mengembalikan false bila tidak ada. */
  static remove(groupId: string, number: string): boolean {
    const db = getDatabase();
    const info = db
      .prepare('DELETE FROM blacklist WHERE group_id = ? AND number = ?')
      .run(groupId, normalizeNumber(number));
    this.invalidate(groupId);
    return Number(info.changes) > 0;
  }

  static get(groupId: string, number: string): BlacklistRecord | null {
    const db = getDatabase();
    return (
      (db
        .prepare('SELECT * FROM blacklist WHERE group_id = ? AND number = ?')
        .get(groupId, normalizeNumber(number)) as unknown as BlacklistRecord | undefined) ?? null
    );
  }

  static getAll(groupId: string): BlacklistRecord[] {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM blacklist WHERE group_id = ? ORDER BY created_at ASC')
      .all(groupId) as unknown as BlacklistRecord[];
  }

  static count(groupId: string): number {
    const db = getDatabase();
    const row = db
      .prepare('SELECT COUNT(*) as c FROM blacklist WHERE group_id = ?')
      .get(groupId) as unknown as { c: number } | undefined;
    return row?.c ?? 0;
  }

  static isBlacklisted(groupId: string, number: string): boolean {
    const normalized = normalizeNumber(number);
    if (!normalized) return false;
    return this.get(groupId, normalized) !== null;
  }
}
