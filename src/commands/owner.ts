import { CommandContext, ReplyFn } from '../types';
import { RentalService } from '../services/rentalService';
import { AntiPrivateRepository } from '../database/repositories/antiPrivateRepository';
import { GlobalConfigRepository } from '../database/repositories/globalConfigRepository';
import { formatToTimezone, humanRemainingTime, parseDurationMs } from '../utils/time';
import { config } from '../config/env';

/**
 * Commands khusus Owner dan informasi bot umum.
 */

export async function handleOwnerInfo(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  await reply(
    `👑 *Owner Bot*\n` +
    `Nama: ${config.ownerName}\n` +
    `Nomor: wa.me/${config.ownerNumber}\n` +
    `Silakan hubungi nomor di atas untuk sewa atau perpanjangan bot.`
  );
}

export async function handleAddSewa(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  // addsewa <durasi> di grup
  // addsewa <group_id> <durasi> di chat pribadi
  let targetGroupId = ctx.chatJid;
  let durationInput = '';

  if (ctx.isGroup) {
    if (!ctx.args[0]) {
      await reply(
        '❌ Format salah.\nGunakan: *.addsewa <durasi>*\n' +
        'Format durasi:\n' +
        '  • *m* = menit (contoh: 30m)\n' +
        '  • *j* = jam (contoh: 2j)\n' +
        '  • *h* = hari (contoh: 30h)\n' +
        'Contoh: *.addsewa 30h*'
      );
      return;
    }
    durationInput = ctx.args[0];
  } else {
    if (ctx.args.length < 2) {
      await reply(
        '❌ Format chat pribadi:\n' +
        '*.addsewa <group_id> <durasi>*\n' +
        'Contoh: *.addsewa 1203630123456789@g.us 30h*'
      );
      return;
    }
    targetGroupId = ctx.args[0];
    durationInput = ctx.args[1];
  }

  const durationMs = parseDurationMs(durationInput);
  if (!durationMs) {
    await reply(
      '❌ Format durasi tidak valid.\n' +
      'Gunakan: *m* (menit), *j* (jam), *h* (hari), atau angka polos (hari).\n' +
      'Contoh: *.addsewa 30m* / *.addsewa 2j* / *.addsewa 30h*'
    );
    return;
  }

  try {
    const result = await RentalService.createOrExtend(targetGroupId, durationMs, ctx.senderNumber);
    const expStr = formatToTimezone(result.rental.expires_at);
    const remaining = humanRemainingTime(result.rental.expires_at);

    await reply(
      `✅ *Sewa Berhasil ${result.action === 'EXTEND' ? 'Diperpanjang' : result.action === 'RESTORE' ? 'Dipulihkan' : 'Diaktifkan'}*\n\n` +
      `Grup: ${targetGroupId}\n` +
      `Durasi ditambah: ${durationInput}\n` +
      `Kedaluwarsa: ${expStr}\n` +
      `Sisa waktu: ${remaining}`
    );
  } catch (error) {
    await reply('❌ Gagal memproses sewa. Terjadi kesalahan pada database.');
  }
}

export async function handleDelSewa(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  let targetGroupId = ctx.chatJid;
  if (!ctx.isGroup) {
    if (!ctx.args[0]) {
      await reply('❌ Format chat pribadi: *.delsewa <group_id>*');
      return;
    }
    targetGroupId = ctx.args[0];
  }

  const rental = RentalService.getRentalInfo(targetGroupId);
  if (!rental) {
    await reply('❌ Grup ini tidak memiliki data sewa aktif.');
    return;
  }

  RentalService.deactivateRental(targetGroupId, ctx.senderNumber);
  await reply(`✅ Sewa untuk grup ${targetGroupId} telah dinonaktifkan.`);
}

export async function handleCekSewa(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  let targetGroupId = ctx.chatJid;

  // Jika owner di chat pribadi menyebut group id
  if (ctx.isOwner && !ctx.isGroup && ctx.args[0]) {
    targetGroupId = ctx.args[0];
  }

  if (!ctx.isGroup && !ctx.args[0]) {
    await reply('❌ Silakan sebutkan ID grup: *.ceksewa <group_id>*');
    return;
  }

  const rental = RentalService.getRentalInfo(targetGroupId);
  if (!rental) {
    await reply('ℹ️ Grup ini belum terdaftar atau tidak memiliki masa sewa.');
    return;
  }

  const expStr = formatToTimezone(rental.expires_at);
  const remaining = humanRemainingTime(rental.expires_at);

  await reply(
    `📋 *Status Sewa Bot*\n\n` +
    `Status: *${rental.status}*\n` +
    `Kedaluwarsa: ${expStr}\n` +
    `Sisa Masa Berlaku: ${remaining}\n` +
    (rental.status === 'EXPIRED_GRACE'
      ? `⚠️ Masa tenggang hingga: ${formatToTimezone(rental.grace_until)}`
      : '')
  );
}

export async function handleListSewa(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  const { RentalRepository } = await import('../database/repositories/rentalRepository');
  const rentals = RentalRepository.getAll();

  if (rentals.length === 0) {
    await reply('ℹ️ Belum ada data rental di database.');
    return;
  }

  let text = `📋 *Daftar Seluruh Rental (${rentals.length})*\n\n`;
  for (let i = 0; i < rentals.length; i++) {
    const r = rentals[i];
    text += `${i + 1}. ${r.group_id}\n`;
    text += `   Status: ${r.status}\n`;
    text += `   Exp: ${formatToTimezone(r.expires_at)}\n`;
    text += `   Sisa: ${humanRemainingTime(r.expires_at)}\n\n`;
  }

  await reply(text.trim());
}

// ============ Anti-Private-Chat (Owner) ============

export async function handleAntiPrivate(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  const arg = ctx.args[0]?.toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    await reply('❌ Format: *.antiprivate on* atau *.antiprivate off*');
    return;
  }

  const enabled = arg === 'on';
  AntiPrivateRepository.setEnabled(enabled);
  await reply(`✅ Anti-private-chat ${enabled ? 'diaktifkan 🟢' : 'dimatikan 🔴'}.`);
}

export async function handleSetPrivateLimit(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  const limit = parseInt(ctx.args[0], 10);
  if (isNaN(limit) || limit <= 0 || limit > 1000) {
    await reply('❌ Format: *.setprivatelimit <angka>*\nContoh: *.setprivatelimit 5*');
    return;
  }

  AntiPrivateRepository.setMessageLimit(limit);
  await reply(`✅ Batas pesan private diatur ke *${limit}*.`);
}

export async function handleAutoBlock(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  const arg = ctx.args[0]?.toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    await reply('❌ Format: *.autoblock on* atau *.autoblock off*');
    return;
  }

  const enabled = arg === 'on';
  AntiPrivateRepository.setAutoBlock(enabled);
  await reply(
    `✅ Auto-block (blocklist internal) ${enabled ? 'diaktifkan 🟢' : 'dimatikan 🔴'}.\n` +
    `ℹ️ Catatan: ini adalah blocklist internal bot, bukan pemblokiran akun WhatsApp.`
  );
}

export async function handleCekAntiPrivate(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  const s = AntiPrivateRepository.getSettings();
  const counters = AntiPrivateRepository.getAllCounters();
  const blocked = counters.filter((c) => c.blocked === 1);

  let text =
    `🛡️ *Status Anti-Private-Chat*\n\n` +
    `Fitur: ${s.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
    `Batas pesan: *${s.message_limit}* bubble\n` +
    `Auto-block (internal): ${s.auto_block ? '🟢 ON' : '🔴 OFF'}\n` +
    `Total pengirim tercatat: ${counters.length}\n` +
    `Diblokir internal: ${blocked.length}\n`;

  if (counters.length > 0) {
    text += `\n*5 pengirim teratas:*\n`;
    for (const c of counters.slice(0, 5)) {
      text += `• ${c.user_jid.split('@')[0]} — ${c.message_count} pesan${c.blocked ? ' 🚫' : ''}\n`;
    }
  }

  await reply(text);
}

export async function handleSetOwner(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  const number = ctx.args[0]?.replace(/[^0-9]/g, '');
  if (!number || number.length < 8) {
    await reply(
      '❌ Format: *.setowner <nomor>*\nContoh: *.setowner 6289510214771*\n\n' +
      'ℹ️ Nomor owner utama tetap dibaca dari .env. Command ini menyimpan nomor owner tambahan di database.'
    );
    return;
  }

  GlobalConfigRepository.set('owner_number_override', number);
  await reply(`✅ Nomor owner override disimpan: ${number}\nℹ️ Restart bot agar perubahan berlaku penuh.`);
}
