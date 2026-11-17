import { config } from '../config/env';
import type { PlanAccess } from '../services/planService';

/**
 * Materi iklan & pesan upsell untuk paket trial (gratis).
 * Semua teks di sini adalah satu-satunya sumber kebenaran agar harga
 * dan kontak tidak berbeda antar pesan.
 */

export const TRIAL_AD_MARKER = 'IDAIDO BOT · TRIAL';

export const PRICE_WEEKLY = 5000;
export const PRICE_MONTHLY = 10000;

export function formatRupiah(value: number): string {
  return `Rp${value.toLocaleString('id-ID')}`;
}

export const OWNER_WA_LINK = `wa.me/${config.ownerNumber}`;

export function buildPriceLine(): string {
  return `💳 Mingguan ${formatRupiah(PRICE_WEEKLY)} · Bulanan ${formatRupiah(PRICE_MONTHLY)}`;
}

/**
 * Iklan ringkas yang ditempel di akhir balasan bot pada grup trial.
 */
export function buildTrialAd(access: PlanAccess): string {
  return (
    `╭─〔 ${TRIAL_AD_MARKER} 〕\n` +
    `│ Kuota hari ini: ${access.used}/${access.limit} balasan\n` +
    `│ Buka semua fitur & hilangkan iklan\n` +
    `│ ${buildPriceLine()}\n` +
    `│ 📩 ${OWNER_WA_LINK}\n` +
    `╰──────────────`
  );
}

/**
 * Tempel iklan ke balasan. Iklan tidak ditempel pada pesan peringatan/error
 * agar tidak mengganggu, dan tidak pernah dobel.
 */
export function appendTrialAd(text: string, access: PlanAccess): string {
  if (!access.isTrial) return text;
  if (text.includes(TRIAL_AD_MARKER)) return text;

  const trimmed = text.trimStart();
  const skipPrefixes = ['⚠️', '⚠', '❌', '⏳', '🔒'];
  if (skipPrefixes.some((prefix) => trimmed.startsWith(prefix))) return text;

  return `${text}\n\n${buildTrialAd(access)}`;
}

/**
 * Pesan saat kuota balasan trial habis (dikirim sekali per hari).
 */
export function buildLimitNotice(access: PlanAccess): string {
  return (
    `⏳ *Kuota Trial Habis*\n\n` +
    `Kuota balasan hari ini (*${access.limit}*) sudah terpakai.\n` +
    `Kuota direset otomatis pukul 00.00 WIB.\n\n` +
    `Ingin balasan tanpa batas + semua fitur terbuka?\n` +
    `${buildPriceLine()}\n` +
    `📩 ${OWNER_WA_LINK}`
  );
}

/**
 * Pesan saat perintah premium dipakai di grup trial.
 */
export function buildPremiumLockedMessage(commandName: string, access: PlanAccess): string {
  return (
    `🔒 *Fitur Terkunci*\n\n` +
    `Perintah \`${config.botPrefix}${commandName}\` hanya tersedia di paket *Berbayar*.\n\n` +
    `🆓 *Trial* — ${access.limit} balasan/hari, ada iklan, fitur dasar\n` +
    `💎 *Berbayar* — tanpa iklan, tanpa batas, semua fitur terbuka\n\n` +
    `${buildPriceLine()}\n` +
    `📩 ${OWNER_WA_LINK}`
  );
}
