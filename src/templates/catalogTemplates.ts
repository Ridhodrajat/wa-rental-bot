/**
 * Template katalog produk aesthetic.
 * Header & footer menggunakan placeholder:
 * - @namagrup                      : nama grup
 * - @namawaorangyangmengetiklist   : nama orang yang meminta katalog
 * - @jam                           : waktu saat ini (WIB)
 *
 * Bagian daftar produk di-generate otomatis oleh bot dengan format:
 *   ┃𖦹 @namaproduk
 */

export interface CatalogTemplate {
  id: number;
  label: string;
  header: string;
  productPrefix: string; // prefix tiap baris produk
  footer: string;
}

export const CATALOG_TEMPLATES: CatalogTemplate[] = [
  {
    id: 1,
    label: 'Hhi-Haloow',
    header:
      `貧── '𝗵𝗵𝗶-𝗵𝗮𝗹𝗼𝗼𝘄 𝗐𝖾𝗅𝖼𝗈𝗆𝖾 𝗍𝗈 @namagrup we 𝗌𝖾𝗅𝗅 𝗅𝗈𝗍𝗌 𝗈𝖿 𝖼𝗁𝗈𝗂𝖼𝖾𝗌 𝗍𝗁𝖺𝗍 𝖺𝗋𝖾 𝖽𝖾𝖿𝗂𝗇𝗂𝗍𝖾𝗅𝗒 𝖼𝗁𝖾𝖺𝗉, 𝗌𝖺𝖿𝖾 𝖺𝗇𝖽 𝗅𝖾𝗀𝖺𝗅\n\n` +
      `૮₍ ˶ᵔ ᵕ ᵔ˶ ₎ა @namawaorangyangmengetiklist 🎀\n\n` +
      `⏰ : @jam WIB\n\n` +
      `🐣 : ꕮ 𝗄𝖾𝗍𝗂𝗄 .𝗅𝗂𝗌𝗍 𝗎𝗇𝗍𝗎𝗄 𝗆𝖾𝗅𝗂𝗁𝖺𝗍 𝗆𝖾𝗇𝗎\n\n` +
      `╭── ꒰ 🦊 ꒱ 𝗰𝗮𝘁𝗮𝗹𝗼𝗴𝘂𝗲 .. ⸝⸝`,
    productPrefix: '┃𖦹 ',
    footer:
      `┗━━━━━━━━━━━━━━━━━━❍\n\n` +
      `𝗵𝗮𝗽𝗽𝘆 𝘀𝗵𝗼𝗽𝗽𝗶𝗻𝗴 𝗲𝘃𝗲𝗿𝘆𝗼𝗻𝗲 𖹭 !\n\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`,
  },
  {
    id: 2,
    label: 'Soft Pink',
    header:
      `୨୧ ₊˚ welcome to @namagrup ♡\n\n` +
      `૮₍ ˶ᵔ ᵕ ᵔ˶ ₎ა catalogue of cute choices 🎀\n\n` +
      `⏰ @jam WIB  ·  requested by @namawaorangyangmengetiklist\n\n` +
      `♡ ─────────── ♡`,
    productPrefix: '🩷 ',
    footer:
      `♡ ─────────── ♡\n\n` +
      `thank you for shopping with us 𐙚`,
  },
  {
    id: 3,
    label: 'Bunny Shop',
    header:
      `꒰ 🐰 ꒱ 𝗯𝘂𝗻𝗻𝘆 𝘀𝗵𝗼𝗽 @namagrup\n\n` +
      `૮꒰ ˶• ༝ •˶꒱ა here's our little catalogue ♡\n\n` +
      `⏰ @jam WIB  ·  hi @namawaorangyangmengetiklist!\n\n` +
      `🥕 ─────────── 🥕`,
    productPrefix: '🐰 ',
    footer:
      `🥕 ─────────── 🥕\n\n` +
      `♡ thank you, come again soon!`,
  },
  {
    id: 4,
    label: 'Cloud Dream',
    header:
      `☁︎ 𓂃 welcome to @namagrup 𓂃 ☁︎\n\n` +
      `୨୧ take a look at our catalogue below ♡\n\n` +
      `⏰ @jam WIB  ·  @namawaorangyangmengetiklist\n\n` +
      `˚☁︎ ─────────── ☁︎˚`,
    productPrefix: '✨ ',
    footer:
      `˚☁︎ ─────────── ☁︎˚\n\n` +
      `˚ ༘♡ happy shopping & have a dreamy day`,
  },
  {
    id: 5,
    label: 'Minimalist Cute',
    header:
      `୨୧ @namagrup — product catalogue\n\n` +
      `requested by @namawaorangyangmengetiklist\n` +
      `⏰ @jam WIB\n\n` +
      `─────────────`,
    productPrefix: '· ',
    footer:
      `─────────────\n\n` +
      `— thank you for your order ♡`,
  },
];

export function getCatalogTemplate(id: number): CatalogTemplate {
  return CATALOG_TEMPLATES.find((t) => t.id === id) ?? CATALOG_TEMPLATES[0];
}
