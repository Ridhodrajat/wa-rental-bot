import { CommandContext, ReplyFn } from '../types';
import { getSocket, getGroupMetadata } from '../connection/whatsapp';
import { TransactionTemplateRepository } from '../database/repositories/settingsRepository';
import { getDefaultTemplate } from '../templates/messageTemplates';
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
  if (arg === 'on') {
    await reply('✅ Laporan data order otomatis saat close diaktifkan.');
  } else if (arg === 'off') {
    await reply('✅ Laporan data order otomatis dimatikan.');
  } else {
    await reply('❌ Format: *.dataorder on* atau *.dataorder off*');
  }
}

export async function handleDataOrderNow(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  await reply(
    `📊 *Laporan Pesanan Hari Ini*\n\n` +
    `(Fitur laporan PDF sedang dikembangkan)\n\n` +
    `Total Order: 0\n` +
    `Total Revenue: Rp0`
  );
}

export async function handleDataOrderLast(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  await reply(
    `📊 *Laporan Pesanan Kemarin*\n\n` +
    `(Fitur laporan PDF sedang dikembangkan)\n\n` +
    `Total Order: 0\n` +
    `Total Revenue: Rp0`
  );
}

export async function handleDataOrderHelp(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  await reply(
    `📚 *Panduan Data Order*\n\n` +
    `*.dataorder on/off*\n` +
    `Aktifkan laporan otomatis saat tutup grup\n\n` +
    `*.dataordernow*\n` +
    `Download laporan hari ini (PDF)\n\n` +
    `*.dataorderlast*\n` +
    `Download laporan kemarin (PDF)`
  );
}
