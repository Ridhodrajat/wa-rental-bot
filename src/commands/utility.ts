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

export async function handleStatus(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  const start = Date.now();
  const db = getDatabase();

  // Hitung pesanan harian (dari history)
  let todayOrders = 0;
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const row = db.prepare(`
      SELECT COUNT(*) as count 
      FROM rental_history 
      WHERE action = 'CREATE' AND created_at LIKE ?
    `).get(`${today}%`) as { count: number };
    todayOrders = row?.count || 0;
  } catch (error) {
    // abaikan jika tabel history belum lengkap/error
  }

  const latency = Date.now() - start;

  await reply(
    `📊 *STATUS TEKNIS BOT*\n\n` +
    `🌐 Koneksi: *Aktif*\n` +
    `⚡ Kecepatan: *${latency} ms*\n` +
    `🛍️ Pesanan Hari Ini: *${todayOrders}*`
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
