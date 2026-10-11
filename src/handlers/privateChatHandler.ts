import type { WASocket } from '@whiskeysockets/baileys';
import { AntiPrivateRepository } from '../database/repositories/antiPrivateRepository';
import { config } from '../config/env';
import { extractJidNumber } from '../utils/parser';
import { collectSenderJids, isOwnerFromJids } from '../utils/permissions';
import logger from '../utils/logger';

/**
 * Handler anti-private-chat.
 *
 * Tujuan: mencegah orang menghubungi nomor bot secara pribadi (DM).
 * - Mengirim peringatan otomatis (sekali saja) ke pengirim DM.
 * - Menghitung bubble chat per pengirim.
 * - Menandai BLOCKED_INTERNAL bila melewati batas (blocklist internal bot,
 *   BUKAN pemblokiran akun WhatsApp).
 * - Pesan dari owner tidak diproses sebagai DM biasa.
 */

// Daftar fitur yang diizinkan via DM (owner commands tetap diproses terpisah)
// Tidak ada command grup yang diproses sebagai DM biasa.

function buildWarningText(senderNumber: string): string {
  const ownerName = config.ownerName;
  const ownerNumber = config.ownerNumber;

  return (
    `⚠️ *PERINGATAN — JANGAN CHAT NOMOR BOT INI*\n\n` +
    `Halo! Nomor ini khusus digunakan untuk sistem bot WhatsApp grup dan tidak ` +
    `melayani pertanyaan melalui chat pribadi.\n\n` +
    `Jika kamu memiliki pertanyaan, mengalami kendala, atau ingin menyewa bot ini, ` +
    `silakan hubungi owner bot:\n\n` +
    `👤 Owner: ${ownerName}\n` +
    `📱 WhatsApp: wa.me/${ownerNumber}\n\n` +
    `Mohon jangan mengirim pesan kembali ke nomor bot ini.\n\n` +
    `ℹ️ _Pemberitahuan kebijakan:_ Pengelola menetapkan kebijakan denda Rp100.000 ` +
    `untuk pelanggaran yang tercakup dalam ketentuan layanan yang telah disepakati. ` +
    `Pesan ini merupakan pemberitahuan kebijakan, bukan bukti otomatis adanya utang.\n\n` +
    `Terima kasih atas pengertiannya.`
  );
}

/**
 * Proses pesan pribadi (DM) masuk.
 * Mengembalikan true jika pesan sudah ditangani (tidak perlu diproses lebih lanjut).
 */
export async function handlePrivateMessage(sock: WASocket, msg: any): Promise<boolean> {
  const settings = AntiPrivateRepository.getSettings();

  // Jika fitur dimatikan, biarkan pesan lewat (tidak ditangani di sini)
  if (!settings.enabled) return false;

  const senderJid: string = msg.key?.remoteJid ?? '';
  const senderNumber = extractJidNumber(senderJid);

  // Jangan proses pesan dari owner (termasuk deteksi via LID/alt JID)
  const senderJids = collectSenderJids(msg);
  if (isOwnerFromJids(senderJids, msg) || senderNumber === config.ownerNumber) {
    return false;
  }

  // Jangan proses pesan dari diri sendiri (bot)
  if (msg.key?.fromMe) return false;

  // Jika pengirim sudah diblokir internal, jangan balas lagi
  if (AntiPrivateRepository.isBlocked(senderJid)) {
    logger.debug({ senderJid }, 'Pesan dari nomor BLOCKED_INTERNAL diabaikan');
    return true; // ditangani (diabaikan)
  }

  // Tambah hitungan bubble chat
  let counter;
  try {
    counter = AntiPrivateRepository.increment(senderJid);
  } catch (error) {
    logger.error({ error }, 'Gagal menambah counter private chat');
    return true; // Jangan proses command apapun di DM demi keamanan
  }

  // Kirim peringatan sekali saja
  if (counter.warned === 0) {
    try {
      await sock.sendMessage(senderJid, { text: buildWarningText(senderNumber) });
      AntiPrivateRepository.markWarned(senderJid);
    } catch (error) {
      logger.error({ error, senderJid }, 'Gagal mengirim peringatan private');
    }
  }

  // Cek apakah mencapai batas
  if (counter.message_count >= settings.message_limit) {
    if (settings.auto_block) {
      // Catat sebagai BLOCKED_INTERNAL (blocklist internal bot)
      AntiPrivateRepository.markBlocked(senderJid);
      logger.warn(
        { senderJid, count: counter.message_count },
        'Pengirim mencapai batas & diblokir INTERNAL (bukan blokir WhatsApp)'
      );

      // Notifikasi owner
      try {
        const ownerJid = `${config.ownerNumber}@s.whatsapp.net`;
        await sock.sendMessage(ownerJid, {
          text:
            `⚠️ *Anti-Private Alert*\n\n` +
            `Nomor *${senderNumber}* telah mengirim ${counter.message_count} pesan pribadi ` +
            `dan ditandai *BLOCKED_INTERNAL* (bot berhenti membalas).\n\n` +
            `ℹ️ Ini blocklist internal bot, bukan pemblokiran akun WhatsApp.`,
        });
      } catch {
        // abaikan jika gagal kirim ke owner
      }
    } else {
      logger.info(
        { senderJid, count: counter.message_count },
        'Pengirim mencapai batas pesan (auto-block OFF)'
      );
    }
  }

  return true; // Pesan DM sudah ditangani, jangan lanjut ke command handler
}
