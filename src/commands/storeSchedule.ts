import { CommandContext, ReplyFn } from '../types';
import { GroupSettingsRepository } from '../database/repositories/settingsRepository';
import { OrderRepository } from '../database/repositories/orderRepository';
import { getSocket } from '../connection/whatsapp';
import { formatRupiah, parseAmountToNumber } from '../utils/amount';
import {
  todayBizDate,
  yesterdayBizDate,
  buildOrderSummaryText,
  buildOrderReportXlsx,
  orderReportFileName,
} from '../services/orderReportService';
import {
  startOfWeekBizDate,
  endOfWeekBizDate,
  startOfMonthBizDate,
  endOfMonthBizDate,
  addDaysToBizDate,
  addMonthsToBizDate,
} from '../utils/time';
import logger from '../utils/logger';

/**
 * Commands jadwal toko & data order:
 * - .autoopen / .autoopenset
 * - .autoclose / .autocloseset
 * - .dataorder on/off
 * - .dataordernow / .dataorderlast  (harian, XLSX)
 * - .dataorderweek / .dataorderlastweek (mingguan, XLSX)
 * - .dataordermonth / .dataorderlastmonth (bulanan, XLSX)
 * - .dataorderhelp
 * - .setnominal
 */

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function requireAdmin(ctx: CommandContext, reply: ReplyFn): Promise<boolean> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return false;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return false;
  }
  return true;
}

/** Validasi & normalisasi HH:MM (24 jam). Mengembalikan null bila tidak valid. */
function parseTime(input: string | undefined): string | null {
  if (!input) return null;
  const m = input.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

// ============ Auto Open ============

export async function handleAutoOpen(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const arg = ctx.args[0]?.toLowerCase();
  if (arg === 'on' || arg === 'off') {
    GroupSettingsRepository.setAutoOpenEnabled(ctx.chatJid, arg === 'on');
    const s = GroupSettingsRepository.get(ctx.chatJid);
    const time = s?.autoopen_time ?? null;
    await reply(
      `✅ Autoopen ${arg === 'on' ? 'diaktifkan 🟢' : 'dimatikan 🔴'}.` +
        (time
          ? `\n⏰ Jam buka otomatis: *${time}*`
          : `\n⚠️ Jam belum diatur. Gunakan *.autoopenset HH:MM*.`)
    );
    return;
  }

  const s = GroupSettingsRepository.get(ctx.chatJid);
  await reply(
    `⏰ *Autoopen (Buka Grup Otomatis)*\n\n` +
      `Status: ${s?.autoopen_enabled === 1 ? '🟢 ON' : '🔴 OFF'}\n` +
      `Jam: ${s?.autoopen_time ?? '-'}\n\n` +
      `Atur dengan:\n• *.autoopen on|off*\n• *.autoopenset HH:MM* (contoh: .autoopenset 08:00)`
  );
}

export async function handleAutoOpenSet(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const time = parseTime(ctx.args[0]);
  if (!time) {
    return reply('❌ Format: *.autoopenset HH:MM*\nContoh: *.autoopenset 08:00*');
  }

  GroupSettingsRepository.setAutoOpenTime(ctx.chatJid, time);
  await reply(
    `✅ Jam buka otomatis diatur ke *${time}*.\nAktifkan dengan *.autoopen on* (bot harus admin grup).`
  );
}

// ============ Auto Close ============

export async function handleAutoClose(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const arg = ctx.args[0]?.toLowerCase();
  if (arg === 'on' || arg === 'off') {
    GroupSettingsRepository.setAutoCloseEnabled(ctx.chatJid, arg === 'on');
    const s = GroupSettingsRepository.get(ctx.chatJid);
    const time = s?.autoclose_time ?? null;
    await reply(
      `✅ Autoclose ${arg === 'on' ? 'diaktifkan 🟢' : 'dimatikan 🔴'}.` +
        (time
          ? `\n⏰ Jam tutup otomatis: *${time}*`
          : `\n⚠️ Jam belum diatur. Gunakan *.autocloseset HH:MM*.`)
    );
    return;
  }

  const s = GroupSettingsRepository.get(ctx.chatJid);
  await reply(
    `⏰ *Autoclose (Tutup Grup Otomatis)*\n\n` +
      `Status: ${s?.autoclose_enabled === 1 ? '🟢 ON' : '🔴 OFF'}\n` +
      `Jam: ${s?.autoclose_time ?? '-'}\n\n` +
      `Atur dengan:\n• *.autoclose on|off*\n• *.autocloseset HH:MM* (contoh: .autocloseset 22:00)`
  );
}

export async function handleAutoCloseSet(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const time = parseTime(ctx.args[0]);
  if (!time) {
    return reply('❌ Format: *.autocloseset HH:MM*\nContoh: *.autocloseset 22:00*');
  }

  GroupSettingsRepository.setAutoCloseTime(ctx.chatJid, time);
  await reply(
    `✅ Jam tutup otomatis diatur ke *${time}*.\nAktifkan dengan *.autoclose on* (bot harus admin grup).`
  );
}

// ============ Data Order ============

export async function handleDataOrder(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const arg = ctx.args[0]?.toLowerCase();
  if (arg === 'on' || arg === 'off') {
    const enabled = arg === 'on';
    GroupSettingsRepository.setDataOrderEnabled(ctx.chatJid, enabled);
    await reply(
      `✅ Laporan data order otomatis saat *.close* ${enabled ? 'diaktifkan 🟢' : 'dimatikan 🔴'}.`
    );
    return;
  }

  const current = GroupSettingsRepository.isDataOrderEnabled(ctx.chatJid);
  await reply(
    `📊 *Laporan Data Order Otomatis*\n\n` +
      `Status: ${current ? '🟢 ON' : '🔴 OFF'}\n\n` +
      `Gunakan *.dataorder on* atau *.dataorder off*.\n` +
      `Bila ON, ringkasan order hari ini dikirim otomatis setiap kali *.close*.`
  );
}

/** Kirim laporan Excel untuk sebuah rentang tanggal. */
async function sendOrderReport(
  ctx: CommandContext,
  reply: ReplyFn,
  title: string,
  tag: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const { count, totalRevenue } = OrderRepository.summarizeRange(ctx.chatJid, startDate, endDate);
  const periode = startDate === endDate ? startDate : `${startDate} s/d ${endDate}`;
  const caption =
    `📊 *${title}*\n🗓️ ${periode}\n` +
    `🧾 Total Order: *${count}*\n💰 Total Revenue: *${formatRupiah(totalRevenue)}*`;

  try {
    const buf = await buildOrderReportXlsx(ctx.chatJid, title, startDate, endDate);
    const sock = getSocket();
    await sock.sendMessage(ctx.chatJid, {
      document: buf,
      mimetype: XLSX_MIME,
      fileName: orderReportFileName(tag, startDate, endDate),
      caption,
    });
  } catch (error) {
    logger.error({ error }, 'Gagal membuat laporan Excel, kirim sebagai teks');
    await reply(buildOrderSummaryText(ctx.chatJid, startDate, endDate, title));
  }
}

export async function handleDataOrderNow(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const today = todayBizDate();
  await sendOrderReport(ctx, reply, 'Laporan Order Hari Ini', 'harian', today, today);
}

export async function handleDataOrderLast(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const y = yesterdayBizDate();
  await sendOrderReport(ctx, reply, 'Laporan Order Kemarin', 'harian', y, y);
}

export async function handleDataOrderWeek(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const today = todayBizDate();
  const start = startOfWeekBizDate(today);
  const end = endOfWeekBizDate(today);
  await sendOrderReport(ctx, reply, 'Laporan Order Minggu Ini', 'mingguan', start, end);
}

export async function handleDataOrderLastWeek(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const today = todayBizDate();
  const thisWeekStart = startOfWeekBizDate(today);
  const start = addDaysToBizDate(thisWeekStart, -7);
  const end = addDaysToBizDate(thisWeekStart, -1);
  await sendOrderReport(ctx, reply, 'Laporan Order Minggu Lalu', 'mingguan', start, end);
}

export async function handleDataOrderMonth(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const today = todayBizDate();
  const start = startOfMonthBizDate(today);
  const end = endOfMonthBizDate(today);
  await sendOrderReport(ctx, reply, 'Laporan Order Bulan Ini', 'bulanan', start, end);
}

export async function handleDataOrderLastMonth(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const today = todayBizDate();
  const start = addMonthsToBizDate(startOfMonthBizDate(today), -1);
  const end = endOfMonthBizDate(start);
  await sendOrderReport(ctx, reply, 'Laporan Order Bulan Lalu', 'bulanan', start, end);
}

export async function handleSetNominal(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const amount = parseAmountToNumber(ctx.args[0]);
  if (amount == null) {
    return reply('❌ Format: *.setnominal <angka>*\nContoh: *.setnominal 50000*');
  }

  const last = OrderRepository.getLastForGroup(ctx.chatJid);
  if (!last) {
    return reply('ℹ️ Belum ada order yang bisa dikoreksi.');
  }

  OrderRepository.updateAmount(last.id, amount);
  await reply(`✅ Nominal order terakhir diperbarui menjadi *${formatRupiah(amount)}*.`);
}

export async function handleDataOrderHelp(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  await reply(
    `📚 *Panduan Data Order*\n\n` +
      `*.dataorder on|off*\n` +
      `Aktifkan laporan otomatis saat grup ditutup (.close).\n\n` +
      `*Laporan Excel (.xlsx):*\n` +
      `• *.dataordernow* — hari ini\n` +
      `• *.dataorderlast* — kemarin\n` +
      `• *.dataorderweek* — minggu ini (Senin–Minggu)\n` +
      `• *.dataorderlastweek* — minggu lalu\n` +
      `• *.dataordermonth* — bulan ini\n` +
      `• *.dataorderlastmonth* — bulan lalu\n\n` +
      `File berisi 2 sheet: *Detail Order* & *Ringkasan Harian*.\n\n` +
      `*.setnominal <angka>*\n` +
      `Koreksi nominal order terakhir.\n\n` +
      `*Cara mencatat order:*\n` +
      `• *.done 50000* — catat order Rp50.000 (reply chat pembeli).\n` +
      `• *.done Netflix 50k* — catat produk + nominal.\n` +
      `• *.done* + reply foto bukti transfer — nominal dibaca otomatis (OCR), lalu konfirmasi.`
  );
}
