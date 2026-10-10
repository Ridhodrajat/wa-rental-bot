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
