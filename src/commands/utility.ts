import { CommandContext } from '../types';
import { AfkRepository, GroupSettingsRepository } from '../database/repositories/settingsRepository';
import { config } from '../config/env';
import { humanRemainingTime } from '../utils/time';

/**
 * Commands utilitas (afk, jeda, kalkulator, bot info).
 */

export async function handleAfk(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');

  const reason = ctx.fullArgs.trim() || null;
  AfkRepository.set(ctx.chatJid, ctx.senderJid, reason);

  await reply(
    `✅ Status AFK kamu telah diaktifkan.${reason ? `\nAlasan: ${reason}` : ''}\n` +
    'Ketik pesan apa saja untuk menonaktifkan AFK.'
  );
}

export async function handleJeda(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');
  if (!ctx.isAdmin && !ctx.isOwner) return reply('❌ Khusus admin grup.');

  const ms = parseInt(ctx.args[0], 10);
  if (isNaN(ms) || ms < 0 || ms > 10000) {
    return reply('❌ Format: *.jeda <millisecond>*\nContoh: *.jeda 2000*\nRange: 0-10000 ms');
  }

  GroupSettingsRepository.setJeda(ctx.chatJid, ms);
  await reply(`✅ Jeda operasi diatur ke ${ms}ms.`);
}

export async function handleTambah(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  const [a, b] = ctx.args.map((x) => parseFloat(x));
  if (isNaN(a) || isNaN(b)) return reply('❌ Format: *.tambah <angka1> <angka2>*');
  await reply(`📐 Hasil: ${a + b}`);
}

export async function handleKurang(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  const [a, b] = ctx.args.map((x) => parseFloat(x));
  if (isNaN(a) || isNaN(b)) return reply('❌ Format: *.kurang <angka1> <angka2>*');
  await reply(`📐 Hasil: ${a - b}`);
}

export async function handleKali(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  const [a, b] = ctx.args.map((x) => parseFloat(x));
  if (isNaN(a) || isNaN(b)) return reply('❌ Format: *.kali <angka1> <angka2>*');
  await reply(`📐 Hasil: ${a * b}`);
}

export async function handleBagi(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  const [a, b] = ctx.args.map((x) => parseFloat(x));
  if (isNaN(a) || isNaN(b)) return reply('❌ Format: *.bagi <angka1> <angka2>*');
  if (b === 0) return reply('❌ Tidak dapat membagi dengan nol.');
  await reply(`📐 Hasil: ${a / b}`);
}

export async function handleBotInfo(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  const uptime = process.uptime();
  const uptimeStr = humanRemainingTime(new Date(Date.now() + uptime * 1000).toISOString());

  await reply(
    `🤖 *${config.botName}*\n` +
    `Versi: ${config.version}\n` +
    `Uptime: ${Math.floor(uptime / 60)} menit\n` +
    `Environment: ${config.nodeEnv}\n` +
    `Prefix: ${config.botPrefix}\n\n` +
    `Hubungi owner: wa.me/${config.ownerNumber}`
  );
}
