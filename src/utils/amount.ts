/**
 * Utilitas parsing & format nominal rupiah.
 * Mendukung input seperti:
 *  50000, 50.000, 50,000, "Rp50.000", "50k", "50rb", "50ribu",
 *  "1jt", "1,5jt", "2 juta", "35.500,00"
 */

/**
 * Ubah teks nominal menjadi angka (integer rupiah).
 * Mengembalikan null bila tidak valid atau <= 0.
 */
export function parseAmountToNumber(input: string | null | undefined): number | null {
  if (input == null) return null;

  let s = String(input).toLowerCase().trim();
  if (!s) return null;

  // Buang "rp" dan spasi
  s = s.replace(/rp\.?/g, '').replace(/\s+/g, '');
  if (!s) return null;

  // Deteksi suffix pengali di akhir
  let multiplier = 1;
  const suffixMatch = s.match(/(jt|juta|jutaan|k|rb|ribu|ribuan)$/);
  if (suffixMatch) {
    const unit = suffixMatch[1];
    if (unit === 'jt' || unit === 'juta' || unit === 'jutaan') multiplier = 1_000_000;
    else if (unit === 'k' || unit === 'rb' || unit === 'ribu' || unit === 'ribuan') multiplier = 1_000;
    s = s.slice(0, s.length - unit.length);
  }

  // Sisakan hanya angka & pemisah
  s = s.replace(/[^0-9.,]/g, '');
  if (!s || !/[0-9]/.test(s)) return null;

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  let normalized = s;
  if (hasDot && hasComma) {
    // Mana pun yang paling kanan adalah pemisah desimal
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      // "50,000" -> ribuan
      normalized = parts.join('');
    } else {
      normalized = s.replace(',', '.');
    }
  } else if (hasDot) {
    const parts = s.split('.');
    const isThousands = parts.length > 1 && parts.slice(1).every((p) => p.length === 3);
    normalized = isThousands ? parts.join('') : s;
  }

  const num = parseFloat(normalized);
  if (isNaN(num) || num <= 0) return null;

  const result = Math.round(num * multiplier);
  if (!isFinite(result) || result <= 0) return null;
  return result;
}

/**
 * Cari kandidat nominal di dalam teks bebas (mis. hasil OCR bukti transfer).
 * Prioritas: angka yang dekat dengan kata "total"/"rp"/"jumlah"/"nominal".
 * Mengembalikan angka terbesar yang wajar, atau null.
 */
export function extractAmountFromText(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/\r/g, '\n');

  // Pola bernominal jelas: Rp 50.000 / IDR 50,000
  const rpRegex = /(?:rp\.?|idr)\s*([0-9][0-9.,]*)/gi;
  const rpCandidates: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = rpRegex.exec(cleaned)) !== null) {
    const parsed = parseAmountToNumber(m[1]);
    if (parsed) rpCandidates.push(parsed);
  }
  if (rpCandidates.length > 0) {
    return Math.max(...rpCandidates);
  }

  // Pola angka besar tanpa "Rp" (minimal 3 digit) - ambil yang terbesar
  const numRegex = /\b([0-9][0-9.,]{2,})\b/g;
  const candidates: number[] = [];
  while ((m = numRegex.exec(cleaned)) !== null) {
    const parsed = parseAmountToNumber(m[1]);
    if (parsed && parsed >= 500) candidates.push(parsed);
  }
  if (candidates.length > 0) {
    return Math.max(...candidates);
  }

  return null;
}

/**
 * Format angka menjadi tampilan rupiah. Contoh: 50000 -> "Rp50.000"
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return 'Rp0';
  return 'Rp' + Math.round(amount).toLocaleString('id-ID');
}
