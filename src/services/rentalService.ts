import { RentalRepository } from '../database/repositories/rentalRepository';
import { GroupRepository } from '../database/repositories/groupRepository';
import { RentalRecord, RentalStatus } from '../types';
import { addMs, nowUtc, formatToTimezone } from '../utils/time';
import { config } from '../config/env';
import logger from '../utils/logger';

/**
 * Service rental menangani logika sewa grup.
 * Termasuk pembuatan, perpanjangan, kedaluwarsa, dan restore.
 */

export class RentalService {
  /**
   * Buat rental baru atau perpanjang yang sudah ada.
   * @param durationMs durasi tambahan dalam milidetik.
   */
  static createOrExtend(
    groupId: string,
    durationMs: number,
    createdBy: string
  ): { rental: RentalRecord; action: 'CREATE' | 'EXTEND' | 'RESTORE' } {
    const existing = RentalRepository.getByGroupId(groupId);
    const now = new Date();
    let newExpiresAt: Date;
    let previousExpiresAt: string | null = null;
    let action: 'CREATE' | 'EXTEND' | 'RESTORE' = 'CREATE';

    if (existing && existing.status === 'ACTIVE') {
      // Perpanjang dari expiry yang ada (tidak menghapus sisa durasi)
      newExpiresAt = addMs(existing.expires_at, durationMs);
      previousExpiresAt = existing.expires_at;
      action = 'EXTEND';
    } else if (existing && existing.status === 'EXPIRED_GRACE') {
      // Dalam grace period, restore dan hitung dari sekarang
      newExpiresAt = addMs(now, durationMs);
      previousExpiresAt = existing.expires_at;
      action = 'RESTORE';
    } else {
      // Rental baru
      newExpiresAt = addMs(now, durationMs);
    }

    const graceUntil = addMs(newExpiresAt, config.gracePeriodDays * 24 * 60 * 60 * 1000);

    if (existing) {
      RentalRepository.update({
        group_id: groupId,
        status: 'ACTIVE',
        expires_at: newExpiresAt.toISOString(),
        grace_until: graceUntil.toISOString(),
      });
    } else {
      RentalRepository.create({
        group_id: groupId,
        expires_at: newExpiresAt.toISOString(),
        grace_until: graceUntil.toISOString(),
        created_by: createdBy,
      });
    }

    RentalRepository.logHistory({
      group_id: groupId,
      action: action as 'CREATE' | 'EXTEND' | 'RESTORE',
      days_added: Math.round(durationMs / (24 * 60 * 60 * 1000)),
      previous_expires_at: previousExpiresAt,
      new_expires_at: newExpiresAt.toISOString(),
      performed_by: createdBy,
      note: `Durasi ditambahkan: ${Math.round(durationMs / 60000)} menit`,
    });

    return {
      rental: RentalRepository.getByGroupId(groupId)!,
      action,
    };
  }

  /**
   * Proses rental yang sudah kedaluwarsa.
   * Mengembalikan daftar event notifikasi yang perlu dikirim ke grup.
   */
  static processExpired(): Array<{ groupId: string; event: 'EXPIRED' | 'DELETED' }> {
    const now = new Date();
    const rentals = RentalRepository.getAll();
    const notifications: Array<{ groupId: string; event: 'EXPIRED' | 'DELETED' }> = [];

    for (const rental of rentals) {
      const expiresAt = new Date(rental.expires_at).getTime();
      const graceUntil = new Date(rental.grace_until).getTime();
      const nowTime = now.getTime();

      if (rental.status === 'ACTIVE' && nowTime >= expiresAt) {
        // Ubah status ke grace period
        RentalRepository.updateStatus(rental.group_id, 'EXPIRED_GRACE');
        RentalRepository.logHistory({
          group_id: rental.group_id,
          action: 'EXPIRE',
          days_added: null,
          previous_expires_at: rental.expires_at,
          new_expires_at: null,
          performed_by: 'SYSTEM',
          note: `Memasuki masa tenggang hingga ${formatToTimezone(rental.grace_until)}`,
        });
        logger.info({ groupId: rental.group_id }, 'Rental masuk grace period');
        notifications.push({ groupId: rental.group_id, event: 'EXPIRED' });
      } else if (rental.status === 'EXPIRED_GRACE' && nowTime >= graceUntil) {
        // Hapus rental dan data grup
        RentalRepository.logHistory({
          group_id: rental.group_id,
          action: 'DELETE',
          days_added: null,
          previous_expires_at: null,
          new_expires_at: null,
          performed_by: 'SYSTEM',
          note: 'Data grup dihapus setelah masa tenggang berakhir',
        });
        notifications.push({ groupId: rental.group_id, event: 'DELETED' });
        this.deleteRentalAndGroupData(rental.group_id);
        logger.info({ groupId: rental.group_id }, 'Rental dan data grup dihapus');
      }
    }

    return notifications;
  }

  /**
   * Hapus rental dan semua data terkait grup.
   */
  static deleteRentalAndGroupData(groupId: string): void {
    RentalRepository.delete(groupId);
    GroupRepository.deleteGroup(groupId);
    logger.info({ groupId }, 'Rental dan data grup dihapus');
  }

  /**
   * Hapus rental tanpa menghapus data grup (hanya nonaktifkan).
   */
  static deactivateRental(groupId: string, performedBy: string): void {
    const rental = RentalRepository.getByGroupId(groupId);
    if (!rental) return;

    RentalRepository.updateStatus(groupId, 'DELETED');
    RentalRepository.logHistory({
      group_id: groupId,
      action: 'DELETE',
      days_added: null,
      previous_expires_at: rental.expires_at,
      new_expires_at: null,
      performed_by: performedBy,
      note: 'Rental dinonaktifkan oleh owner',
    });
  }

  static isRentalActive(groupId: string): boolean {
    const rental = RentalRepository.getByGroupId(groupId);
    return rental?.status === 'ACTIVE';
  }

  static getRentalInfo(groupId: string): RentalRecord | null {
    return RentalRepository.getByGroupId(groupId);
  }
}
