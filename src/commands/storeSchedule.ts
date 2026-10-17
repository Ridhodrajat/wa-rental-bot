import { CommandContext, ReplyFn } from '../types';
import { getSocket, getGroupMetadata } from '../connection/whatsapp';
import { TransactionTemplateRepository, GroupSettingsRepository } from '../database/repositories/settingsRepository';
import { OrderRepository } from '../database/repositories/orderRepository';
import { getDefaultTemplate } from '../templates/messageTemplates';
import { formatBusinessDate } from '../utils/time';
import { formatRupiah, parseAmountToNumber } from '../utils/amount';
import logger from '../utils/logger';

/**
 * Commands untuk open/close grup dengan template custom
 * - .setopen (pilih template open)
 * - .setclose (pilih template close)
 * - .autoopen on/off
 * - .autoopenset HH:MM
 * - .autoclose on/off
 * - .autocloseset HH:MM
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

export async function handleSetOpen(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  if (!ctx.isBotAdmin) {
    return reply('❌ Bot harus menjadi admin grup terlebih dahulu.');
  }

  const sock = getSocket();
  try {
    await sock.groupSettingUpdate(ctx.chatJid, 'not_announcement');
    const template = getDefaultTemplate('open');
    await sock.sendMessage(ctx.chatJid, { text: template });
    await reply('✅ Grup dibuka dan notifikasi terkirim.');
  } catch (error) {
    logger.error({ error }, 'Gagal membuka grup');
    await reply('❌ Gagal membuka grup.');
  }
}

export async function handleSetClose(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  if (!ctx.isBotAdmin) {
    return reply('❌ Bot harus menjadi admin grup terlebih dahulu.');
  }

  const sock = getSocket();
  try {
    await sock.groupSettingUpdate(ctx.chatJid, 'announcement');
    const template = getDefaultTemplate('close');
    await sock.sendMessage(ctx.chatJid, { text: template });
    await reply('✅ Grup ditutup dan notifikasi terkirim.');
  } catch (error) {
    logger.error({ error }, 'Gagal menutup grup');
    await reply('❌ Gagal menutup grup.');
  }
}

export async function handleAutoOpen(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const arg = ctx.args[0]?.toLowerCase();
  if (arg === 'on') {
    await reply('✅ Jadwal autoopen diaktifkan. Atur jam dengan *.autoopenset HH:MM*');
  } else if (arg === 'off') {
    await reply('✅ Jadwal autoopen dimatikan.');
  } else {
    await reply('❌ Format: *.autoopen on* atau *.autoopen off*');
  }
}

export async function handleAutoOpenSet(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const time = ctx.args[0];
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
    return reply('❌ Format: *.autoopenset HH:MM*\nContoh: *.autoopenset 08:00*');
  }

  await reply(`✅ Jadwal buka grup otomatis diatur ke pukul ${time} WIB.`);
}

export async function handleAutoClose(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const arg = ctx.args[0]?.toLowerCase();
  if (arg === 'on') {
    await reply('✅ Jadwal autoclose diaktifkan. Atur jam dengan *.autocloseset HH:MM*');
  } else if (arg === 'off') {
    await reply('✅ Jadwal autoclose dimatikan.');
  } else {
    await reply('❌ Format: *.autoclose on* atau *.autoclose off*');
  }
}

export async function handleAutoCloseSet(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const time = ctx.args[0];
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
    return reply('❌ Format: *.autocloseset HH:MM*\nContoh: *.autocloseset 22:00*');
  }

  await reply(`✅ Jadwal tutup grup otomatis diatur ke pukul ${time} WIB.`);
}

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

/** Tanggal operasional hari ini (YYYY-MM-DD, zona tampilan). */
export function todayBizDate(): string {
  return formatBusinessDate(new Date());
}

/** Tanggal operasional kemarin (YYYY-MM-DD, zona tampilan). */
export function yesterdayBizDate(): string {
  return formatBusinessDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

/**
 * Susun teks laporan order untuk sebuah grup & tanggal.
 */
export function buildDailyOrderReport(groupId: string, bizDate: string, title: string): string {
  const { count, totalRevenue, orders } = OrderRepository.summarize(groupId, bizDate);

  let text = `📊 *${title}*\n🗓️ ${bizDate}\n\n`;
  text += `🧾 Total Order    : *${count}*\n`;
  text += `💰 Total Revenue  : *${formatRupiah(totalRevenue)}*\n`;

  if (orders.length > 0) {
    text += `\n*Rincian (${orders.length}):*\n`;
    for (const o of orders.slice(-20)) {
      const prod = o.product?.trim() || 'Tanpa keterangan';
      const via = o.source === 'ocr' ? ' 🤖' : '';
      text += `• ${prod} — ${formatRupiah(o.amount)}${via}\n`;
    }
    if (orders.length > 20) {
      text += `… dan ${orders.length - 20} order lainnya.\n`;
    }
  } else {
    text += `\n_(belum ada order tercatat)_\n`;
  }

  return text;
}

export async function handleDataOrderNow(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const report = buildDailyOrderReport(ctx.chatJid, todayBizDate(), 'Laporan Order Hari Ini');
  await reply(report);
}

export async function handleDataOrderLast(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const report = buildDailyOrderReport(ctx.chatJid, yesterdayBizDate(), 'Laporan Order Kemarin');
  await reply(report);
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
      `Laporan order hari ini (jumlah + total pendapatan).\n\n` +
      `*.dataorderlast*\n` +
      `Laporan order kemarin.\n\n` +
      `*Cara mencatat order:*\n` +
      `• *.done 50000* — catat order Rp50.000 (reply chat pembeli).\n` +
      `• *.done Netflix 50k* — catat produk + nominal.\n` +
      `• *.done* + reply foto bukti transfer — nominal dibaca otomatis (OCR), lalu konfirmasi.`
  );
}
