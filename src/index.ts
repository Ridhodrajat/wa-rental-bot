import { ensureRuntimeDirs, config } from './config/env';
import { initDatabase, closeDatabase } from './database/db';
import { runMigrations } from './database/migrations';
import { startWhatsApp } from './connection/whatsapp';
import { RentalService } from './services/rentalService';
import { RentalNotificationService } from './services/rentalNotificationService';
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

  // Muat override nomor owner dari database (jika ada)
  try {
    const { GlobalConfigRepository } = await import('./database/repositories/globalConfigRepository');
    const override = GlobalConfigRepository.get('owner_number_override');
    if (override && /^[0-9]{8,}$/.test(override)) {
      config.ownerNumber = override;
      logger.info({ ownerNumber: override }, 'Nomor owner override dimuat dari database');
    }
  } catch (error) {
    logger.warn({ error }, 'Gagal memuat override owner, memakai .env');
  }

  async function runRentalHousekeeping(): Promise<void> {
    try {
      logger.info('Menjalankan housekeeping scheduler...');
      const notifications = RentalService.processExpired();

      // Kirim notifikasi ke grup yang terkena expired / deleted
      for (const notification of notifications) {
        try {
          if (notification.event === 'EXPIRED') {
            await RentalNotificationService.sendExpiredNotification(notification.groupId);
          } else {
            await RentalNotificationService.sendDeletedNotification(notification.groupId);
          }
        } catch (error) {
          logger.error({ error, notification }, 'Gagal mengirim notifikasi rental scheduler');
        }
      }

      BackupService.createBackup();
    } catch (error) {
      logger.error({ error }, 'Error pada scheduler');
    }
  }

  // Jalankan scheduler pemeriksaan rental & backup (housekeeping)
  // Dilakukan setiap 5 menit agar notifikasi tepat waktu
  const schedulerIntervalMs = 5 * 60 * 1000;
  setInterval(() => {
    void runRentalHousekeeping();
  }, schedulerIntervalMs);

  // Jalankan pemeriksaan awal saat startup
  await runRentalHousekeeping();

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
