import { getDatabase } from '../db';
import { nowUtc } from '../../utils/time';

export interface DailyUsageRecord {
  group_id: string;
  usage_date: string;
  response_count: number;
  limit_notified: number;
  updated_at: string;
}

/**
 * Pencatat pemakaian balasan bot per grup per hari.
 * Dipakai untuk menegakkan kuota paket trial.
 */
export class UsageRepository {
  static get(groupId: string, date: string): DailyUsageRecord | null {
    const db = getDatabase();
    return (
      (db
        .prepare('SELECT * FROM daily_usage WHERE group_id = ? AND usage_date = ?')
        .get(groupId, date) as unknown as DailyUsageRecord | undefined) ?? null
    );
  }

  static getCount(groupId: string, date: string): number {
    return this.get(groupId, date)?.response_count ?? 0;
  }

  /**
   * Tambah satu pemakaian dan kembalikan jumlah terbaru.
   */
  static increment(groupId: string, date: string): number {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO daily_usage (group_id, usage_date, response_count, limit_notified, updated_at)
      VALUES (?, ?, 1, 0, ?)
      ON CONFLICT(group_id, usage_date) DO UPDATE SET
        response_count = response_count + 1,
        updated_at = excluded.updated_at
    `).run(groupId, date, nowUtc());

    return this.getCount(groupId, date);
  }

  /**
   * Tandai bahwa notifikasi kuota habis sudah dikirim hari ini.
   * Mengembalikan true bila notifikasi baru saja ditandai (belum pernah dikirim).
   */
  static markLimitNotified(groupId: string, date: string): boolean {
    const db = getDatabase();
    const existing = this.get(groupId, date);
    if (existing?.limit_notified === 1) return false;

    db.prepare(`
      INSERT INTO daily_usage (group_id, usage_date, response_count, limit_notified, updated_at)
      VALUES (?, ?, 0, 1, ?)
      ON CONFLICT(group_id, usage_date) DO UPDATE SET
        limit_notified = 1,
        updated_at = excluded.updated_at
    `).run(groupId, date, nowUtc());

    return true;
  }

  static reset(groupId: string, date: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM daily_usage WHERE group_id = ? AND usage_date = ?').run(groupId, date);
  }

  /**
   * Hapus riwayat pemakaian lama agar tabel tidak tumbuh tanpa batas.
   */
  static deleteBefore(date: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM daily_usage WHERE usage_date < ?').run(date);
  }
}
