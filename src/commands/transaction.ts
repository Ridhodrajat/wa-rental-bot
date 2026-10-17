import { CommandContext, ReplyFn } from '../types';
import { TransactionTemplateRepository } from '../database/repositories/settingsRepository';
import { OrderRepository } from '../database/repositories/orderRepository';
import { MESSAGE_TEMPLATES, getDefaultTemplate, getTemplateOption, TemplateFeature } from '../templates/messageTemplates';
import { resolveTemplate, displayNameFromJid } from '../utils/placeholder';
import { PendingOrderService } from '../services/pendingOrderService';
import { downloadImageBuffer } from '../services/mediaService';
import { ocrImageText } from '../services/ocrService';
import { getSocket } from '../connection/whatsapp';
import { extractAmountFromText, formatRupiah } from '../utils/amount';
import { splitProductAndAmount } from '../utils/orderArgs';
import logger from '../utils/logger';

/**
 * Commands template transaksi (proses & done) dan pesan open/close.
 *
 * - .proses [on|off|preview|list|<teks>]
 * - .done   [on|off|preview|list|<teks>]
 * - .setproses <nomor|teks>, .changeproses, .delsetproses
 * - .setdone <nomor|teks>, .changedone, .delsetdone
 * - .setopen / .setclose / .setopentext / .setclosetext
 */

async function requireAdmin(ctx: CommandContext, reply: ReplyFn): Promise<boolean> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return false;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return false;
  }
  return true;
}

function preview(template: string, ctx: CommandContext): string {
  const { text } = resolveTemplate(template, {
    user: displayNameFromJid(ctx.senderJid),
    userJid: ctx.senderJid,
    groupName: ctx.groupName ?? 'Grup',
    product: ctx.args.join(' ') || undefined,
  });
  return text;
}

/**
 * Resolve template transaksi berdasarkan pesan yang di-reply oleh admin.
 * - @user       -> tag orang yang chat-nya di-reply (fallback: pengirim command)
 * - @produk     -> caption/teks pesan yang di-reply (fallback: "-")
 * - @deskripsi  -> caption/teks pesan yang di-reply (fallback: "-")
 */
function resolveTransaction(
  template: string,
  ctx: CommandContext
): { text: string; mentions: string[] } {
  const targetJid = ctx.quotedParticipant || ctx.senderJid;
  const targetNumber = displayNameFromJid(targetJid);
  const note = (ctx.quotedText && ctx.quotedText.trim()) || '-';

  return resolveTemplate(template, {
    user: targetNumber,
    userJid: targetJid,
    groupName: ctx.groupName ?? 'Grup',
    product: note,
    description: note,
  });
}

/**
 * Kirim template transaksi (proses/done) langsung ke grup.
 */
async function sendTransaction(
  ctx: CommandContext,
  reply: ReplyFn,
  feature: 'proses' | 'done',
  template: string | null,
  enabled: boolean | undefined
): Promise<void> {
  if (enabled === false) {
    await reply(`ℹ️ Fitur *${feature}* sedang dimatikan. Aktifkan dengan *.${feature} on*.`);
    return;
  }
  const finalTemplate = template ?? getDefaultTemplate(feature);
  const { text, mentions } = resolveTransaction(finalTemplate, ctx);
  await reply(text, { mentions });
}

/**
 * Catat order saat admin memakai .done.
 * - Nominal eksplisit (mis. .done 50k) -> simpan langsung.
 * - Ada foto bukti transfer -> OCR nominal lalu tunggu konfirmasi admin.
 * - Tanpa nominal & tanpa foto -> tidak mencatat (seperti perilaku lama).
 */
async function recordDoneOrder(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  const { product: productFromArgs, amount: explicitAmount } = splitProductAndAmount(ctx.fullArgs);
  const buyerJid = ctx.quotedParticipant || undefined;
  const buyerNumber = buyerJid ? displayNameFromJid(buyerJid) : undefined;
  const product = productFromArgs || ctx.quotedText?.trim() || null;

  // 1) Nominal eksplisit -> simpan langsung
  if (explicitAmount != null) {
    OrderRepository.create({
      groupId: ctx.chatJid,
      buyerJid: buyerJid ?? null,
      buyerNumber: buyerNumber ?? null,
      product,
      amount: explicitAmount,
      source: 'manual',
      adminJid: ctx.senderJid,
    });
    await reply(
      `🧾 Order dicatat: *${formatRupiah(explicitAmount)}*` + (product ? `\n🛍️ ${product}` : '')
    );
    return;
  }

  // 2) Ada foto bukti transfer -> OCR & konfirmasi
  const imageBuffer = await downloadImageBuffer(ctx.msg, getSocket());
  if (!imageBuffer) return;

  try {
    await reply('🔎 Membaca foto bukti transfer...');
    logger.info({ chatJid: ctx.chatJid, bytes: imageBuffer.length }, 'OCR: gambar bukti transfer diterima');
    const ocrText = await ocrImageText(imageBuffer);
    const ocrAmount = extractAmountFromText(ocrText);
    logger.info(
      { chatJid: ctx.chatJid, textLength: ocrText?.length ?? 0, ocrAmount },
      'OCR: hasil pembacaan'
    );

    PendingOrderService.set({
      groupId: ctx.chatJid,
      adminJid: ctx.senderJid,
      product,
      buyerJid: buyerJid ?? null,
      buyerNumber: buyerNumber ?? null,
      amount: ocrAmount,
    });

    if (ocrAmount != null) {
      await reply(
        `🔎 Nominal terbaca: *${formatRupiah(ocrAmount)}*\n\n` +
          `Balas *ya* untuk menyimpan, atau ketik nominal yang benar (contoh: 50000).`
      );
    } else {
      await reply(
        '⚠️ Nominal tidak terbaca dari foto.\n\n' +
          'Ketik nominalnya (contoh: *50000*) untuk menyimpan order, atau *batal*.'
      );
    }
  } catch (error) {
    logger.error({ error }, 'Gagal memproses OCR order');
    await reply('⚠️ Gagal membaca foto. Ketik nominal manual, contoh: *.done 50000*');
  }
}

// ============ Proses ============

export async function handleProses(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');

  const arg = ctx.args[0]?.toLowerCase();

  if (arg === 'on' || arg === 'off') {
    if (!(await requireAdmin(ctx, reply))) return;
    const enabled = arg === 'on';
    TransactionTemplateRepository.setProsesEnabled(ctx.chatJid, enabled);
    const current = TransactionTemplateRepository.get(ctx.chatJid)!;
    if (!current.proses_template) {
      TransactionTemplateRepository.setProses(ctx.chatJid, getDefaultTemplate('proses'));
    }
    await reply(`✅ Fitur *proses* ${enabled ? 'diaktifkan 🟢' : 'dimatikan 🔴'}.`);
    return;
  }

  if (arg === 'list') {
    if (!(await requireAdmin(ctx, reply))) return;
    let text = `🎨 *Pilihan Template Proses*\n\n`;
    for (const t of MESSAGE_TEMPLATES.proses) text += `*${t.id}.* ${t.label}\n`;
    text += `\nGunakan: *.setproses <nomor>* atau *.setproses <teks>*`;
    await reply(text);
    return;
  }

  if (arg === 'preview') {
    const current = TransactionTemplateRepository.get(ctx.chatJid);
    const template = current?.proses_template ?? getDefaultTemplate('proses');
    const { text } = resolveTransaction(template, ctx);
    await reply(`🔍 *Preview Proses:*\n\n${text}`);
    return;
  }

  // Tanpa argumen: kirim template proses langsung (tag orang yang di-reply)
  const current = TransactionTemplateRepository.get(ctx.chatJid);
  await sendTransaction(ctx, reply, 'proses', current?.proses_template ?? null, current?.proses_enabled !== 0);
}

export async function handleSetProses(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;
  const arg = ctx.fullArgs.trim();

  if (!arg) {
    let text = `🎨 *Pilihan Template Proses*\n\n`;
    for (const t of MESSAGE_TEMPLATES.proses) text += `*${t.id}.* ${t.label}\n`;
    await reply(text + `\nGunakan: *.setproses <nomor>* atau *.setproses <teks>*`);
    return;
  }

  if (/^\d+$/.test(arg)) {
    const option = getTemplateOption('proses', parseInt(arg, 10));
    if (!option) return reply(`❌ Nomor tidak valid (1-${MESSAGE_TEMPLATES.proses.length}).`);
    TransactionTemplateRepository.setProses(ctx.chatJid, option.text);
    TransactionTemplateRepository.setProsesEnabled(ctx.chatJid, true);
    await reply(`✅ Template proses *${option.label}* dipilih.\n\n🔍 Preview:\n${preview(option.text, ctx)}`);
    return;
  }

  TransactionTemplateRepository.setProses(ctx.chatJid, arg);
  TransactionTemplateRepository.setProsesEnabled(ctx.chatJid, true);
  await reply(`✅ Template proses kustom disimpan.\n\n🔍 Preview:\n${preview(arg, ctx)}`);
}

export async function handleChangeProses(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;
  const template = ctx.fullArgs.trim();
  if (!template) return reply('❌ Format: *.changeproses <teks template baru>*');

  const current = TransactionTemplateRepository.get(ctx.chatJid);
  if (!current?.proses_template) return reply('ℹ️ Template proses belum diatur. Gunakan *.setproses*.');

  TransactionTemplateRepository.setProses(ctx.chatJid, template);
  await reply(`✅ Template *proses* diubah.\n\n🔍 Preview:\n${preview(template, ctx)}`);
}

export async function handleDelSetProses(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;
  TransactionTemplateRepository.setProses(ctx.chatJid, getDefaultTemplate('proses'));
  await reply('✅ Template *proses* direset ke default.');
}

// ============ Done ============

export async function handleDone(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');

  const arg = ctx.args[0]?.toLowerCase();

  if (arg === 'on' || arg === 'off') {
    if (!(await requireAdmin(ctx, reply))) return;
    const enabled = arg === 'on';
    TransactionTemplateRepository.setDoneEnabled(ctx.chatJid, enabled);
    const current = TransactionTemplateRepository.get(ctx.chatJid)!;
    if (!current.done_template) {
      TransactionTemplateRepository.setDone(ctx.chatJid, getDefaultTemplate('done'));
    }
    await reply(`✅ Fitur *done* ${enabled ? 'diaktifkan 🟢' : 'dimatikan 🔴'}.`);
    return;
  }

  if (arg === 'list') {
    if (!(await requireAdmin(ctx, reply))) return;
    let text = `🎨 *Pilihan Template Done*\n\n`;
    for (const t of MESSAGE_TEMPLATES.done) text += `*${t.id}.* ${t.label}\n`;
    text += `\nGunakan: *.setdone <nomor>* atau *.setdone <teks>*`;
    await reply(text);
    return;
  }

  if (arg === 'preview') {
    const current = TransactionTemplateRepository.get(ctx.chatJid);
    const template = current?.done_template ?? getDefaultTemplate('done');
    const { text } = resolveTransaction(template, ctx);
    await reply(`🔍 *Preview Done:*\n\n${text}`);
    return;
  }

  // Tanpa argumen: kirim template done langsung (tag orang yang di-reply)
  const current = TransactionTemplateRepository.get(ctx.chatJid);
  await sendTransaction(ctx, reply, 'done', current?.done_template ?? null, current?.done_enabled !== 0);

  // Catat order untuk laporan pendapatan (jika fitur done aktif)
  if (current?.done_enabled !== 0) {
    await recordDoneOrder(ctx, reply);
  }
}

export async function handleSetDone(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;
  const arg = ctx.fullArgs.trim();

  if (!arg) {
    let text = `🎨 *Pilihan Template Done*\n\n`;
    for (const t of MESSAGE_TEMPLATES.done) text += `*${t.id}.* ${t.label}\n`;
    await reply(text + `\nGunakan: *.setdone <nomor>* atau *.setdone <teks>*`);
    return;
  }

  if (/^\d+$/.test(arg)) {
    const option = getTemplateOption('done', parseInt(arg, 10));
    if (!option) return reply(`❌ Nomor tidak valid (1-${MESSAGE_TEMPLATES.done.length}).`);
    TransactionTemplateRepository.setDone(ctx.chatJid, option.text);
    TransactionTemplateRepository.setDoneEnabled(ctx.chatJid, true);
    await reply(`✅ Template done *${option.label}* dipilih.\n\n🔍 Preview:\n${preview(option.text, ctx)}`);
    return;
  }

  TransactionTemplateRepository.setDone(ctx.chatJid, arg);
  TransactionTemplateRepository.setDoneEnabled(ctx.chatJid, true);
  await reply(`✅ Template done kustom disimpan.\n\n🔍 Preview:\n${preview(arg, ctx)}`);
}

export async function handleChangeDone(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;
  const template = ctx.fullArgs.trim();
  if (!template) return reply('❌ Format: *.changedone <teks template baru>*');

  const current = TransactionTemplateRepository.get(ctx.chatJid);
  if (!current?.done_template) return reply('ℹ️ Template done belum diatur. Gunakan *.setdone*.');

  TransactionTemplateRepository.setDone(ctx.chatJid, template);
  await reply(`✅ Template *done* diubah.\n\n🔍 Preview:\n${preview(template, ctx)}`);
}

export async function handleDelSetDone(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;
  TransactionTemplateRepository.setDone(ctx.chatJid, getDefaultTemplate('done'));
  await reply('✅ Template *done* direset ke default.');
}

// ============ Open / Close template settings ============

export async function handleSetOpen(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;
  const arg = ctx.fullArgs.trim();
  if (!arg) {
    let text = `🎨 *Pilihan Template Open*\n\n`;
    for (const t of MESSAGE_TEMPLATES.open) text += `*${t.id}.* ${t.label}\n`;
    await reply(text + `\nGunakan: *.setopen <nomor>* atau *.setopen <teks>*`);
    return;
  }
  if (/^\d+$/.test(arg)) {
    const option = getTemplateOption('open', parseInt(arg, 10));
    if (!option) return reply(`❌ Nomor tidak valid (1-${MESSAGE_TEMPLATES.open.length}).`);
    TransactionTemplateRepository.setOpen(ctx.chatJid, option.text);
    await reply(`✅ Template open *${option.label}* dipilih.`);
    return;
  }
  TransactionTemplateRepository.setOpen(ctx.chatJid, arg);
  await reply('✅ Template open kustom disimpan.');
}

export async function handleSetClose(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;
  const arg = ctx.fullArgs.trim();
  if (!arg) {
    let text = `🎨 *Pilihan Template Close*\n\n`;
    for (const t of MESSAGE_TEMPLATES.close) text += `*${t.id}.* ${t.label}\n`;
    await reply(text + `\nGunakan: *.setclose <nomor>* atau *.setclose <teks>*`);
    return;
  }
  if (/^\d+$/.test(arg)) {
    const option = getTemplateOption('close', parseInt(arg, 10));
    if (!option) return reply(`❌ Nomor tidak valid (1-${MESSAGE_TEMPLATES.close.length}).`);
    TransactionTemplateRepository.setClose(ctx.chatJid, option.text);
    await reply(`✅ Template close *${option.label}* dipilih.`);
    return;
  }
  TransactionTemplateRepository.setClose(ctx.chatJid, arg);
  await reply('✅ Template close kustom disimpan.');
}
