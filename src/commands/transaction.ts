import { CommandContext } from '../types';
import { TransactionTemplateRepository } from '../database/repositories/settingsRepository';

/**
 * Commands template transaksi (proses & selesai).
 */

export async function handleSetProses(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  const template = ctx.fullArgs.trim();
  if (!template) {
    await reply('❌ Format: *.setproses <teks template>*\nContoh: *.setproses ⏳ Pesanan sedang diproses. Mohon tunggu.*');
    return;
  }

  TransactionTemplateRepository.setProses(ctx.chatJid, template);
  await reply('✅ Template *proses* berhasil disimpan.');
}

export async function handleChangeProses(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  const template = ctx.fullArgs.trim();
  if (!template) {
    await reply('❌ Format: *.changeproses <teks template baru>*');
    return;
  }

  const current = TransactionTemplateRepository.get(ctx.chatJid);
  if (!current?.proses_template) {
    await reply('ℹ️ Template proses belum diatur. Gunakan *.setproses* terlebih dahulu.');
    return;
  }

  TransactionTemplateRepository.setProses(ctx.chatJid, template);
  await reply('✅ Template *proses* berhasil diubah.');
}

export async function handleDelSetProses(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  TransactionTemplateRepository.setProses(ctx.chatJid, null);
  await reply('✅ Template *proses* berhasil dihapus.');
}

export async function handleSetDone(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  const template = ctx.fullArgs.trim();
  if (!template) {
    await reply('❌ Format: *.setdone <teks template>*\nContoh: *.setdone ✅ Pesanan selesai diproses. Terima kasih.*');
    return;
  }

  TransactionTemplateRepository.setDone(ctx.chatJid, template);
  await reply('✅ Template *selesai* berhasil disimpan.');
}

export async function handleChangeDone(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  const template = ctx.fullArgs.trim();
  if (!template) {
    await reply('❌ Format: *.changedone <teks template baru>*');
    return;
  }

  const current = TransactionTemplateRepository.get(ctx.chatJid);
  if (!current?.done_template) {
    await reply('ℹ️ Template selesai belum diatur. Gunakan *.setdone* terlebih dahulu.');
    return;
  }

  TransactionTemplateRepository.setDone(ctx.chatJid, template);
  await reply('✅ Template *selesai* berhasil diubah.');
}

export async function handleDelSetDone(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  TransactionTemplateRepository.setDone(ctx.chatJid, null);
  await reply('✅ Template *selesai* berhasil dihapus.');
}

export async function handleProses(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  const current = TransactionTemplateRepository.get(ctx.chatJid);
  if (!current?.proses_template) {
    await reply('ℹ️ Template proses belum diatur. Gunakan *.setproses* terlebih dahulu.');
    return;
  }

  await reply(current.proses_template);
}

export async function handleDone(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  const current = TransactionTemplateRepository.get(ctx.chatJid);
  if (!current?.done_template) {
    await reply('ℹ️ Template selesai belum diatur. Gunakan *.setdone* terlebih dahulu.');
    return;
  }

  await reply(current.done_template);
}
