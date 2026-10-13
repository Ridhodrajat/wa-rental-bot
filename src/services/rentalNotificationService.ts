import { getSocket, getGroupMetadata } from '../connection/whatsapp';
import { GroupRepository } from '../database/repositories/groupRepository';
import { getDefaultTemplate } from '../templates/messageTemplates';
import { resolveTemplate } from '../utils/placeholder';
import logger from '../utils/logger';

/**
 * Mengirimkan notifikasi rental ke grup dengan hidetag semua anggota.
 * Digunakan saat rental expired masuk grace period atau habis total.
 */

export class RentalNotificationService {
  static async sendExpiredNotification(groupId: string): Promise<void> {
    await this.sendNotification(groupId, 'rental_expired');
  }

  static async sendDeletedNotification(groupId: string): Promise<void> {
    await this.sendNotification(groupId, 'rental_deleted');
  }

  private static async sendNotification(
    groupId: string,
    feature: 'rental_expired' | 'rental_deleted'
  ): Promise<void> {
    const sock = getSocket();

    try {
      const metadata = await getGroupMetadata(groupId);
      const groupName = metadata?.subject ?? GroupRepository.getGroupName(groupId) ?? 'Grup';
      const mentions = metadata?.participants.map((p) => p.id) ?? [];

      const template = getDefaultTemplate(feature);
      const { text } = resolveTemplate(template, {
        groupName,
      });

      await sock.sendMessage(groupId, {
        text,
        mentions,
      });

      logger.info({ groupId, feature, mentionsCount: mentions.length }, 'Notifikasi rental terkirim');
    } catch (error) {
      logger.error({ error, groupId, feature }, 'Gagal mengirim notifikasi rental');
    }
  }
}
