import { CommandContext, ReplyFn } from '../types';
import { CatalogExportImportService } from '../services/catalogExportImportService';
import { getSocket } from '../connection/whatsapp';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

/**
 * Commands untuk export & import katalog produk
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

export async function handleExportList(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const arg = ctx.args[0]?.toLowerCase();

  // Jika user belum pilih format, tanyakan
  if (!arg || (arg !== '1' && arg !== '2')) {
    await reply(
      `📥 *Pilih Format Export:*\n\n` +
      `Balas dengan:\n` +
      `*1* - Excel (.xlsx) - Format rapi dengan tabel berwarna\n` +
      `*2* - Teks (.txt) - Format ringkas, mudah diedit\n\n` +
      `Contoh: balas "1" atau "2"`
    );
    return;
  }

  const format = arg === '1' ? 'xlsx' : 'txt';
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const fileName = `katalog_${ctx.chatJid.replace(/[^0-9]/g, '')}_${Date.now()}.${format}`;
  const filePath = path.join(tempDir, fileName);

  try {
    if (format === 'xlsx') {
      await CatalogExportImportService.exportToExcel(ctx.chatJid, filePath);
    } else {
      CatalogExportImportService.exportToText(ctx.chatJid, filePath);
    }

    const sock = getSocket();
    await sock.sendMessage(ctx.chatJid, {
      document: { url: filePath },
      mimetype: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/plain',
      fileName: `katalog.${format}`,
      caption: `📤 Katalog produk siap diedit dan diimpor kembali dengan .importlist`,
    });

    // Hapus file temp setelah dikirim
    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // abaikan
      }
    }, 5000);
  } catch (error) {
    logger.error({ error, groupId: ctx.chatJid }, 'Gagal export katalog');
    await reply('❌ Gagal mengexport katalog. Coba lagi.');
  }
}

export async function handleImportList(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const msg = ctx.msg;

  // Cek apakah ada file di pesan
  let documentMessage =
    msg?.message?.documentMessage ||
    msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.documentMessage;

  if (!documentMessage) {
    await reply(
      `📥 *Cara Import Katalog:*\n\n` +
      `1. Kirim file Excel (.xlsx) atau Teks (.txt) ke grup\n` +
      `2. Balas file dengan caption: *.importlist*\n\n` +
      `Format file:\n` +
      `- Excel: 2 kolom (Nama Produk | Deskripsi)\n` +
      `- Teks: nama_produk|deskripsi (per baris)\n\n` +
      `Contoh teks:\n` +
      `youtube|YouTube Premium 1 Bulan - Rp50.000\n` +
      `netflix|Netflix 1 Bulan - Rp30.000`
    );
    return;
  }

  try {
    const fileName = documentMessage.fileName || 'imported_file';
    const ext = path.extname(fileName).toLowerCase();

    if (!['.xlsx', '.xls', '.txt', '.csv'].includes(ext)) {
      await reply('❌ Format file tidak didukung. Gunakan .xlsx, .xls, .txt, atau .csv');
      return;
    }

    // Parse langsung dari documentMessage (tidak perlu download)
    let importedProducts: Array<{ name: string; description: string }> = [];

    if (ext === '.txt' || ext === '.csv') {
      // Untuk file teks, Baileys menyimpan buffer di mediaKey/fileLength
      // Alternatif: gunakan mediaMessage URL jika tersedia
      // Untuk simplicity: minta user upload via teks command saja
      await reply('⚠️ Fitur import .txt belum siap. Gunakan .xlsx atau copy-paste teks langsung ke group dengan .importlist');
      return;
    } else if (ext === '.xlsx' || ext === '.xls') {
      // Untuk Excel, kita perlu buffer. Untuk sekarang, simplify dengan instruksi
      await reply('⚠️ Fitur import Excel belum siap. Gunakan cara manual: .addlist untuk setiap produk atau copy-paste teks');
      return;
    }

    // Fallback: tidak support untuk sekarang
    await reply('⚠️ Fitur import file belum sepenuhnya diimplementasikan. Silakan gunakan .addlist manual atau hubungi developer.');
  } catch (error) {
    logger.error({ error, groupId: ctx.chatJid }, 'Gagal import katalog');
    await reply('❌ Gagal mengimport katalog. Coba lagi atau hubungi admin.');
  }
}
