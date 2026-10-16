/**
 * Kumpulan template pesan bawaan (built-in) untuk berbagai fitur bot.
 * Setiap fitur menyediakan minimal 3 opsi gaya: cute pastel, soft minimal, playful/kawaii.
 *
 * Placeholder yang didukung:
 * - @user       : menyebut anggota terkait
 * - @namagrup   : nama grup
 * - @admin      : admin terkait (jika tersedia)
 * - @tanggal    : tanggal saat ini (WIB)
 * - @jam        : jam saat ini (WIB)
 * - @produk     : nama produk (jika tersedia)
 * - @deskripsi  : deskripsi produk (jika tersedia)
 * - @nominal    : nominal transaksi (jika tersedia)
 * - @nomor      : nomor/identitas transaksi (jika tersedia)
 */

export type TemplateFeature =
  | 'welcome'
  | 'goodbye'
  | 'proses'
  | 'done'
  | 'open'
  | 'close'
  | 'rental_expired'
  | 'rental_deleted';

export interface TemplateOption {
  id: number;
  label: string;
  text: string;
}

export const MESSAGE_TEMPLATES: Record<TemplateFeature, TemplateOption[]> = {
  welcome: [
    {
      id: 1,
      label: 'Cute Pastel',
      text:
        `꒰ა ♡ ໒꒱ welcome to @namagrup!\n\n` +
        `૮₍ ˶ᵔ ᵕ ᵔ˶ ₎ა halo @user, selamat datang!\n` +
        `semoga betah & happy shopping ya ♡\n\n` +
        `📅 @tanggal  ⏰ @jam`,
    },
    {
      id: 2,
      label: 'Soft Minimal',
      text:
        `˚ ༘♡ selamat datang, @user\n\n` +
        `terima kasih sudah bergabung di @namagrup.\n` +
        `silakan lihat katalog kami ya ♡`,
    },
    {
      id: 3,
      label: 'Playful Kawaii',
      text:
        `(๑>ᴗ<๑) yay! @user baru join~\n\n` +
        `welcome ke @namagrup 𖹭\n` +
        `jangan lupa baca deskripsi & ketik .list ya!\n\n` +
        `⏰ @jam WIB`,
    },
  ],
  goodbye: [
    {
      id: 1,
      label: 'Cute Pastel',
      text:
        `꒰ა 🥀 ໒꒱ goodbye @user\n\n` +
        `terima kasih sudah berkunjung ke @namagrup ♡\n` +
        `semoga harimu indah selalu ya~`,
    },
    {
      id: 2,
      label: 'Soft Minimal',
      text:
        `— selamat jalan, @user\n\n` +
        `terima kasih telah menjadi bagian dari @namagrup.\n` +
        `sampai jumpa lagi ♡`,
    },
    {
      id: 3,
      label: 'Playful Kawaii',
      text:
        `(｡•́︿•̀｡) @user pamit dulu~\n\n` +
        `bye bye dari @namagrup 𐙚\n` +
        `semoga sukses selalu & balik lagi ya!`,
    },
  ],
  proses: [
    {
      id: 1,
      label: 'Cute Pastel',
      text:
        `╭───「 TRANSAKSI DIPROSES 」───\n` +
        `│ 🙋 Customer : @user\n` +
        `│ 📆 Tanggal  : @tanggal\n` +
        `│ ⏰ Waktu    : @jam WIB\n` +
        `│ 🛍️ Pesanan  : @produk\n` +
        `╰─────────────────────────────`,
    },
    {
      id: 2,
      label: 'Soft Minimal',
      text:
        `⏳ Pesanan Sedang Diproses\n\n` +
        `Customer : @user\n` +
        `Produk   : @produk\n` +
        `Waktu    : @jam WIB`,
    },
    {
      id: 3,
      label: 'Playful Kawaii',
      text:
        `(っ˘ω˘ς) Pesananmu lagi diolah~\n\n` +
        `👤 @user\n` +
        `🛍️ @produk\n` +
        `⏰ @jam WIB`,
    },
  ],
  done: [
    {
      id: 1,
      label: 'Cute Pastel',
      text:
        `╭───「 TRANSAKSI SELESAI 」───\n` +
        `│ 🙋 Customer : @user\n` +
        `│ 📆 Tanggal  : @tanggal\n` +
        `│ ⏰ Waktu    : @jam WIB\n` +
        `│ 🆔 TRX-@nomor\n` +
        `│ 🛍️ Pesanan  : @produk\n` +
        `╰─────────────────────────────`,
    },
    {
      id: 2,
      label: 'Soft Minimal',
      text:
        `✅ Pesanan Selesai\n\n` +
        `Customer : @user\n` +
        `Produk   : @produk\n` +
        `Waktu    : @jam WIB\n` +
        `ID Transaksi : TRX-@nomor`,
    },
    {
      id: 3,
      label: 'Playful Kawaii',
      text:
        `(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ DONE!\n\n` +
        `👤 @user\n` +
        `🛍️ @produk\n` +
        `⏰ @jam WIB\n` +
        `🆔 TRX-@nomor`,
    },
  ],
  open: [
    {
      id: 1,
      label: 'Cute Pastel',
      text: `꒰ა 🔓 ໒꒱ grup telah dibuka ♡\n\nsemua anggota bisa chat lagi ya~`,
    },
    {
      id: 2,
      label: 'Soft Minimal',
      text: `🔓 grup dibuka\n\nsilakan lanjutkan obrolan dengan sopan ♡`,
    },
    {
      id: 3,
      label: 'Playful Kawaii',
      text: `(๑˃ᴗ˂)ﻭ grup OPEN!\n\nwelcome back semuanya, chat lagi yuk~ ✨`,
    },
  ],
  close: [
    {
      id: 1,
      label: 'Cute Pastel',
      text: `꒰ა 🔒 ໒꒱ grup telah ditutup ♡\n\nhanya admin yang dapat mengirim pesan ya~`,
    },
    {
      id: 2,
      label: 'Soft Minimal',
      text: `🔒 grup ditutup\n\nhanya admin yang bisa chat sementara ini ♡`,
    },
    {
      id: 3,
      label: 'Playful Kawaii',
      text: `(˶ᵔ ᵕ ᵔ˶) grup CLOSE~\n\ntidur dulu ya semuanya, admin saja yang aktif ✨`,
    },
  ],
  rental_expired: [
    {
      id: 1,
      label: 'Cute Pastel',
      text:
        `꒰ა ⏰ ໒꒱ sewa grup akan segera berakhir ♡\n\n` +
        `hai semuanya~ masa aktif @namagrup sudah habis hari ini.\n` +
        `grup masih bisa dipakai selama masa tenggang 30 hari ya.\n\n` +
        `jangan lupa hubungi owner untuk perpanjang sewa ♡`,
    },
    {
      id: 2,
      label: 'Soft Minimal',
      text:
        `⏰ perhatian semuanya\n\n` +
        `masa sewa @namagrup sudah berakhir. grup masih aktif selama masa tenggang 30 hari.\n` +
        `silakan perpanjang sewa segera.`,
    },
    {
      id: 3,
      label: 'Playful Kawaii',
      text:
        `(｡•́︿•̀｡) ehh masa sewa @namagrup sudah habis~\n\n` +
        `tapi tenang, masih ada masa tenggang 30 hari kok.\n` +
        `buruan perpanjang biar grup tetap aktif ya! ✨`,
    },
  ],
  rental_deleted: [
    {
      id: 1,
      label: 'Cute Pastel',
      text:
        `꒰ა 🥀 ໒꒱ sewa grup sudah berakhir sepenuhnya ♡\n\n` +
        `terima kasih sudah menggunakan layanan kami.\n` +
        `semoga harimu indah selalu ya~`,
    },
    {
      id: 2,
      label: 'Soft Minimal',
      text:
        `🥀 sewa grup berakhir\n\n` +
        `masa sewa @namagrup sudah habis sepenuhnya. terima kasih atas kepercayaannya.`,
    },
    {
      id: 3,
      label: 'Playful Kawaii',
      text:
        `(｡•́︿•̀｡) sewa grup sudah habis total~\n\n` +
        `terima kasih sudah pakai layanan kami. sampai jumpa lagi ya!`,
    },
  ],
};

export function getDefaultTemplate(feature: TemplateFeature): string {
  return MESSAGE_TEMPLATES[feature][0].text;
}

export function getTemplateOption(feature: TemplateFeature, id: number): TemplateOption | null {
  return MESSAGE_TEMPLATES[feature].find((t) => t.id === id) ?? null;
}
