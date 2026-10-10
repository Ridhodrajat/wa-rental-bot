import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { config } from '../config/env';
import logger from '../utils/logger';

let dbInstance: DatabaseSync | null = null;

/**
 * Inisialisasi database SQLite menggunakan node:sqlite bawaan Node.js (v22+).
 * Tidak memerlukan C++ build tools atau external binary binding.
 */
export function initDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbPath = config.databasePath;
  logger.info({ dbPath }, 'Inisialisasi database (node:sqlite)');

  try {
    const db = new DatabaseSync(dbPath);

    // Aktifkan foreign key dan WAL mode
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA journal_mode = WAL;');

    dbInstance = db;
    logger.info('Database berhasil diinisialisasi');
    return db;
  } catch (error) {
    logger.error({ error }, 'Gagal inisialisasi database');
    throw error;
  }
}

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    throw new Error('Database belum diinisialisasi. Panggil initDatabase() terlebih dahulu.');
  }
  return dbInstance;
}

/**
 * Setter khusus untuk keperluan pengujian (inject in-memory database).
 */
export function setDatabaseForTesting(db: DatabaseSync | null): void {
  dbInstance = db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database ditutup');
  }
}
