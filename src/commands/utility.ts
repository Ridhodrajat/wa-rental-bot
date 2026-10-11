import { CommandContext, ReplyFn } from '../types';
import { AfkRepository } from '../database/repositories/settingsRepository';
import { getDatabase } from '../database/db';
import { config } from '../config/env';

/**
 * Commands utilitas (afk, ping, bot info).
 */

export async function handleAfk(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');

  const reason = ctx.fullArgs.trim() || null;
  AfkRepository.set(ctx.chatJid, ctx.senderJid, reason);

  await reply(
    `✅ Status AFK kamu telah diaktifkan.${reason ? `\nAlasan: ${reason}` : ''}\n` +
    'Ketik pesan apa saja untuk menonaktifkan AFK.'
  );
}

export async function handlePing(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  const start = Date.now();

  // Cek kesehatan database dengan query ringan (bukan query berat)
  let dbStatus = 'OK';
  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
  } catch {
    dbStatus = 'ERROR';
  }

  const latency = Date.now() - start;

  await reply(
    `🏓 *PONG!* Bot aktif.\n` +
    `⏱️ Response: ${latency} ms\n` +
    `🗄️ Database: ${dbStatus}`
  );
}

export async function handleBotInfo(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  await reply(
    `🤖 *${config.botName}*\n` +
    `Versi: ${config.version}\n` +
    `Uptime: ${hours}j ${minutes}m ${seconds}s\n` +
    `Environment: ${config.nodeEnv}\n` +
    `Prefix: ${config.botPrefix}\n\n` +
    `Hubungi owner: wa.me/${config.ownerNumber}`
  );
}
