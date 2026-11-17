import { CommandContext, ReplyFn, RentalPlan } from '../types';
import { RentalService } from '../services/rentalService';
import { PlanService } from '../services/planService';
import { AntiPrivateRepository } from '../database/repositories/antiPrivateRepository';
import { GlobalConfigRepository } from '../database/repositories/globalConfigRepository';
import { formatToTimezone, humanRemainingTime, parseDurationMs } from '../utils/time';
import { config } from '../config/env';
import { formatRupiah, OWNER_WA_LINK, PRICE_MONTHLY, PRICE_WEEKLY } from '../templates/trialAds';

/**
 * Commands khusus Owner dan informasi bot umum.
 */

/** Normalisasi argumen paket. Mengembalikan null bila tidak dikenali. */
function parsePlanArg(raw?: string): RentalPlan | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (['trial', 'gratis', 'free'].includes(value)) return 'trial';
  if (['paid', 'bayar', 'premium', 'berbayar'].includes(value)) return 'paid';
  return null;
}

function planLabel(plan: RentalPlan): string {
  return plan === 'trial' ? '🆓 Trial (gratis)' : '💎 Berbayar';
}

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

  // addsewa <durasi> [trial|paid] di grup
  // addsewa <group_id> <durasi> [trial|paid] di chat pribadi
  let targetGroupId = ctx.chatJid;
  let durationInput = '';
  let planArg: string | undefined;

  if (ctx.isGroup) {
    if (!ctx.args[0]) {
      await reply(
        '❌ Format salah.\nGunakan: *.addsewa <durasi> [trial|paid]*\n' +
        'Format durasi:\n' +
        '  • *m* = menit (contoh: 30m)\n' +
        '  • *j* = jam (contoh: 2j)\n' +
        '  • *h* = hari (contoh: 30h)\n' +
        'Contoh: *.addsewa 30h* atau *.addsewa 7h trial*'
      );
      return;
    }
    durationInput = ctx.args[0];
    planArg = ctx.args[1];
  } else {
    if (ctx.args.length < 2) {
      await reply(
        '❌ Format chat pribadi:\n' +
        '*.addsewa <group_id> <durasi> [trial|paid]*\n' +
        'Contoh: *.addsewa 1203630123456789@g.us 30h paid*'
      );
      return;
    }
    targetGroupId = ctx.args[0];
    durationInput = ctx.args[1];
    planArg = ctx.args[2];
  }

  const plan = parsePlanArg(planArg);
  if (planArg && !plan) {
    await reply(
      '❌ Paket tidak dikenal.\n' +
      'Gunakan *trial* (gratis) atau *paid* (berbayar).\n' +
      'Contoh: *.addsewa 7h trial*'
    );
    return;
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
    if (plan) PlanService.setPlan(targetGroupId, plan);

    const finalPlan = plan ?? result.rental.plan;
    const expStr = formatToTimezone(result.rental.expires_at);
    const remaining = humanRemainingTime(result.rental.expires_at);

    await reply(
      `✅ *Sewa Berhasil ${result.action === 'EXTEND' ? 'Diperpanjang' : result.action === 'RESTORE' ? 'Dipulihkan' : 'Diaktifkan'}*\n\n` +
      `Grup: ${targetGroupId}\n` +
      `Paket: ${planLabel(finalPlan)}\n` +
      `Durasi ditambah: ${durationInput}\n` +
      `Kedaluwarsa: ${expStr}\n` +
      `Sisa waktu: ${remaining}`
    );
  } catch (error) {
    await reply('❌ Gagal memproses sewa. Terjadi kesalahan pada database.');
  }
}

export async function handleSetPlan(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  // setplan <paket> di grup
  // setplan <group_id> <paket> di chat pribadi
  let targetGroupId = ctx.chatJid;
  let planArg: string | undefined;

  if (ctx.isGroup) {
    planArg = ctx.args[0];
  } else {
    targetGroupId = ctx.args[0];
    planArg = ctx.args[1];
  }

  const plan = parsePlanArg(planArg);
  if (!plan) {
    await reply(
      '❌ Format salah.\n' +
      'Di grup: *.setplan <trial|paid>*\n' +
      'Di chat pribadi: *.setplan <group_id> <trial|paid>*\n' +
      'Contoh: *.setplan trial*'
    );
    return;
  }

  const rental = RentalService.getRentalInfo(targetGroupId);
  if (!rental) {
    await reply('❌ Grup ini belum terdaftar. Jalankan *.addsewa* terlebih dahulu.');
    return;
  }

  PlanService.setPlan(targetGroupId, plan);
  await reply(
    `✅ Paket grup ${targetGroupId} diubah ke ${planLabel(plan)}.\n` +
    (plan === 'trial'
      ? `Kuota trial: *${config.trialDailyLimit}* balasan/hari + iklan di akhir balasan.`
      : `Semua fitur terbuka, tanpa iklan, tanpa batas balasan.`)
  );
}

/**
 * Informasi paket & harga. Bisa dipakai semua pengguna sebagai materi upsell.
 */
export async function handlePlanInfo(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  // Hanya tampilkan paket grup bila grup memang punya data rental.
  const rental = ctx.isGroup ? RentalService.getRentalInfo(ctx.chatJid) : null;
  const access = rental ? PlanService.getAccess(ctx.chatJid) : null;

  let text = `💎 *PAKET SEWA IDAIDO BOT*\n\n`;

  if (access) {
    text += `Paket grup ini: *${planLabel(access.plan)}*\n`;
    if (access.isTrial) {
      text += `Kuota hari ini: *${access.used}/${access.limit}* balasan\n`;
      text += `Sisa kuota: *${access.remaining}*\n`;
    }
    text += `\n`;
  }

  text +=
    `🆓 *Trial (Gratis)*\n` +
    `• ${config.trialDailyLimit} balasan per hari\n` +
    `• Iklan kecil di akhir balasan bot\n` +
    `• Fitur dasar: katalog, order, welcome, antilink\n\n` +
    `💎 *Berbayar*\n` +
    `• Tanpa iklan\n` +
    `• Balasan tanpa batas\n` +
    `• Laporan Excel & rekap order otomatis\n` +
    `• Jadwal buka/tutup toko otomatis\n` +
    `• Kustom header/footer katalog & branding grup\n\n` +
    `💳 Mingguan (7 hari): *${formatRupiah(PRICE_WEEKLY)}*\n` +
    `💳 Bulanan (30 hari): *${formatRupiah(PRICE_MONTHLY)}*\n\n` +
    `📩 Order / upgrade: ${OWNER_WA_LINK}`;

  await reply(text, { hideAd: true });
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

  let text =
    `📋 *Status Sewa Bot*\n\n` +
    `Status: *${rental.status}*\n` +
    `Paket: *${planLabel(rental.plan)}*\n` +
    `Kedaluwarsa: ${expStr}\n` +
    `Sisa Masa Berlaku: ${remaining}\n`;

  if (rental.plan === 'trial') {
    const access = PlanService.getAccess(targetGroupId);
    text += `Kuota hari ini: *${access.used}/${access.limit}* balasan (sisa ${access.remaining})\n`;
  }

  if (rental.status === 'EXPIRED_GRACE') {
    text += `⚠️ Masa tenggang hingga: ${formatToTimezone(rental.grace_until)}`;
  }

  await reply(text.trimEnd());
}

export async function handleListSewa(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
    return;
  }

  const { RentalRepository } = await import('../database/repositories/rentalRepository');
  const { GroupRepository } = await import('../database/repositories/groupRepository');
  const rentals = RentalRepository.getAll();

  if (rentals.length === 0) {
    await reply('ℹ️ Belum ada data rental di database.');
    return;
  }

  let text = `📋 *Daftar Seluruh Rental (${rentals.length})*\n\n`;
  for (let i = 0; i < rentals.length; i++) {
    const r = rentals[i];
    const group = GroupRepository.getGroupById(r.group_id);
    const groupName = group?.group_name?.trim() || r.group_id;
    text += `${i + 1}. ${groupName}\n`;
    text += `   Status: ${r.status}\n`;
    text += `   Paket: ${r.plan === 'trial' ? '🆓 Trial' : '💎 Berbayar'}\n`;
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
