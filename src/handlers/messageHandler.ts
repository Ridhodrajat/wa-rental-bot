import type { WASocket } from '@whiskeysockets/baileys';
import { CommandContext, ReplyFn, ReplyOptions } from '../types';
import { parseCommand, isJidGroup, extractJidNumber } from '../utils/parser';
import { collectSenderJids, isOwnerFromJids, isAdminFromJids, isBotAdminFromMetadata, participantIsAdmin } from '../utils/permissions';
import { getGroupMetadata } from '../connection/whatsapp';
import { getCommandNames, getCommand } from '../commands/index';
import { RentalService } from '../services/rentalService';
import { replyProduct } from '../commands/product';
import { GroupRepository } from '../database/repositories/groupRepository';
import { handlePrivateMessage } from './privateChatHandler';
import { config } from '../config/env';
import logger from '../utils/logger';

/**
 * Handler pesan masuk utama.
 * Parsing, validasi, dispatch ke command atau pencarian produk.
 */

export async function handleIncomingMessage(sock: WASocket, msg: any): Promise<void> {
  const key = msg.key;
  const chatJid = key.remoteJid!;
  if (!chatJid) return;

  // Abaikan status broadcast & pesan sistem
  if (chatJid === 'status@broadcast') return;

  const senderJid = key.participant || key.remoteJid!;
  const isGroup = isJidGroup(chatJid);

  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    '';

  // ============ PRIVATE CHAT (DM) ============
  // Tangani anti-private-chat sebelum apapun untuk pesan DM non-owner
  if (!isGroup) {
    const handled = await handlePrivateMessage(sock, msg);
    if (handled) return;
  }

  // Abaikan pesan tanpa teks & bukan command (kecuali DM sudah ditangani)
  if (!body || body.length > config.maxMessageLength) return;

  const senderNumber = extractJidNumber(senderJid);

  // Kumpulkan semua JID alternatif untuk handle WhatsApp LID
  const allSenderJids = collectSenderJids(msg);

  // Ambil metadata grup jika di grup
  let groupMetadata: any = null;
  let groupName = 'Grup';

  if (isGroup) {
    groupMetadata = await getGroupMetadata(chatJid);
    if (groupMetadata) {
      groupName = groupMetadata.subject || 'Grup';
      // Daftarkan grup ke database agar FK rentals valid
      GroupRepository.upsertGroup(chatJid, groupName);

      // Resolve LID → phone number via group participants
      if (groupMetadata.participants) {
        for (const p of groupMetadata.participants) {
          if (allSenderJids.includes(p.id)) {
            if (p.jid) allSenderJids.push(p.jid);
            if (p.lid) allSenderJids.push(p.lid);
          }
        }
      }
    }
  }

  const isOwnerUser = isOwnerFromJids(allSenderJids, msg);

  let isAdminUser = false;
  let isBotAdminUser = false;

  if (isGroup && groupMetadata) {
    isAdminUser = isAdminFromJids(allSenderJids, groupMetadata);
    // Kumpulkan semua varian JID bot (nomor telepon & LID)
    const botUser = sock.user as any;
    const botJids = [botUser?.id, botUser?.lid, botUser?.jid].filter(
      (x: any): x is string => typeof x === 'string' && x.length > 0
    );
    isBotAdminUser = isBotAdminFromMetadata(botJids, groupMetadata);

    if (!isBotAdminUser) {
      logger.debug(
        {
          chatJid,
          botJids,
          adminJids: groupMetadata.participants
            .filter((p: any) => participantIsAdmin(p))
            .map((p: any) => ({ id: p.id, lid: p.lid, jid: p.jid })),
        },
        'Bot belum terdeteksi sebagai admin grup'
      );
    }
  }

  // Fungsi reply aman (mendukung teks, mention, dan gambar)
  const reply: ReplyFn = async (text: string, options?: ReplyOptions): Promise<any> => {
    try {
      if (options?.imagePath) {
        await sock.sendMessage(
          chatJid,
          {
            image: { url: options.imagePath },
            caption: options.caption ?? text,
            mentions: options.mentions,
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          chatJid,
          { text, mentions: options?.mentions },
          { quoted: msg }
        );
      }
    } catch (error) {
      logger.error({ error, chatJid }, 'Gagal mengirim reply');
    }
  };

  // Ambil info pesan yang di-reply (quoted)
  const contextInfo =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    null;
  const quotedMsg = contextInfo?.quotedMessage ?? undefined;
  const quotedParticipant: string | undefined = contextInfo?.participant ?? undefined;
  const quotedText: string | undefined =
    quotedMsg?.conversation ||
    quotedMsg?.extendedTextMessage?.text ||
    quotedMsg?.imageMessage?.caption ||
    quotedMsg?.videoMessage?.caption ||
    undefined;

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

    // Command yang dikecualikan dari cek rental aktif
    const exemptCommands = [
      'menu', 'cekmenu', 'owner', 'status', 'bot', 'ceksewa', 'listsewa',
      'addsewa', 'delsewa', 'antiprivate', 'setprivatelimit', 'autoblock',
      'cekantiprivate', 'setowner',
    ];
    if (!exemptCommands.includes(parsed.commandName)) {
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
      quotedMsg,
      quotedParticipant,
      quotedText,
      msg,
      groupName,
    };

    // Dispatch ke command handler
    try {
      await cmdDef.handler(ctx, reply);
    } catch (error) {
      logger.error({ error, command: parsed.commandName }, 'Error command handler');
      await reply('❌ Terjadi kesalahan saat memproses perintah.');
    }
  } else {
    // Bukan command: coba cari produk (hanya di grup dengan rental aktif)
    if (isGroup && RentalService.isRentalActive(chatJid)) {
      const ctx: CommandContext = {
        chatJid,
        senderJid,
        senderNumber,
        isGroup,
        isOwner: isOwnerUser,
        isAdmin: isAdminUser,
        isBotAdmin: isBotAdminUser,
        body,
        commandName: '',
        args: [],
        fullArgs: '',
        mentionedJids: [],
        msg,
        groupName,
      };
      await replyProduct(ctx, reply);
    }
  }
}
