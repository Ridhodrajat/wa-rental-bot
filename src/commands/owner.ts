import { CommandContext } from '../types';
import { RentalService } from '../services/rentalService';
import { PaymentConfigRepository } from '../database/repositories/settingsRepository';
import { formatToTimezone, humanRemainingTime } from '../utils/time';
import { config } from '../config/env';

/**
 * Commands khusus Owner dan informasi bot umum.
 */

export async function handleOwnerInfo(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  await reply(
    `👑 *Owner Bot*\n` +
    `Nomor: wa.me/${config.ownerNumber}\n` +
    `Silakan hubungi nomor di atas untuk sewa atau perpanjangan bot.`
  );
}

export async function handleAddSewa(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  // addsewa <hari> di grup
  // addsewa <group_id> <hari> di chat pribadi
  let targetGroupId = ctx.chatJid;
  let days = 0;

  if (ctx.isGroup) {
    if (!ctx.args[0]) {
      await reply('❌ Format salah.\nGunakan: *.addsewa <jumlah_hari>*\nContoh: *.addsewa 30*');
      return;
    }
    days = parseInt(ctx.args[0], 10);
  } else {
    // Chat pribadi ke bot
    if (ctx.args.length < 2) {
      await reply(
        '❌ Format chat pribadi:\n' +
        '*.addsewa <group_id> <jumlah_hari>*\n' +
        'Contoh: *.addsewa 1203630123456789@g.us 30*'
      );
      return;
    }
    targetGroupId = ctx.args[0];
    days = parseInt(ctx.args[1], 10);
  }

  if (isNaN(days) || days <= 0) {
    await reply('❌ Jumlah hari harus berupa angka positif.');
    return;
  }

  try {
    const result = await RentalService.createOrExtend(targetGroupId, days, ctx.senderNumber);
    const expStr = formatToTimezone(result.rental.expires_at);
    const remaining = humanRemainingTime(result.rental.expires_at);

    await reply(
      `✅ *Sewa Berhasil ${result.action === 'EXTEND' ? 'Diperpanjang' : 'Diaktifkan'}*\n\n` +
      `Grup: ${targetGroupId}\n` +
      `Durasi ditambah: ${days} hari\n` +
      `Kedaluwarsa: ${expStr}\n` +
      `Sisa waktu: ${remaining}`
    );
  } catch (error) {
    await reply('❌ Gagal memproses sewa. Terjadi kesalahan pada database.');
  }
}

export async function handleDelSewa(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
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

export async function handleCekSewa(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
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

export async function handleListSewa(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
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

export async function handlePay(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  const payConfig = PaymentConfigRepository.get();
  if (!payConfig || !payConfig.content.trim()) {
    await reply(
      'ℹ️ Metode pembayaran belum diatur oleh Owner.\n' +
      `Hubungi owner di wa.me/${config.ownerNumber}`
    );
    return;
  }

  await reply(`💳 *Metode Pembayaran*\n\n${payConfig.content}`);
}

export async function handleSetPay(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  if (!ctx.fullArgs) {
    await reply(
      '❌ Format salah.\nGunakan: *.setpay <informasi pembayaran>*\n' +
      'Contoh: *.setpay BCA: 123456789 a.n John / DANA: 08123456789*'
    );
    return;
  }

  PaymentConfigRepository.set(ctx.fullArgs, ctx.senderNumber);
  await reply('✅ Metode pembayaran berhasil diperbarui.');
}
