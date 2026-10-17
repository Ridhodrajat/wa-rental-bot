import { CommandContext, ReplyFn } from '../types';
import { getSocket, getGroupMetadata } from '../connection/whatsapp';
import { BlacklistRepository, normalizeNumber } from '../database/repositories/blacklistRepository';
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

export async function handleAddBlacklist(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const args = ctx.fullArgs.trim().split(/\s+/).filter(Boolean);
  const nomor = normalizeNumber(args[0]);
  const alasan = args.slice(1).join(' ') || null;

  if (!nomor || nomor.length < 8) {
    return reply('❌ Format: *.addblacklist <nomor> [alasan]*\nContoh: *.addblacklist 628123456789 Penipu*');
  }

  const existing = BlacklistRepository.get(ctx.chatJid, nomor);
  BlacklistRepository.add(ctx.chatJid, nomor, alasan, ctx.senderNumber);

  await reply(
    `${existing ? '♻️ Nomor diperbarui di blacklist' : '✅ Nomor ditambahkan ke blacklist'}\n` +
      `📵 Nomor: *${nomor}*\n📝 Alasan: ${alasan ?? '-'}\n\n` +
      `Pesan dari nomor ini akan dihapus otomatis (bila bot admin).`
  );
}

export async function handleEditBlacklist(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const args = ctx.fullArgs.trim().split(/\s+/).filter(Boolean);
  const nomor = normalizeNumber(args[0]);
  const alasan = args.slice(1).join(' ');

  if (!nomor || !alasan) {
    return reply('❌ Format: *.editblacklist <nomor> <alasan baru>*\nContoh: *.editblacklist 628123456789 Spam*');
  }

  const updated = BlacklistRepository.updateReason(ctx.chatJid, nomor, alasan);
  if (!updated) {
    return reply(`ℹ️ Nomor *${nomor}* belum ada di blacklist.\nTambahkan dulu dengan *.addblacklist*.`);
  }

  await reply(`✅ Catatan blacklist *${nomor}* diperbarui.\n📝 Alasan baru: ${alasan}`);
}

export async function handleDeleteBlacklist(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const nomor = normalizeNumber(ctx.args[0]);
  if (!nomor) {
    return reply('❌ Format: *.deleteblacklist <nomor>*');
  }

  const removed = BlacklistRepository.remove(ctx.chatJid, nomor);
  if (!removed) {
    return reply(`ℹ️ Nomor *${nomor}* tidak ada di blacklist.`);
  }

  await reply(`✅ Nomor *${nomor}* dihapus dari blacklist.`);
}

export async function handleViewBlacklist(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const list = BlacklistRepository.getAll(ctx.chatJid);
  if (list.length === 0) {
    return reply('📋 *Daftar Blacklist Grup*\n\nBelum ada nomor yang diblacklist.');
  }

  let text = `📋 *Daftar Blacklist Grup* (${list.length})\n\n`;
  list.forEach((b, i) => {
    text += `${i + 1}. ${b.number}${b.reason ? ` — ${b.reason}` : ''}\n`;
  });
  text += `\nGunakan *.deleteblacklist <nomor>* untuk menghapus.`;
  await reply(text);
}

export async function handleBlacklistHelp(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  await reply(
    `📚 *Panduan Blacklist*\n\n` +
      `*.addblacklist <nomor> [alasan]*\n` +
      `Tambah nomor ke blacklist (mis. penipu/spammer).\n\n` +
      `*.editblacklist <nomor> <alasan>*\n` +
      `Ubah catatan alasan blacklist.\n\n` +
      `*.deleteblacklist <nomor>*\n` +
      `Hapus nomor dari blacklist.\n\n` +
      `*.viewblacklist*\n` +
      `Lihat semua nomor blacklist grup.\n\n` +
      `Catatan: pesan dari nomor blacklist akan dihapus otomatis dan pengirim ` +
      `mendapat peringatan (perlu bot sebagai admin grup).`
  );
}
