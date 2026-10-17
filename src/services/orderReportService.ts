import PDFDocument from 'pdfkit';
import { OrderRepository } from '../database/repositories/orderRepository';
import { OrderRecord } from '../types';
import { formatBusinessDate, formatScheduleTime } from '../utils/time';
import { formatRupiah } from '../utils/amount';

/**
 * Laporan order/pendapatan: versi teks (untuk chat) dan versi PDF.
 *
 * PDF dirancang 2 kolom, 15 order per halaman A4, dengan paginasi aman
 * (satu baris order tidak pernah terpotong antar halaman).
 */

export function todayBizDate(): string {
  return formatBusinessDate(new Date());
}

export function yesterdayBizDate(): string {
  return formatBusinessDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

/** Susun laporan teks singkat untuk sebuah grup & tanggal. */
export function buildDailyOrderReport(groupId: string, bizDate: string, title: string): string {
  const { count, totalRevenue, orders } = OrderRepository.summarize(groupId, bizDate);

  let text = `📊 *${title}*\n🗓️ ${bizDate}\n\n`;
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

export function buildOrderReportFileName(bizDate: string): string {
  return `laporan-order-${bizDate}.pdf`;
}

const PDF_MARGIN = 40;
const COL_GAP = 14;
const ROWS_PER_PAGE = 15;
const ROWS_LEFT = 8; // 8 di kolom kiri, 7 di kolom kanan = 15/halaman
const ROW_H = 34;

/**
 * Buat PDF laporan order (2 kolom, 15 order per halaman A4).
 */
export function buildOrderReportPdf(
  groupId: string,
  bizDate: string,
  title: string
): Promise<Buffer> {
  const { count, totalRevenue, orders } = OrderRepository.summarize(groupId, bizDate);

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: PDF_MARGIN, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const contentW = pageW - PDF_MARGIN * 2;
      const colW = (contentW - COL_GAP) / 2;

      const drawHeader = (): number => {
        doc.fillColor('#1F3864').font('Helvetica-Bold').fontSize(16)
          .text(title, PDF_MARGIN, PDF_MARGIN);
        doc.fillColor('#666666').font('Helvetica').fontSize(9)
          .text(
            `Tanggal: ${bizDate}   •   Dicetak: ${formatScheduleTime()}`,
            PDF_MARGIN,
            PDF_MARGIN + 22
          );

        const boxY = PDF_MARGIN + 42;
        doc.roundedRect(PDF_MARGIN, boxY, contentW, 40, 8).fillAndStroke('#F2F5FB', '#D6DEEE');
        doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10)
          .text(`Total Order: ${count}`, PDF_MARGIN + 14, boxY + 9);
        doc.text(`Total Revenue: ${formatRupiah(totalRevenue)}`, PDF_MARGIN + 14, boxY + 23);
        return boxY + 56;
      };

      const drawRow = (o: OrderRecord, globalIndex: number, x: number, y: number): void => {
        const amountStr = formatRupiah(o.amount);
        doc.font('Helvetica-Bold').fontSize(9);
        const amountW = doc.widthOfString(amountStr);

        doc.roundedRect(x, y, colW, ROW_H - 6, 6).fill('#FAFBFD');

        doc.fillColor('#2E5496').font('Helvetica-Bold').fontSize(9)
          .text(String(globalIndex + 1), x + 8, y + 8, { width: 22 });

        const prod = o.product?.trim() || 'Tanpa keterangan';
        const maxProdW = Math.max(40, colW - 30 - amountW - 14);
        doc.fillColor('#222222').font('Helvetica').fontSize(9)
          .text(prod, x + 30, y + 8, { width: maxProdW, height: 12, ellipsis: true });

        doc.fillColor('#0B6B3A').font('Helvetica-Bold').fontSize(9)
          .text(amountStr, x + colW - amountW - 8, y + 8, { width: amountW, align: 'right' });
      };

      let startY = drawHeader();
      const totalPages = Math.max(1, Math.ceil(orders.length / ROWS_PER_PAGE));

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          doc.addPage();
          startY = drawHeader();
        }
        const slice = orders.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);
        slice.forEach((o, i) => {
          const col = i < ROWS_LEFT ? 0 : 1;
          const rowInCol = col === 0 ? i : i - ROWS_LEFT;
          const x = PDF_MARGIN + col * (colW + COL_GAP);
          const y = startY + rowInCol * ROW_H;
          drawRow(o, page * ROWS_PER_PAGE + i, x, y);
        });
      }

      // Footer nomor halaman (bufferPages memungkinkan menulis ke halaman mana pun)
      const range = doc.bufferedPageRange();
      for (let p = range.start; p < range.start + range.count; p++) {
        doc.switchToPage(p);
        doc.fillColor('#999999').font('Helvetica').fontSize(8)
          .text(
            `Halaman ${p - range.start + 1} dari ${range.count}`,
            PDF_MARGIN,
            pageH - PDF_MARGIN - 20,
            { width: contentW, align: 'center' }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
