import type { WASocket, proto } from '@whiskeysockets/baileys';
import { CommandContext } from '../types';
import { parseCommand, isJidGroup, extractJidNumber } from '../utils/parser';
import { isOwner, isGroupAdmin, isBotGroupAdmin } from '../utils/permissions';
import { getGroupMetadata } from '../connection/whatsapp';
import { getCommandNames, getCommand, buildMenu } from '../commands/index';
import { RentalService } from '../services/rentalService';
import { ProductRepository } from '../database/repositories/productRepository';
import { GroupRepository } from '../database/repositories/groupRepository';
import { config } from '../config/env';
import logger from '../utils/logger';

/**
 * Handler pesan masuk utama.
 * Parsing, validasi, dispatch ke command atau pencarian produk.
 */

export async function handleIncomingMessage(sock: WASocket, msg: any): Promise<void> {
  const key = msg.key;
  const chatJid = key.remoteJid!;
  const senderJid = key.participant || key.remoteJid!;
  const isGroup = isJidGroup(chatJid);
  const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

  if (!body || body.length > config.maxMessageLength) return;

  const senderNumber = extractJidNumber(senderJid);
  const isOwnerUser = isOwner(senderJid);

  // Ambil metadata grup jika di grup
  let groupMetadata: any = null;
  let isAdminUser = false;
  let isBotAdminUser = false;

  if (isGroup) {
    groupMetadata = await getGroupMetadata(chatJid);
    if (groupMetadata) {
      isAdminUser = isGroupAdmin(senderJid, groupMetadata);
      isBotAdminUser = isBotGroupAdmin(sock.user!.id, groupMetadata);
      // Daftarkan grup ke database agar FK rentals valid
      GroupRepository.upsertGroup(chatJid, groupMetadata.subject || 'Unknown Group');
    }
  }

  // Fungsi reply aman
  const reply = async (text: string): Promise<any> => {
    try {
      await sock.sendMessage(chatJid, { text }, { quoted: msg });
    } catch (error) {
      logger.error({ error, chatJid }, 'Gagal mengirim reply');
    }
  };

  // Parse command
  const parsed = parseCommand(body, getCommandNames());

  if (parsed.isCommand) {
    const cmdDef = getCommand(parsed.commandName);
    if (!cmdDef) {
      return; // Command tidak terdaftar
    }

    // Validasi hak akses
    if (cmdDef.ownerOnly && !isOwnerUser) {
      await reply('❌ Perintah ini hanya dapat dijalankan oleh Owner bot.');
      return;
    }

    if (cmdDef.adminOnly && !isOwnerUser && !isAdminUser) {
      await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup.');
      return;
    }

    if (cmdDef.groupOnly && !isGroup) {
      await reply('❌ Perintah ini hanya bisa digunakan di grup.');
      return;
    }

    // Cek rental aktif (kecuali owner commands dan info)
    if (!['owner', 'pay', 'ceksewa', 'listsewa', 'bot', 'addsewa', 'delsewa', 'setpay', 'cekmenu'].includes(parsed.commandName)) {
      if (isGroup && !RentalService.isRentalActive(chatJid)) {
        await reply('❌ Grup ini belum terdaftar atau masa sewa sudah berakhir.');
        return;
      }
    }

    // Build context
    const ctx: CommandContext = {
      chatJid,
      senderJid,
      senderNumber,
      isGroup,
      isOwner: isOwnerUser,
      isAdmin: isAdminUser,
      isBotAdmin: isBotAdminUser,
      body,
      commandName: parsed.commandName,
      args: parsed.args,
      fullArgs: parsed.fullArgs,
      mentionedJids: msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
      quotedMsg: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage,
      msg,
    };

    // Handle cekmenu khusus
    if (parsed.commandName === 'cekmenu') {
      await reply(buildMenu(ctx));
      return;
    }

    // Dispatch ke command handler
    try {
      await cmdDef.handler(ctx, reply);
    } catch (error) {
      logger.error({ error, command: parsed.commandName }, 'Error command handler');
      await reply('❌ Terjadi kesalahan saat memproses perintah.');
    }
  } else {
    // Bukan command: coba cari produk
    // Jangan reply untuk pesan biasa
    if (isGroup && RentalService.isRentalActive(chatJid)) {
      const product = ProductRepository.findByName(chatJid, body);
      if (product) {
        await reply(`📦 *${product.original_name}*\n${product.description}`);
      }
    }
  }
}
