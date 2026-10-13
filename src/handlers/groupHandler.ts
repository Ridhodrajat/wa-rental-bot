import type { WASocket, GroupParticipant } from '@whiskeysockets/baileys';
import { WelcomeGoodbyeRepository } from '../database/repositories/settingsRepository';
import { RentalService } from '../services/rentalService';
import { GroupRepository } from '../database/repositories/groupRepository';
import { getDefaultTemplate } from '../templates/messageTemplates';
import { resolveTemplate, displayNameFromJid } from '../utils/placeholder';
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

  // Ambil nama grup
  let groupName = 'Grup';
  try {
    const meta = await sock.groupMetadata(groupId);
    groupName = meta?.subject ?? 'Grup';
  } catch {
    // abaikan
  }

  if (action === 'add') {
    const template = config?.welcome_template ?? getDefaultTemplate('welcome');
    if (!config || !config.welcome_enabled) return;

    for (const participant of participants) {
      const { text, mentions } = resolveTemplate(template, {
        user: displayNameFromJid(participant),
        userJid: participant,
        groupName,
      });

      await sock.sendMessage(groupId, {
        text,
        mentions,
      });
    }
  } else if (action === 'remove') {
    const template = config?.goodbye_template ?? getDefaultTemplate('goodbye');
    if (!config || !config.goodbye_enabled) return;

    for (const participant of participants) {
      const { text, mentions } = resolveTemplate(template, {
        user: displayNameFromJid(participant),
        userJid: participant,
        groupName,
      });

      await sock.sendMessage(groupId, {
        text,
        mentions,
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
        'Bot dimasukkan ke grup tanpa otorisasi aktif. Menunggu owner mengaktifkan sewa.'
      );

      try {
        await sock.sendMessage(groupId, {
          text:
            `⚠️ *Bot Sewa Terotorisasi*\n\n` +
            `Grup ini belum memiliki masa sewa aktif.\n` +
            `Owner dapat menambahkan sewa dengan perintah:\n` +
            `*.addsewa <durasi>*\n\n` +
            `Contoh: *.addsewa 30h*\n\n` +
            `Bot akan keluar otomatis jika sewa tidak ditambahkan.`,
        });
      } catch (error) {
        logger.error({ error, groupId }, 'Gagal mengirim peringatan grup tidak terotorisasi');
      }
    } else {
      logger.info({ groupId, groupName }, 'Bot dimasukkan ke grup terotorisasi');
    }
  }
}
