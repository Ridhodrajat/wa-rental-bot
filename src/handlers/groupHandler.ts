import type { WASocket, GroupParticipant } from '@whiskeysockets/baileys';
import { WelcomeGoodbyeRepository } from '../database/repositories/settingsRepository';
import { RentalService } from '../services/rentalService';
import { GroupRepository } from '../database/repositories/groupRepository';
import logger from '../utils/logger';

/**
 * Handler event ketika ada anggota grup yang masuk atau keluar (welcome/goodbye).
 * Dan handler ketika bot ditambahkan ke grup baru.
 */

export async function handleGroupParticipantsUpdate(
  sock: WASocket,
  update: { id: string; participants: string[]; action: 'add' | 'remove' | 'promote' | 'demote' }
): Promise<void> {
  const { id: groupId, participants, action } = update;

  // Hanya jalankan jika rental aktif
  if (!RentalService.isRentalActive(groupId)) return;

  const config = WelcomeGoodbyeRepository.get(groupId);

  if (action === 'add') {
    if (!config || !config.welcome_enabled || !config.welcome_template) return;

    for (const participant of participants) {
      const number = participant.split('@')[0];
      const message = config.welcome_template
        .replace(/@user/g, `@${number}`)
        .replace(/@group/g, 'Grup');

      await sock.sendMessage(groupId, {
        text: message,
        mentions: [participant],
      });
    }
  } else if (action === 'remove') {
    if (!config || !config.goodbye_enabled || !config.goodbye_template) return;

    for (const participant of participants) {
      const number = participant.split('@')[0];
      const message = config.goodbye_template
        .replace(/@user/g, `@${number}`)
        .replace(/@group/g, 'Grup');

      await sock.sendMessage(groupId, {
        text: message,
        mentions: [participant],
      });
    }
  }
}

/**
 * Handler ketika bot diinvite / masuk ke grup baru.
 * Aturan Otorisasi:
 * Bot hanya beroperasi jika grup sudah diotorisasi oleh owner.
 * Jika belum, kirim pesan penolakan dan leave grup dengan aman.
 */
export async function handleGroupsUpsert(
  sock: WASocket,
  groups: any[]
): Promise<void> {
  for (const group of groups) {
    const groupId = group.id;
    if (!groupId) continue;

    let groupName = group.subject ?? 'Unknown Group';
    try {
      const meta = await sock.groupMetadata(groupId);
      if (meta) groupName = meta.subject;
    } catch {
      // Abaikan jika tidak bisa ambil metadata
    }

    // Catat / daftarkan grup di DB
    GroupRepository.upsertGroup(groupId, groupName);

    // Cek apakah rental aktif
    const isActive = RentalService.isRentalActive(groupId);

    if (!isActive) {
      logger.warn(
        { groupId, groupName },
        'Bot dimasukkan ke grup tanpa otorisasi aktif. Keluar dari grup.'
      );

      try {
        await sock.sendMessage(groupId, {
          text: `⚠️ Bot ini adalah bot sewa terotorisasi.\n\nGrup ini belum memiliki masa sewa aktif.\nSilakan hubungi owner bot untuk menyewa/mengotorisasi grup ini.\n\nBot akan keluar dari grup.`,
        });
        await sock.groupLeave(groupId);
      } catch (error) {
        logger.error({ error, groupId }, 'Gagal keluar dari grup tidak terotorisasi');
      }
    } else {
      logger.info({ groupId, groupName }, 'Bot dimasukkan ke grup terotorisasi');
    }
  }
}
