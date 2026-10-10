import { DisconnectReason } from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import logger from '../utils/logger';
import {
  isConnected,
  incrementReconnectAttempts,
  getMaxReconnectAttempts,
  resetReconnectAttempts,
  startWhatsApp,
} from '../connection/whatsapp';

/**
 * Handler update koneksi WhatsApp.
 */
export async function onConnectionUpdate(
  update: any,
  sock: WASocket,
  onConnected: () => void
): Promise<void> {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    logger.info('QR Code ditampilkan di terminal');
  }

  if (connection === 'connecting') {
    logger.info('Menghubungkan ke WhatsApp...');
  } else if (connection === 'open') {
    logger.info('✅ Bot terkoneksi ke WhatsApp');
    resetReconnectAttempts();
    onConnected();
  } else if (connection === 'close') {
    const shouldReconnect =
      (lastDisconnect?.error as Boom)?.output?.statusCode !==
      DisconnectReason.loggedOut;

    logger.warn(
      { reason: (lastDisconnect?.error as Boom)?.output?.statusCode },
      'Koneksi WhatsApp ditutup'
    );

    if (shouldReconnect) {
      const attempts = incrementReconnectAttempts();
      const maxAttempts = getMaxReconnectAttempts();

      if (attempts > maxAttempts) {
        logger.error(
          { attempts, maxAttempts },
          'Gagal reconnect setelah banyak percobaan'
        );
        process.exit(1);
      }

      const delay = Math.min(5000 * attempts, 30000);
      logger.info({ attempts, delay }, `Reconnect dalam ${delay}ms`);
      setTimeout(() => {
        startWhatsApp().catch((error) => {
          logger.error({ error }, 'Error saat reconnect');
        });
      }, delay);
    } else {
      logger.error('Bot logout atau session invalid');
      process.exit(1);
    }
  }
}
