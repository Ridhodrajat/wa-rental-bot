import { config } from '../config/env';
import { formatWibDate, formatWibTime } from './time';

/**
 * Resolver placeholder untuk template pesan & katalog.
 * Placeholder yang tidak memiliki nilai akan dibersihkan (tidak dikirim mentah).
 */

export interface PlaceholderContext {
  user?: string; // Nama/JID pengguna (tanpa @)
  userJid?: string; // JID lengkap untuk mention
  groupName?: string;
  admin?: string;
  product?: string;
  description?: string;
  nominal?: string;
  nomor?: string;
}

export interface ResolvedTemplate {
  text: string;
  mentions: string[];
}

/**
 * Ganti seluruh placeholder pada teks template.
 * Mengembalikan teks hasil + daftar JID untuk mention.
 */
export function resolveTemplate(
  template: string,
  ctx: PlaceholderContext
): ResolvedTemplate {
  const mentions: string[] = [];
  let text = template;

  const now = new Date();

  // @user dirender sebagai @<nomor> agar menjadi tag/mention yang valid.
  // Jika tidak ada userJid (tanpa mention), gunakan teks apa adanya.
  const userReplacement = ctx.user
    ? ctx.userJid
      ? `@${ctx.user}`
      : ctx.user
    : '';

  const replacements: Record<string, string> = {
    '@user': userReplacement,
    '@namagrup': ctx.groupName ?? '',
    '@admin': ctx.admin ?? '',
    '@tanggal': formatWibDate(now),
    '@jam': formatWibTime(now),
    '@produk': ctx.product ?? '',
    '@deskripsi': ctx.description ?? '',
    '@nominal': ctx.nominal ?? '',
    '@nomor': ctx.nomor ?? '',
  };

  // Kumpulkan mention JID untuk @user jika ada
  if (ctx.userJid && template.includes('@user')) {
    mentions.push(ctx.userJid);
  }

  for (const [key, value] of Object.entries(replacements)) {
    // Gunakan regex global agar semua kemunculan terganti
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    text = text.replace(regex, value);
  }

  // Bersihkan placeholder yang kosong agar tidak meninggalkan sisa tanda
  // (misalnya baris yang hanya berisi placeholder kosong)
  text = text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      // Buang baris yang hanya berisi simbol sisa/placeholder kosong
      if (/^[\s\-–—·•♡─]+$/.test(trimmed) && trimmed.length > 0) {
        // biarkan garis dekoratif, hanya buang jika baris kosong total
        return true;
      }
      return true;
    })
    .join('\n');

  return { text: text.trim(), mentions };
}

/**
 * Ambil nama tampilan dari JID (bagian sebelum @).
 */
export function displayNameFromJid(jid: string): string {
  return (jid || '').split('@')[0].split(':')[0];
}

export function getOwnerDisplay(): { name: string; number: string } {
  return {
    name: config.ownerName,
    number: config.ownerNumber,
  };
}
