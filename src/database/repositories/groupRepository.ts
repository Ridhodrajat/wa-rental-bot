import { getDatabase } from '../db';
import { GroupRecord } from '../../types';
import { nowUtc } from '../../utils/time';

export class GroupRepository {
  /**
   * Buat atau dapatkan grup berdasarkan group_id.
   */
  static upsertGroup(groupId: string, groupName: string): GroupRecord {
    const db = getDatabase();

    let group = this.getGroupById(groupId);
    if (group) {
      if (group.group_name !== groupName) {
        db.prepare('UPDATE groups SET group_name = ?, updated_at = ? WHERE group_id = ?').run(
          groupName,
          nowUtc(),
          groupId
        );
      }
      return this.getGroupById(groupId)!;
    }

    const now = nowUtc();
    db.prepare(
      'INSERT INTO groups (group_id, group_name, joined_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(groupId, groupName, now, now, now);

    return this.getGroupById(groupId)!;
  }

  static getGroupById(groupId: string): GroupRecord | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT * FROM groups WHERE group_id = ?')
      .get(groupId) as unknown as GroupRecord | undefined;
    return row ?? null;
  }

  static getAllGroups(): GroupRecord[] {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM groups ORDER BY created_at DESC')
      .all() as unknown as GroupRecord[];
  }

  static deleteGroup(groupId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM groups WHERE group_id = ?').run(groupId);
  }

  static getGroupName(groupId: string): string | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT group_name FROM groups WHERE group_id = ?')
      .get(groupId) as unknown as { group_name: string } | undefined;
    return row?.group_name ?? null;
  }
}
