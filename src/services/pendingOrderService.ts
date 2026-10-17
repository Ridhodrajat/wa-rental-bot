/**
 * Penyimpanan sementara (in-memory) untuk konfirmasi order dari hasil OCR.
 * Ketika admin menjalankan .done dengan foto bukti transfer, bot membaca
 * nominal lalu menunggu konfirmasi admin (balas "ya" atau ketik nominal).
 */

export interface PendingOrder {
  groupId: string;
  adminJid: string;
  product: string | null;
  buyerJid: string | null;
  buyerNumber: string | null;
  amount: number | null; // hasil OCR (bisa null bila tidak terbaca)
  createdAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 menit
const store = new Map<string, PendingOrder>();

function key(groupId: string, adminJid: string): string {
  return `${groupId}|${adminJid}`;
}

export class PendingOrderService {
  static set(data: Omit<PendingOrder, 'createdAt'>): void {
    store.set(key(data.groupId, data.adminJid), { ...data, createdAt: Date.now() });
  }

  static get(groupId: string, adminJid: string): PendingOrder | null {
    const item = store.get(key(groupId, adminJid));
    if (!item) return null;
    if (Date.now() - item.createdAt > TTL_MS) {
      store.delete(key(groupId, adminJid));
      return null;
    }
    return item;
  }

  static clear(groupId: string, adminJid: string): void {
    store.delete(key(groupId, adminJid));
  }
}
