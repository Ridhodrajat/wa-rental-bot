import { config } from '../config/env';
import { RentalRepository } from '../database/repositories/rentalRepository';
import { UsageRepository } from '../database/repositories/usageRepository';
import { RentalPlan } from '../types';
import { formatBusinessDate } from '../utils/time';

/**
 * Status akses sebuah grup berdasarkan paket sewanya.
 */
export interface PlanAccess {
  plan: RentalPlan;
  isTrial: boolean;
  used: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
}

/**
 * Satu pintu untuk semua aturan paket (trial vs berbayar).
 *
 * Default aman: grup tanpa data rental dianggap `paid` supaya tidak ada
 * iklan atau pembatasan yang bocor ke chat di luar grup berbayar.
 */
export class PlanService {
  static getPlan(groupId: string): RentalPlan {
    return RentalRepository.getPlan(groupId) ?? 'paid';
  }

  static getAccess(groupId: string): PlanAccess {
    const plan = this.getPlan(groupId);
    const limit = config.trialDailyLimit;

    if (plan !== 'trial') {
      return {
        plan,
        isTrial: false,
        used: 0,
        limit,
        remaining: limit,
        limitReached: false,
      };
    }

    const date = formatBusinessDate();
    const used = UsageRepository.getCount(groupId, date);

    return {
      plan,
      isTrial: true,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      limitReached: used >= limit,
    };
  }

  /**
   * Ubah paket grup dan reset kuota hari ini, agar perubahan langsung terasa.
   */
  static setPlan(groupId: string, plan: RentalPlan): void {
    RentalRepository.updatePlan(groupId, plan);
    UsageRepository.reset(groupId, formatBusinessDate());
  }

  /**
   * Catat satu balasan bot untuk grup trial.
   * Mengembalikan `allowed: false` bila kuota harian sudah habis.
   */
  static consume(groupId: string): { allowed: boolean; access: PlanAccess } {
    const access = this.getAccess(groupId);
    if (!access.isTrial) return { allowed: true, access };
    if (access.limitReached) return { allowed: false, access };

    const date = formatBusinessDate();
    const used = UsageRepository.increment(groupId, date);

    return {
      allowed: true,
      access: {
        ...access,
        used,
        remaining: Math.max(0, access.limit - used),
        limitReached: used >= access.limit,
      },
    };
  }

  /**
   * Tandai notifikasi "kuota habis" sudah dikirim hari ini.
   * Mengembalikan true hanya pada pemanggilan pertama.
   */
  static notifyLimitOnce(groupId: string): boolean {
    return UsageRepository.markLimitNotified(groupId, formatBusinessDate());
  }
}
