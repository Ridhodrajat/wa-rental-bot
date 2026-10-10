import { getDatabase } from '../db';
import { RentalRecord, RentalStatus, RentalHistoryRecord } from '../../types';
import { nowUtc } from '../../utils/time';

export class RentalRepository {
  static getByGroupId(groupId: string): RentalRecord | null {
    const db = getDatabase();
    return (
      (db
        .prepare('SELECT * FROM rentals WHERE group_id = ?')
        .get(groupId) as unknown as RentalRecord | undefined) ?? null
    );
  }

  static getAll(): RentalRecord[] {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM rentals ORDER BY expires_at ASC')
      .all() as unknown as RentalRecord[];
  }

  static getActiveRentals(): RentalRecord[] {
    const db = getDatabase();
    return db
      .prepare("SELECT * FROM rentals WHERE status = 'ACTIVE' ORDER BY expires_at ASC")
      .all() as unknown as RentalRecord[];
  }

  static getExpiredGraceRentals(): RentalRecord[] {
    const db = getDatabase();
    return db
      .prepare("SELECT * FROM rentals WHERE status = 'EXPIRED_GRACE' ORDER BY grace_until ASC")
      .all() as unknown as RentalRecord[];
  }

  static create(data: {
    group_id: string;
    expires_at: string;
    grace_until: string;
    created_by: string;
  }): RentalRecord {
    const db = getDatabase();
    const now = nowUtc();
    db.prepare(`
      INSERT INTO rentals (group_id, status, expires_at, grace_until, created_by, created_at, updated_at)
      VALUES (?, 'ACTIVE', ?, ?, ?, ?, ?)
    `).run(data.group_id, data.expires_at, data.grace_until, data.created_by, now, now);

    return this.getByGroupId(data.group_id)!;
  }

  static update(data: {
    group_id: string;
    status: RentalStatus;
    expires_at: string;
    grace_until: string;
  }): void {
    const db = getDatabase();
    const now = nowUtc();
    db.prepare(`
      UPDATE rentals
      SET status = ?, expires_at = ?, grace_until = ?, updated_at = ?
      WHERE group_id = ?
    `).run(data.status, data.expires_at, data.grace_until, now, data.group_id);
  }

  static updateStatus(groupId: string, status: RentalStatus): void {
    const db = getDatabase();
    db.prepare('UPDATE rentals SET status = ?, updated_at = ? WHERE group_id = ?').run(
      status,
      nowUtc(),
      groupId
    );
  }

  static delete(groupId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM rentals WHERE group_id = ?').run(groupId);
  }

  static logHistory(data: {
    group_id: string;
    action: 'CREATE' | 'EXTEND' | 'EXPIRE' | 'DELETE' | 'RESTORE';
    days_added: number | null;
    previous_expires_at: string | null;
    new_expires_at: string | null;
    performed_by: string;
    note: string | null;
  }): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO rental_history (
        group_id, action, days_added, previous_expires_at, new_expires_at, performed_by, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.group_id,
      data.action,
      data.days_added,
      data.previous_expires_at,
      data.new_expires_at,
      data.performed_by,
      data.note,
      nowUtc()
    );
  }

  static getHistory(groupId: string): RentalHistoryRecord[] {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM rental_history WHERE group_id = ? ORDER BY id DESC')
      .all(groupId) as unknown as RentalHistoryRecord[];
  }
}
