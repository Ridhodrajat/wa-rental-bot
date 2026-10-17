import { CommandContext, ReplyFn } from '../types';
import { PendingOrderService } from '../services/pendingOrderService';
import { OrderRepository } from '../database/repositories/orderRepository';
import { parseAmountToNumber, formatRupiah } from '../utils/amount';

/**
 * Menangani konfirmasi order yang tertunda (hasil OCR foto bukti transfer).
 * Dipanggil dari messageHandler saat ada pesan NON-command yang cocok.
 * Mengembalikan true bila pesan sudah ditangani.
 */

const CONFIRM_WORDS = ['ya', 'y', 'iya', 'ok', 'oke', 'okey', 'benar', 'betul', 'simpan', 'yes', '1'];
const CANCEL_WORDS = ['batal', 'cancel', 'tidak', 'tdk', 'gak', 'ga', 'no', 'salah'];
const NUMERIC_LIKE = /^[0-9][0-9.,]*(k|rb|ribu|jt|juta)?$/i;

export async function maybeConfirmPendingOrder(
  ctx: CommandContext,
  reply: ReplyFn
): Promise<boolean> {
  if (!ctx.isGroup) return false;
  if (!ctx.isAdmin && !ctx.isOwner) return false;

  const pending = PendingOrderService.get(ctx.chatJid, ctx.senderJid);
  if (!pending) return false;

  const text = ctx.body.trim().toLowerCase();

  if (CANCEL_WORDS.includes(text)) {
    PendingOrderService.clear(ctx.chatJid, ctx.senderJid);
    await reply('❌ Pencatatan order dibatalkan.');
    return true;
  }

  let amount: number | null = null;

  if (CONFIRM_WORDS.includes(text)) {
    amount = pending.amount;
    if (amount == null) {
      await reply('⚠️ Nominal belum diketahui. Ketik nominalnya (contoh: *50000*) atau *batal*.');
      return true;
    }
  } else {
    const compact = text.replace(/\s+/g, '').replace(/rp\.?/i, '');
    if (!NUMERIC_LIKE.test(compact)) {
      return false; // bukan konfirmasi/nominal -> biarkan alur normal
    }
    const parsed = parseAmountToNumber(compact);
    if (parsed == null || parsed <= 0) return false;
    amount = parsed;
  }

  OrderRepository.create({
    groupId: ctx.chatJid,
    buyerJid: pending.buyerJid,
    buyerNumber: pending.buyerNumber,
    product: pending.product,
    amount,
    source: 'ocr',
    adminJid: pending.adminJid ?? ctx.senderJid,
  });
  PendingOrderService.clear(ctx.chatJid, ctx.senderJid);

  await reply(
    `✅ Order disimpan: *${formatRupiah(amount)}*` +
      (pending.product ? `\n🛍️ ${pending.product}` : '')
  );
  return true;
}
