import { CommandContext, ReplyFn } from '../types';
import { ModerationRepository, TransactionTemplateRepository, GroupSettingsRepository } from '../database/repositories/settingsRepository';
import { getSocket, getGroupMetadata } from '../connection/whatsapp';
import { getDefaultTemplate } from '../templates/messageTemplates';
import { resolveTemplate } from '../utils/placeholder';
import { buildDailyOrderReport, todayBizDate } from './storeSchedule';
import logger from '../utils/logger';

/**
 * Commands moderasi grup (antiwame, antilink, open, close, hidetag, add, kick, promote, demote, linkgc, resetlinkgc).
 */

export async function handleAntiwame(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  // mode 1: warn & hapus pesan
  ModerationRepository.setAntiwameMode(ctx.chatJid, 1);
  await reply('✅ Antiwame (Mode 1 - Peringatan & Hapus Pesan) telah diaktifkan.');
}

export async function handleAntiwame2(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  // mode 2: kick
  ModerationRepository.setAntiwameMode(ctx.chatJid, 2);
  await reply('✅ Antiwame (Mode 2 - Kick Langsung) telah diaktifkan.');
}

export async function handleAntilink(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  // mode 1: warn & hapus pesan
  ModerationRepository.setAntilinkMode(ctx.chatJid, 1);
  await reply('✅ Antilink (Mode 1 - Peringatan & Hapus Pesan) telah diaktifkan.');
}

export async function handleAntilink2(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  // mode 2: kick
  ModerationRepository.setAntilinkMode(ctx.chatJid, 2);
  await reply('✅ Antilink (Mode 2 - Kick Langsung) telah diaktifkan.');
}

export async function handleOpen(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup terlebih dahulu.');

  const sock = getSocket();
  try {
    await sock.groupSettingUpdate(ctx.chatJid, 'not_announcement');

    // Kirim pesan template open
    const tx = TransactionTemplateRepository.get(ctx.chatJid);
    const template = tx?.open_template ?? getDefaultTemplate('open');
    const { text, mentions } = resolveTemplate(template, {
      user: ctx.senderNumber,
      userJid: ctx.senderJid,
      groupName: ctx.groupName ?? 'Grup',
    });
    await sock.sendMessage(ctx.chatJid, { text, mentions });
  } catch (error) {
    await reply('❌ Gagal membuka grup. Pastikan bot adalah admin.');
  }
}

export async function handleClose(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup terlebih dahulu.');

  const sock = getSocket();
  try {
    await sock.groupSettingUpdate(ctx.chatJid, 'announcement');

    // Kirim pesan template close
    const tx = TransactionTemplateRepository.get(ctx.chatJid);
    const template = tx?.close_template ?? getDefaultTemplate('close');
    const { text, mentions } = resolveTemplate(template, {
      user: ctx.senderNumber,
      userJid: ctx.senderJid,
      groupName: ctx.groupName ?? 'Grup',
    });
    await sock.sendMessage(ctx.chatJid, { text, mentions });

    // Kirim ringkasan order otomatis bila diaktifkan
    if (GroupSettingsRepository.isDataOrderEnabled(ctx.chatJid)) {
      try {
        const report = buildDailyOrderReport(ctx.chatJid, todayBizDate(), 'Laporan Order Hari Ini');
        await sock.sendMessage(ctx.chatJid, { text: report });
      } catch (reportError) {
        logger.error({ error: reportError }, 'Gagal mengirim laporan order saat close');
      }
    }
  } catch (error) {
    await reply('❌ Gagal menutup grup. Pastikan bot adalah admin.');
  }
}

export async function handleHidetag(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const sock = getSocket();
  const meta = await getGroupMetadata(ctx.chatJid);
  if (!meta) return reply('❌ Gagal mengambil daftar anggota grup.');

  const participants = meta.participants.map((p) => p.id);
  const text = ctx.fullArgs.trim() || '📢 Pemberitahuan';

  await sock.sendMessage(ctx.chatJid, {
    text,
    mentions: participants,
  });
}

export async function handleKick(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup terlebih dahulu.');

  const targets = ctx.mentionedJids;
  if (targets.length === 0) {
    return reply('❌ Tag anggota yang ingin dikeluarkan. Contoh: *.kick @user*');
  }

  const sock = getSocket();
  try {
    await sock.groupParticipantsUpdate(ctx.chatJid, targets, 'remove');
    await reply('✅ Anggota berhasil dikeluarkan dari grup.');
  } catch (error) {
    await reply('❌ Gagal mengeluarkan anggota. Terjadi kesalahan pada API WhatsApp.');
  }
}

export async function handleAdd(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup terlebih dahulu.');

  const number = ctx.args[0]?.replace(/[^0-9]/g, '');
  if (!number || number.length < 8) {
    return reply('❌ Sebutkan nomor yang ingin ditambahkan.\nContoh: *.add 628123456789*');
  }

  const targetJid = `${number}@s.whatsapp.net`;
  const sock = getSocket();
  try {
    const res = await sock.groupParticipantsUpdate(ctx.chatJid, [targetJid], 'add');
    await reply('✅ Proses penambahan anggota dikirimkan.');
  } catch (error) {
    await reply('❌ Gagal menambahkan anggota.');
  }
}

export async function handlePromote(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup terlebih dahulu.');

  const targets = ctx.mentionedJids;
  if (targets.length === 0) return reply('❌ Tag anggota yang ingin dijadikan admin.');

  const sock = getSocket();
  try {
    await sock.groupParticipantsUpdate(ctx.chatJid, targets, 'promote');
    await reply('✅ Anggota berhasil dinaikkan menjadi admin.');
  } catch (error) {
    await reply('❌ Gagal mempromosikan anggota.');
  }
}

export async function handleDemote(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup terlebih dahulu.');

  const targets = ctx.mentionedJids;
  if (targets.length === 0) return reply('❌ Tag admin yang ingin diturunkan.');

  const sock = getSocket();
  try {
    await sock.groupParticipantsUpdate(ctx.chatJid, targets, 'demote');
    await reply('✅ Admin berhasil diturunkan menjadi anggota biasa.');
  } catch (error) {
    await reply('❌ Gagal menurunkan jabatan admin.');
  }
}

export async function handleLinkGc(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup terlebih dahulu.');

  const sock = getSocket();
  try {
    const code = await sock.groupInviteCode(ctx.chatJid);
    await reply(`🔗 *Tautan Undangan Grup:*\nhttps://chat.whatsapp.com/${code}`);
  } catch (error) {
    await reply('❌ Gagal mengambil tautan grup.');
  }
}

export async function handleResetLinkGc(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');
  if (!ctx.isBotAdmin) return reply('❌ Bot harus menjadi admin grup terlebih dahulu.');

  const sock = getSocket();
  try {
    const newCode = await sock.groupRevokeInvite(ctx.chatJid);
    await reply(`✅ Tautan grup berhasil direset.\nTautan baru:\nhttps://chat.whatsapp.com/${newCode}`);
  } catch (error) {
    await reply('❌ Gagal mereset tautan grup.');
  }
}
