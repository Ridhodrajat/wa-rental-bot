import { parseAmountToNumber } from './amount';

/**
 * Utilitas untuk membaca argumen command transaksi (.done / .proses),
 * khususnya memisahkan NAMA PRODUK dan NOMINAL.
 */

export interface ParsedOrderArgs {
  product: string;
  amount: number | null;
}

/**
 * Apakah sebuah token berupa nominal uang.
 *
 * Token dianggap nominal bila:
 *  - murni angka (boleh ada pemisah ribuan/desimal & opsional prefix "Rp"),
 *    contoh: 250, 50000, 50.000, Rp50.000; ATAU
 *  - angka dengan suffix k/rb/ribu/jt/juta, contoh: 50k, 50rb, 1jt, 1,5jt.
 *
 * Token seperti "1b", "2u", "netflix" TIDAK dianggap nominal.
 */
export function isAmountToken(tok: string): boolean {
  if (!tok) return false;
  const t = tok.toLowerCase().replace(/rp\.?/g, '');
  if (!/^[0-9][0-9.,]*(k|rb|ribu|jt|juta)?$/.test(t)) return false;
  const n = parseAmountToNumber(tok);
  return n != null && n > 0;
}

/**
 * Pisahkan produk & nominal dari argumen.
 * Hanya token TERAKHIR yang diperiksa sebagai nominal, sehingga nama produk
 * yang mengandung angka (mis. "netflix 2u", "canva 1b") tetap aman.
 *
 * Contoh:
 *   "Netflix 50k"  -> { product: "Netflix", amount: 50000 }
 *   "250"          -> { product: "",        amount: 250 }
 *   "canva 1b 250" -> { product: "canva 1b", amount: 250 }
 *   "netflix 2u"   -> { product: "netflix 2u", amount: null }
 */
export function splitProductAndAmount(fullArgs: string): ParsedOrderArgs {
  const tokens = fullArgs.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { product: '', amount: null };
  const last = tokens[tokens.length - 1];
  if (isAmountToken(last)) {
    return { product: tokens.slice(0, -1).join(' '), amount: parseAmountToNumber(last) };
  }
  return { product: tokens.join(' '), amount: null };
}
