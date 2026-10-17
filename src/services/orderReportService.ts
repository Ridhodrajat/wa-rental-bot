import ExcelJS from 'exceljs';
import { OrderRepository } from '../database/repositories/orderRepository';
import { OrderRecord } from '../types';
import { formatBusinessDate, formatScheduleTime } from '../utils/time';
import { formatRupiah } from '../utils/amount';

/**
 * Laporan order/pendapatan:
 * - Versi teks singkat (untuk chat, mis. saat .close).
 * - Versi Excel (.xlsx) untuk .dataordernow/.dataorderlast/.dataorderweek/.dataordermonth.
 *
 * Struktur workbook:
 *   1) Sheet "Detail Order"  : daftar seluruh order pada periode.
 *   2) Sheet "Ringkasan Harian": rekap jumlah order & pendapatan per tanggal.
 */

export function todayBizDate(): string {
  return formatBusinessDate(new Date());
}

export function yesterdayBizDate(): string {
  return formatBusinessDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

/** Laporan teks singkat untuk sebuah rentang tanggal. */
export function buildOrderSummaryText(
  groupId: string,
  startDate: string,
  endDate: string,
  title: string
): string {
  const { count, totalRevenue, orders } = OrderRepository.summarizeRange(
    groupId,
    startDate,
    endDate
  );
  const periode = startDate === endDate ? startDate : `${startDate} s/d ${endDate}`;

  let text = `📊 *${title}*\n🗓️ ${periode}\n\n`;
  text += `🧾 Total Order    : *${count}*\n`;
  text += `💰 Total Revenue  : *${formatRupiah(totalRevenue)}*\n`;

  if (orders.length > 0) {
    text += `\n*Rincian (${orders.length}):*\n`;
    for (const o of orders.slice(-20)) {
      const prod = o.product?.trim() || 'Tanpa keterangan';
      const via = o.source === 'ocr' ? ' 🤖' : '';
      text += `• ${prod} — ${formatRupiah(o.amount)}${via}\n`;
    }
    if (orders.length > 20) {
      text += `… dan ${orders.length - 20} order lainnya.\n`;
    }
  } else {
    text += `\n_(belum ada order tercatat)_\n`;
  }

  return text;
}

/** Nama file Excel laporan order. */
export function orderReportFileName(tag: string, startDate: string, endDate: string): string {
  const range = startDate === endDate ? startDate : `${startDate}_${endDate}`;
  return `laporan-order-${tag}-${range}.xlsx`;
}

function buyerLabel(o: OrderRecord): string {
  if (o.buyer_number) return o.buyer_number;
  if (o.buyer_jid) return o.buyer_jid.split('@')[0];
  return '-';
}

function adminLabel(o: OrderRecord): string {
  return o.admin_jid ? o.admin_jid.split('@')[0] : '-';
}

/**
 * Susun laporan order dalam format Excel (.xlsx).
 * Mengembalikan Buffer siap dikirim sebagai dokumen WhatsApp.
 */
export async function buildOrderReportXlsx(
  groupId: string,
  title: string,
  startDate: string,
  endDate: string
): Promise<Buffer> {
  const { count, totalRevenue, orders } = OrderRepository.summarizeRange(
    groupId,
    startDate,
    endDate
  );
  const periode = startDate === endDate ? startDate : `${startDate} s/d ${endDate}`;
  const rataRata = count > 0 ? Math.round(totalRevenue / count) : 0;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'WA Rental Bot';
  wb.created = new Date();

  // ===== Sheet 1: Detail Order =====
  const detail = wb.addWorksheet('Detail Order', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  detail.columns = [
    { width: 6 }, // No
    { width: 14 }, // Tanggal
    { width: 34 }, // Produk
    { width: 16 }, // Nominal
    { width: 10 }, // Sumber
    { width: 20 }, // Pembeli
    { width: 20 }, // Admin
  ];

  const titleRow = detail.addRow([title]);
  detail.mergeCells(titleRow.number, 1, titleRow.number, 7);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1F3864' } };
  titleRow.height = 22;

  const periodRow = detail.addRow([`Periode: ${periode}   •   Dicetak: ${formatScheduleTime()}`]);
  detail.mergeCells(periodRow.number, 1, periodRow.number, 7);
  periodRow.getCell(1).font = { size: 10, color: { argb: 'FF666666' } };

  const summaryRow = detail.addRow([
    `Total Order: ${count}`,
    null,
    null,
    `Total Revenue: ${formatRupiah(totalRevenue)}`,
    null,
    null,
    `Rata-rata: ${formatRupiah(rataRata)}`,
  ]);
  detail.mergeCells(summaryRow.number, 1, summaryRow.number, 3);
  detail.mergeCells(summaryRow.number, 4, summaryRow.number, 6);
  summaryRow.getCell(1).font = { bold: true };
  summaryRow.getCell(4).font = { bold: true };
  summaryRow.getCell(7).font = { italic: true, color: { argb: 'FF666666' } };

  detail.addRow([]); // baris kosong

  const headerRow = detail.addRow(['No', 'Tanggal', 'Produk', 'Nominal', 'Sumber', 'Pembeli', 'Admin']);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5496' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 18;

  orders.forEach((o, i) => {
    const row = detail.addRow([
      i + 1,
      o.biz_date,
      o.product?.trim() || 'Tanpa keterangan',
      o.amount,
      o.source === 'ocr' ? 'OCR' : 'Manual',
      buyerLabel(o),
      adminLabel(o),
    ]);
    row.getCell(4).numFmt = '"Rp"#,##0';
    if (i % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F5FB' } };
    }
  });

  // Baris total di akhir tabel
  if (orders.length > 0) {
    const totalRow = detail.addRow([null, null, 'TOTAL', totalRevenue, null, null, null]);
    totalRow.font = { bold: true };
    totalRow.getCell(4).numFmt = '"Rp"#,##0';
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F5' } };
  }

  // ===== Sheet 2: Ringkasan Harian =====
  const daily = wb.addWorksheet('Ringkasan Harian');
  daily.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 16 },
    { header: 'Jumlah Order', key: 'jumlah', width: 14 },
    { header: 'Total Revenue', key: 'total', width: 20 },
  ];
  daily.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  daily.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5496' } };

  const perDay = new Map<string, { count: number; total: number }>();
  for (const o of orders) {
    const cur = perDay.get(o.biz_date) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += o.amount || 0;
    perDay.set(o.biz_date, cur);
  }

  [...perDay.keys()]
    .sort()
    .forEach((tanggal) => {
      const d = perDay.get(tanggal)!;
      const row = daily.addRow({ tanggal, jumlah: d.count, total: d.total });
      row.getCell(3).numFmt = '"Rp"#,##0';
    });

  if (orders.length > 0) {
    const grand = daily.addRow({ tanggal: 'TOTAL', jumlah: count, total: totalRevenue });
    grand.font = { bold: true };
    grand.getCell(3).numFmt = '"Rp"#,##0';
    grand.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F5' } };
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
