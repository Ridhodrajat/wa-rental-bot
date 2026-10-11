import type { WASocket, proto } from '@whiskeysockets/baileys';
import { CommandContext } from '../types';
import { parseCommand, isJidGroup, extractJidNumber } from '../utils/parser';
import { collectSenderJids, isOwnerFromJids, isAdminFromJids, isBotAdminFromMetadata } from '../utils/permissions';
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
  
  // Kumpulkan semua JID alternatif untuk handle WhatsApp LID
  const allSenderJids = collectSenderJids(msg);
  
  // Ambil metadata grup jika di grup
  let groupMetadata: any = null;
  
  if (isGroup) {
    groupMetadata = await getGroupMetadata(chatJid);
    if (groupMetadata) {
      // Daftarkan grup ke database agar FK rentals valid
      GroupRepository.upsertGroup(chatJid, groupMetadata.subject || 'Unknown Group');
      
      // Resolve LID → phone number via group participants
      if (groupMetadata.participants) {
        for (const p of groupMetadata.participants) {
          // If sender matches participant's LID, add phone number to JIDs
          if (allSenderJids.includes(p.id)) {
            if (p.phoneNumber) allSenderJids.push(p.phoneNumber);
            if (p.jid) allSenderJids.push(p.jid);
          }
        }
      }
    }
  }
  
  const isOwnerUser = isOwnerFromJids(allSenderJids, msg);
  
  // Debug log untuk development
  if (config.nodeEnv === 'development') {
    logger.debug({
      chatJid,
      senderJid,
      allSenderJids,
      isOwnerUser,
      ownerNumber: config.ownerNumber,
      fullKey: JSON.stringify(key, null, 2)
    }, 'Message context');
  }

  let isAdminUser = false;
  let isBotAdminUser = false;

  if (isGroup && groupMetadata) {
    isAdminUser = isAdminFromJids(allSenderJids, groupMetadata);
    const botJids = [sock.user!.id];
    isBotAdminUser = isBotAdminFromMetadata(botJids, groupMetadata);
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
