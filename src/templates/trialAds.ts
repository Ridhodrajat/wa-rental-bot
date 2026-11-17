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
 * Iklan ringkas satu blok (2 baris) untuk ditaruh di AWAL pesan panjang
 * seperti katalog dengan banyak produk, supaya tetap terlihat tanpa scroll.
 */
export function buildTrialAdCompact(access: PlanAccess): string {
  return (
    `🆓 *TRIAL* ${access.used}/${access.limit} · ` +
    `${formatRupiah(PRICE_WEEKLY)}/minggu · ${formatRupiah(PRICE_MONTHLY)}/bulan\n` +
    `📩 ${OWNER_WA_LINK}`
  );
}

/**
 * Pesan dianggap panjang bila melebihi ambang ini. Untuk pesan panjang,
 * iklan ringkas ditaruh di atas agar tidak tenggelam di bawah katalog.
 */
const LONG_MESSAGE_CHARS = 900;
const LONG_MESSAGE_LINES = 18;

export function isLongMessage(text: string): boolean {
  return text.length > LONG_MESSAGE_CHARS || text.split('\n').length > LONG_MESSAGE_LINES;
}

/**
 * Tempel iklan ke balasan. Iklan tidak ditempel pada pesan peringatan/error
 * agar tidak mengganggu, dan tidak pernah dobel.
 *
 * - Pesan pendek: iklan lengkap di bawah.
 * - Pesan panjang (katalog banyak produk): iklan ringkas di atas + lengkap di bawah.
 */
export function appendTrialAd(text: string, access: PlanAccess): string {
  if (!access.isTrial) return text;
  if (text.includes(TRIAL_AD_MARKER)) return text;

  const trimmed = text.trimStart();
  const skipPrefixes = ['⚠️', '⚠', '❌', '⏳', '🔒'];
  if (skipPrefixes.some((prefix) => trimmed.startsWith(prefix))) return text;

  if (isLongMessage(text)) {
    return `${buildTrialAdCompact(access)}\n\n${text}\n\n${buildTrialAd(access)}`;
  }

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
