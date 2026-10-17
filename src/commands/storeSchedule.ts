import { CommandContext, ReplyFn } from '../types';
import { GroupSettingsRepository } from '../database/repositories/settingsRepository';
import { OrderRepository } from '../database/repositories/orderRepository';
import { getSocket } from '../connection/whatsapp';
import { formatRupiah, parseAmountToNumber } from '../utils/amount';
import {
  todayBizDate,
  yesterdayBizDate,
  buildDailyOrderReport,
  buildOrderReportPdf,
  buildOrderReportFileName,
} from '../services/orderReportService';
import logger from '../utils/logger';

/**
 * Commands jadwal toko & data order:
 * - .autoopen / .autoopenset
 * - .autoclose / .autocloseset
 * - .dataorder on/off
 * - .dataordernow / .dataorderlast (laporan PDF)
 * - .dataorderhelp
 * - .setnominal
 */

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

async function sendOrderReport(
  ctx: CommandContext,
  reply: ReplyFn,
  bizDate: string,
  title: string
): Promise<void> {
  const { count, totalRevenue } = OrderRepository.summarize(ctx.chatJid, bizDate);
  const caption =
    `📊 *${title}*\n🗓️ ${bizDate}\n` +
    `🧾 Total Order: *${count}*\n💰 Total Revenue: *${formatRupiah(totalRevenue)}*`;

  try {
    const pdf = await buildOrderReportPdf(ctx.chatJid, bizDate, title);
    const sock = getSocket();
    await sock.sendMessage(ctx.chatJid, {
      document: pdf,
      mimetype: 'application/pdf',
      fileName: buildOrderReportFileName(bizDate),
      caption,
    });
  } catch (error) {
    logger.error({ error }, 'Gagal membuat PDF laporan order, kirim sebagai teks');
    await reply(buildDailyOrderReport(ctx.chatJid, bizDate, title));
  }
}

export async function handleDataOrderNow(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  await sendOrderReport(ctx, reply, todayBizDate(), 'Laporan Order Hari Ini');
}

export async function handleDataOrderLast(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  await sendOrderReport(ctx, reply, yesterdayBizDate(), 'Laporan Order Kemarin');
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
      `*.dataordernow*\n` +
      `Laporan order hari ini (dikirim sebagai file PDF).\n\n` +
      `*.dataorderlast*\n` +
      `Laporan order kemarin (PDF).\n\n` +
      `*.setnominal <angka>*\n` +
      `Koreksi nominal order terakhir.\n\n` +
      `*Cara mencatat order:*\n` +
      `• *.done 50000* — catat order Rp50.000 (reply chat pembeli).\n` +
      `• *.done Netflix 50k* — catat produk + nominal.\n` +
      `• *.done* + reply foto bukti transfer — nominal dibaca otomatis (OCR), lalu konfirmasi.`
  );
}
