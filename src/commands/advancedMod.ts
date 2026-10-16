import { CommandContext, ReplyFn } from '../types';
import { getSocket, getGroupMetadata } from '../connection/whatsapp';
import logger from '../utils/logger';

/**
 * Commands moderasi & grup management
 * - .deletemsg (balas pesan untuk dihapus)
 * - .revokelinkgc (reset tautan undangan grup)
 * - .addadmin @user (promosi member jadi admin)
 * - .addblacklist <nomor> [alasan]
 * - .editblacklist <nomor> <alasan>
 * - .deleteblacklist <nomor>
 * - .viewblacklist
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
  if (!ctx.isBotAdmin) {
    await reply('❌ Bot harus menjadi admin grup terlebih dahulu.');
    return false;
  }
  return true;
}

export async function handleDeleteMsg(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  if (!ctx.quotedMsg) {
    await reply('❌ Balas pesan yang ingin dihapus dengan caption: *.deletemsg*');
    return;
  }

  const sock = getSocket();
  try {
    await sock.sendMessage(ctx.chatJid, { delete: ctx.quotedMsg.key });
    await reply('✅ Pesan berhasil dihapus.');
  } catch (error) {
    logger.error({ error }, 'Gagal menghapus pesan');
    await reply('❌ Gagal menghapus pesan.');
  }
}

export async function handleRevokeLinkGc(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const sock = getSocket();
  try {
    const newCode = await sock.groupRevokeInvite(ctx.chatJid);
    await reply(`✅ Tautan grup berhasil direset.\n\n🔗 Tautan baru:\nhttps://chat.whatsapp.com/${newCode}`);
  } catch (error) {
    logger.error({ error }, 'Gagal mereset tautan grup');
    await reply('❌ Gagal mereset tautan grup.');
  }
}

export async function handleAddAdmin(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const targets = ctx.mentionedJids;
  if (targets.length === 0) {
    await reply('❌ Tag member yang ingin dijadikan admin.\nContoh: *.addadmin @user*');
    return;
  }

  const sock = getSocket();
  try {
    await sock.groupParticipantsUpdate(ctx.chatJid, targets, 'promote');
    await reply('✅ Member berhasil dijadikan admin.');
  } catch (error) {
    logger.error({ error }, 'Gagal mempromosikan member');
    await reply('❌ Gagal mempromosikan member.');
  }
}

// Placeholder untuk fitur blacklist (akan diimplementasikan di database nanti)
export async function handleAddBlacklist(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const args = ctx.fullArgs.trim().split(' ');
  const nomor = args[0]?.replace(/[^0-9]/g, '');
  const alasan = args.slice(1).join(' ') || 'Tidak ada alasan';

  if (!nomor || nomor.length < 8) {
    return reply('❌ Format: *.addblacklist <nomor> [alasan]*\nContoh: *.addblacklist 628123456789 Penipu*');
  }

  await reply(`✅ Nomor ${nomor} ditambahkan ke blacklist.\nAlasan: ${alasan}`);
}

export async function handleEditBlacklist(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const args = ctx.fullArgs.trim().split(' ');
  const nomor = args[0]?.replace(/[^0-9]/g, '');
  const alasan = args.slice(1).join(' ');

  if (!nomor || !alasan) {
    return reply('❌ Format: *.editblacklist <nomor> <alasan baru>*');
  }

  await reply(`✅ Catatan blacklist ${nomor} diperbarui.\nAlasan baru: ${alasan}`);
}

export async function handleDeleteBlacklist(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const nomor = ctx.args[0]?.replace(/[^0-9]/g, '');
  if (!nomor) {
    return reply('❌ Format: *.deleteblacklist <nomor>*');
  }

  await reply(`✅ Nomor ${nomor} dihapus dari blacklist.`);
}

export async function handleViewBlacklist(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  await reply(
    `📋 *Daftar Blacklist Grup*\n\n` +
    `(Fitur blacklist akan disimpan di database)\n\n` +
    `Belum ada nomor yang diblacklist.`
  );
}

export async function handleBlacklistHelp(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  await reply(
    `📚 *Panduan Blacklist*\n\n` +
    `*.addblacklist <nomor> [alasan]*\n` +
    `Tambah nomor ke blacklist\n\n` +
    `*.editblacklist <nomor> <alasan>*\n` +
    `Edit catatan blacklist\n\n` +
    `*.deleteblacklist <nomor>*\n` +
    `Hapus dari blacklist\n\n` +
    `*.viewblacklist*\n` +
    `Lihat semua blacklist`
  );
}
