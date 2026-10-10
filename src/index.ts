import { ensureRuntimeDirs, config } from './config/env';
import { initDatabase, closeDatabase } from './database/db';
import { runMigrations } from './database/migrations';
import { startWhatsApp } from './connection/whatsapp';
import { RentalService } from './services/rentalService';
import { BackupService } from './services/backupService';
import logger from './utils/logger';

/**
 * Entry point utama aplikasi WA Rental Bot.
 */

async function main(): Promise<void> {
  logger.info({ version: config.version }, 'Memulai WA Rental Bot');

  // Ensure direktori persisten ada
  ensureRuntimeDirs();

  // Inisialisasi DB & migrasi
  const db = initDatabase();
  runMigrations(db);

  // Jalankan scheduler pemeriksaan rental & backup (housekeeping)
  // Dilakukan setiap 1 jam secara periodik
  const schedulerIntervalMs = 60 * 60 * 1000;
  setInterval(() => {
    try {
      logger.info('Menjalankan housekeeping scheduler...');
      RentalService.processExpired();
      BackupService.createBackup();
    } catch (error) {
      logger.error({ error }, 'Error pada scheduler');
    }
  }, schedulerIntervalMs);

  // Jalankan pemeriksaan awal saat startup
  RentalService.processExpired();

  // Start WhatsApp connection
  await startWhatsApp();

  // Shutdown handler
  const shutdown = (): void => {
    logger.info('Menghentikan aplikasi...');
    closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error({ error }, 'Gagal menjalankan aplikasi');
  process.exit(1);
});
