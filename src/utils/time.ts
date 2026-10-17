import { config } from '../config/env';

/**
 * Utilitas waktu konsisten:
 * - Seluruh penyimpanan database menggunakan format ISO string UTC (YYYY-MM-DDTHH:mm:ss.sssZ).
 * - Tampilan ke pengguna diformat menggunakan zona waktu operasional (default Asia/Makassar).
 */

export function nowUtc(): string {
  return new Date().toISOString();
}

export function nowTimestamp(): number {
  return Date.now();
}

export function addDays(date: Date | string | number, days: number): Date {
  const d = new Date(date);
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  return d;
}

export function addMinutes(date: Date | string | number, minutes: number): Date {
  const d = new Date(date);
  d.setTime(d.getTime() + minutes * 60 * 1000);
  return d;
}

export function addHours(date: Date | string | number, hours: number): Date {
  const d = new Date(date);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d;
}

/**
 * Parsing durasi sewa mendukung format:
 * - `m` = menit
 * - `j` = jam
 * - `h` = hari
 * - Angka polos dianggap hari (kompatibilitas lama, contoh: "30")
 * Mengembalikan jumlah milidetik atau null jika tidak valid.
 */
export function parseDurationMs(input: string): number | null {
  if (!input) return null;
  const str = input.trim().toLowerCase();

  // Angka polos = hari (kompatibilitas)
  if (/^\d+$/.test(str)) {
    const days = parseInt(str, 10);
    if (days <= 0) return null;
    return days * 24 * 60 * 60 * 1000;
  }

  const match = str.match(/^(\d+)(m|j|h|d|w)$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  if (value <= 0) return null;

  const unit = match[2];
  switch (unit) {
    case 'm':
      return value * 60 * 1000;
    case 'j':
      return value * 60 * 60 * 1000;
    case 'h':
      return value * 24 * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

/**
 * Tambahkan durasi milidetik ke sebuah waktu.
 */
export function addMs(date: Date | string | number, ms: number): Date {
  const d = new Date(date);
  d.setTime(d.getTime() + ms);
  return d;
}

/**
 * Format waktu WIB untuk tampilan singkat (tanggal & jam).
 */
export function formatWibDate(dateOrIso: Date | string | number = new Date()): string {
  const date = new Date(dateOrIso);
  if (isNaN(date.getTime())) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: config.timezone,
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return '-';
  }
}

export function formatWibTime(dateOrIso: Date | string | number = new Date()): string {
  const date = new Date(dateOrIso);
  if (isNaN(date.getTime())) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: config.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '-';
  }
}

/**
 * Tanggal operasional (YYYY-MM-DD) pada zona waktu tampilan.
 * Dipakai untuk mengelompokkan laporan order per hari (mis. WIB).
 */
export function formatBusinessDate(dateOrIso: Date | string | number = new Date()): string {
  const date = new Date(dateOrIso);
  if (isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: config.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Jam:menit (HH:MM, format 24 jam) pada zona waktu operasional.
 * Dipakai untuk mencocokkan jadwal autoopen/autoclose.
 */
export function formatScheduleTime(dateOrIso: Date | string | number = new Date()): string {
  const date = new Date(dateOrIso);
  if (isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: config.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}

export function formatToTimezone(
  dateOrIso: Date | string | number,
  timeZone: string = config.timezone
): string {
  const date = new Date(dateOrIso);
  if (isNaN(date.getTime())) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date) + ` (${timeZone})`;
  } catch {
    return date.toISOString();
  }
}

export function humanRemainingTime(targetIso: string): string {
  const target = new Date(targetIso).getTime();
  const diff = target - Date.now();
  if (diff <= 0) return 'Sudah berakhir';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} menit`);

  return parts.length > 0 ? parts.join(' ') : 'Kurang dari 1 menit';
}
