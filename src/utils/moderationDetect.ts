/**
 * Deteksi tautan & nomor telepon untuk moderasi grup (antilink & antiwame).
 * Sengaja dibuat konservatif: hanya pola yang jelas, agar tidak salah hapus
 * pesan yang isinya cuma nominal harga atau angka biasa.
 */

/** Domain yang paling sering dipakai untuk menyebar tautan / undangan. */
const KNOWN_DOMAINS = [
  'chat.whatsapp.com',
  'whatsapp.com',
  'wa.me',
  't.me',
  'telegram.me',
  'bit.ly',
  'tinyurl.com',
  's.id',
  'surl.li',
  'rebrand.ly',
  'cutt.ly',
  'shorturl.at',
  'is.gd',
  'rb.gy',
  'linktr.ee',
];

/** Tautan dengan skema atau awalan www. */
const SCHEME_PATTERN = /(?:https?:\/\/|www\.)\S+/i;

/** Domain telanjang, mis. tokosaya.com/promo atau shopee.co.id/xyz */
const BARE_DOMAIN_PATTERN =
  /\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|id|co|io|me|xyz|shop|store|link|site|online|info|biz|app|gg|ly|to|cc|tv|my|sg|us|uk|ru|pro|club|live|page|space|fun|top|icu|website)\b(?:\/\S*)?/i;

/** Nomor telepon Indonesia (menyatu atau berpemisah spasi/titik/strip). */
const PHONE_PATTERN = /(?:\+?62[\s.-]?|0)8[1-9](?:[\s.-]?\d){7,12}/;

/** Apakah teks memuat tautan. */
export function containsLink(text: string): boolean {
  if (!text) return false;

  const lower = text.toLowerCase();
  if (KNOWN_DOMAINS.some((domain) => lower.includes(domain))) return true;

  return SCHEME_PATTERN.test(text) || BARE_DOMAIN_PATTERN.test(text);
}

/** Apakah teks memuat nomor telepon. */
export function containsPhoneNumber(text: string): boolean {
  if (!text) return false;
  return PHONE_PATTERN.test(text);
}
