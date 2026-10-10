import fs from 'fs';
import path from 'path';
import { getDatabase } from '../database/db';
import logger from '../utils/logger';

/**
 * Service backup dan restore otomatis untuk database.
 */

export class BackupService {
  static getBackupDir(): string {
    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  static createBackup(): string {
    const db = getDatabase();
    const backupDir = this.getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.sqlite`);

    try {
      // node:sqlite mendukung vacuum ke target file untuk backup
      db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
      logger.info({ backupPath }, 'Backup database berhasil dibuat');

      this.cleanOldBackups(10);
      return backupPath;
    } catch (error) {
      logger.error({ error }, 'Gagal membuat backup database');
      throw error;
    }
  }

  static cleanOldBackups(keepCount: number = 10): void {
    const backupDir = this.getBackupDir();
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.sqlite'))
      .map((f) => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > keepCount) {
      const toDelete = files.slice(keepCount);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        logger.info({ file: file.name }, 'Backup lama dihapus');
      }
    }
  }

  static listBackups(): string[] {
    const backupDir = this.getBackupDir();
    return fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith('.sqlite'))
      .sort()
      .reverse();
  }
}
