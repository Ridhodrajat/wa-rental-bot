import { CommandContext, ReplyFn } from '../types';
import { GroupSettingsRepository } from '../database/repositories/settingsRepository';
import { getSocket } from '../connection/whatsapp';
import { downloadImageBuffer } from '../services/mediaService';
import logger from '../utils/logger';

/**
 * Commands pengaturan grup (setppgc, setnamegc, setdesgc, setbot).
 */

export async function handleSetPpgc(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup.');

  const buffer = await downloadImageBuffer(ctx.msg, getSocket());
  if (!buffer) {
    return reply(
      '❌ Kirim/reply sebuah GAMBAR lalu ketik *.setppgc*.\nContoh: reply foto → *.setppgc*'
    );
  }

  try {
    await getSocket().updateProfilePicture(ctx.chatJid, buffer);
    await reply('✅ Foto profil grup berhasil diperbarui.');
  } catch (error) {
    logger.error({ error }, 'Gagal mengubah foto profil grup');
    await reply('❌ Gagal mengubah foto profil grup.');
  }
}

export async function handleSetNamegc(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup.');

  const name = ctx.fullArgs.trim();
  if (!name) return reply('❌ Format: *.setnamegc <nama grup baru>*');

  const sock = getSocket();
  try {
    await sock.groupUpdateSubject(ctx.chatJid, name);
    await reply(`✅ Nama grup berhasil diubah menjadi: *${name}*`);
  } catch (error) {
    await reply('❌ Gagal mengubah nama grup.');
  }
}

export async function handleSetDesgc(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup.');

  const desc = ctx.fullArgs.trim();
  if (!desc) return reply('❌ Format: *.setdesgc <deskripsi baru>*');

  const sock = getSocket();
  try {
    await sock.groupUpdateDescription(ctx.chatJid, desc);
    await reply('✅ Deskripsi grup berhasil diperbarui.');
  } catch (error) {
    await reply('❌ Gagal mengubah deskripsi grup.');
  }
}

export async function handleSetBot(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const data = ctx.fullArgs.trim();
  if (!data) return reply('❌ Format: *.setbot <catatan/konfigurasi khusus grup>*');

  GroupSettingsRepository.setCustomData(ctx.chatJid, data);
  await reply('✅ Pengaturan khusus bot untuk grup ini berhasil disimpan.');
}

export async function handleUpdateSetBot(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const data = ctx.fullArgs.trim();
  if (!data) return reply('❌ Format: *.updatesetbot <catatan/konfigurasi baru>*');

  GroupSettingsRepository.setCustomData(ctx.chatJid, data);
  await reply('✅ Pengaturan bot berhasil diperbarui.');
}

export async function handleDelSetBot(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  GroupSettingsRepository.setCustomData(ctx.chatJid, null);
  await reply('✅ Pengaturan bot khusus grup ini berhasil dihapus.');
}
