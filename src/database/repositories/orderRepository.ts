import { getDatabase } from '../db';
import { OrderRecord } from '../../types';
import { nowUtc, formatBusinessDate } from '../../utils/time';

/**
 * Repository pesanan/transaksi per grup.
 * Dipakai untuk laporan pendapatan (.dataordernow / .dataorderlast).
 */
export class OrderRepository {
  /**
   * Simpan satu pesanan selesai.
   * biz_date dihitung dari zona waktu tampilan agar laporan harian akurat.
   */
  static create(data: {
    groupId: string;
    buyerJid?: string | null;
    buyerNumber?: string | null;
    product?: string | null;
    amount: number;
    source?: 'manual' | 'ocr';
    note?: string | null;
    adminJid?: string | null;
  }): OrderRecord {
    const db = getDatabase();
    const now = nowUtc();
    const bizDate = formatBusinessDate(now);
    const result = db
      .prepare(`
        INSERT INTO orders (
          group_id, buyer_jid, buyer_number, product, amount, source, note, admin_jid, biz_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        data.groupId,
        data.buyerJid ?? null,
        data.buyerNumber ?? null,
        data.product ?? null,
        Math.round(data.amount),
        data.source ?? 'manual',
        data.note ?? null,
        data.adminJid ?? null,
        bizDate,
        now
      );

    return this.getById(Number(result.lastInsertRowid))!;
  }

  static getById(id: number): OrderRecord | null {
    const db = getDatabase();
    return (
      (db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as
        | OrderRecord
        | undefined) ?? null
    );
  }

  static getForGroupOnDate(groupId: string, bizDate: string): OrderRecord[] {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM orders WHERE group_id = ? AND biz_date = ? ORDER BY id ASC')
      .all(groupId, bizDate) as unknown as OrderRecord[];
  }

  static getLastForGroup(groupId: string): OrderRecord | null {
    const db = getDatabase();
    return (
      (db.prepare('SELECT * FROM orders WHERE group_id = ? ORDER BY id DESC LIMIT 1').get(groupId) as unknown as
        | OrderRecord
        | undefined) ?? null
    );
  }

  static updateAmount(id: number, amount: number): void {
    const db = getDatabase();
    db.prepare('UPDATE orders SET amount = ? WHERE id = ?').run(Math.round(amount), id);
  }

  static deleteById(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  }

  /**
   * Ringkasan order pada tanggal tertentu: jumlah order & total pendapatan.
   * Hanya menghitung order dengan nominal > 0 sebagai pendapatan.
   */
  static summarize(groupId: string, bizDate: string): {
    count: number;
    totalRevenue: number;
    orders: OrderRecord[];
  } {
    const orders = this.getForGroupOnDate(groupId, bizDate);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    return { count: orders.length, totalRevenue, orders };
  }
}
