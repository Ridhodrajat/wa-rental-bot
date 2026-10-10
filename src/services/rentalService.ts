import { RentalRepository } from '../database/repositories/rentalRepository';
import { GroupRepository } from '../database/repositories/groupRepository';
import { RentalRecord, RentalStatus } from '../types';
import { addDays, nowUtc, formatToTimezone } from '../utils/time';
import { config } from '../config/env';
import logger from '../utils/logger';

/**
 * Service rental menangani logika sewa grup.
 * Termasuk pembuatan, perpanjangan, kedaluwarsa, dan restore.
 */

export class RentalService {
  /**
   * Buat rental baru atau perpanjang yang sudah ada.
   */
  static createOrExtend(
    groupId: string,
    daysToAdd: number,
    createdBy: string
  ): { rental: RentalRecord; action: 'CREATE' | 'EXTEND' | 'RESTORE' } {
    const existing = RentalRepository.getByGroupId(groupId);
    const now = new Date();
    let newExpiresAt: Date;
    let previousExpiresAt: string | null = null;
    let action: 'CREATE' | 'EXTEND' | 'RESTORE' = 'CREATE';

    if (existing && existing.status === 'ACTIVE') {
      // Perpanjang dari expiry yang ada
      newExpiresAt = addDays(existing.expires_at, daysToAdd);
      previousExpiresAt = existing.expires_at;
      action = 'EXTEND';
    } else if (existing && existing.status === 'EXPIRED_GRACE') {
      // Dalam grace period, restore dan hitung dari sekarang
      newExpiresAt = addDays(now, daysToAdd);
      previousExpiresAt = existing.expires_at;
      action = 'RESTORE';
    } else {
      // Rental baru
      newExpiresAt = addDays(now, daysToAdd);
    }

    const graceUntil = addDays(newExpiresAt, config.gracePeriodDays);

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
      days_added: daysToAdd,
      previous_expires_at: previousExpiresAt,
      new_expires_at: newExpiresAt.toISOString(),
      performed_by: createdBy,
      note: `${daysToAdd} hari ditambahkan`,
    });

    return {
      rental: RentalRepository.getByGroupId(groupId)!,
      action,
    };
  }

  /**
   * Proses rental yang sudah kedaluwarsa.
   */
  static processExpired(): void {
    const now = new Date();
    const rentals = RentalRepository.getAll();

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
        this.deleteRentalAndGroupData(rental.group_id);
        logger.info({ groupId: rental.group_id }, 'Rental dan data grup dihapus');
      }
    }
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
