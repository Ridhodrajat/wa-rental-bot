import { getDatabase } from '../db';
import { ProductRecord } from '../../types';
import { nowUtc } from '../../utils/time';

export class ProductRepository {
  /**
   * Normalisasi nama produk untuk pencarian case-insensitive.
   */
  static normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  static getByGroupId(groupId: string): ProductRecord[] {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM products WHERE group_id = ? ORDER BY id ASC')
      .all(groupId) as unknown as ProductRecord[];
  }

  static findByName(groupId: string, name: string): ProductRecord | null {
    const db = getDatabase();
    const normalized = this.normalizeName(name);
    return (
      (db
        .prepare('SELECT * FROM products WHERE group_id = ? AND name = ?')
        .get(groupId, normalized) as unknown as ProductRecord | undefined) ?? null
    );
  }

  static create(groupId: string, originalName: string, description: string): ProductRecord {
    const db = getDatabase();
    const normalized = this.normalizeName(originalName);
    const now = nowUtc();

    db.prepare(`
      INSERT INTO products (group_id, name, original_name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(groupId, normalized, originalName, description, now, now);

    return this.findByName(groupId, normalized)!;
  }

  static update(
    groupId: string,
    oldName: string,
    newOriginalName: string,
    newDescription: string
  ): void {
    const db = getDatabase();
    const oldNormalized = this.normalizeName(oldName);
    const newNormalized = this.normalizeName(newOriginalName);

    db.prepare(`
      UPDATE products
      SET name = ?, original_name = ?, description = ?, updated_at = ?
      WHERE group_id = ? AND name = ?
    `).run(newNormalized, newOriginalName, newDescription, nowUtc(), groupId, oldNormalized);
  }

  static updateDescription(groupId: string, name: string, description: string): void {
    const db = getDatabase();
    const normalized = this.normalizeName(name);
    db.prepare(`
      UPDATE products
      SET description = ?, updated_at = ?
      WHERE group_id = ? AND name = ?
    `).run(description, nowUtc(), groupId, normalized);
  }

  static delete(groupId: string, name: string): void {
    const db = getDatabase();
    const normalized = this.normalizeName(name);
    db.prepare('DELETE FROM products WHERE group_id = ? AND name = ?').run(groupId, normalized);
  }

  static deleteAllForGroup(groupId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM products WHERE group_id = ?').run(groupId);
  }
}
