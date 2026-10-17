import { CommandContext, ReplyFn } from '../types';
import { CatalogExportImportService } from '../services/catalogExportImportService';
import { getSocket } from '../connection/whatsapp';
import { downloadMediaMessage, normalizeMessageContent } from '@whiskeysockets/baileys';
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

const SUPPORTED_EXT = ['.xlsx', '.xls', '.txt', '.csv'];

/**
 * Tentukan ekstensi file dari nama file, mimetype, atau isi buffer (magic bytes).
 */
function resolveExtension(fileName?: string | null, mimetype?: string | null, buffer?: Buffer): string {
  const fromName = fileName ? path.extname(fileName).toLowerCase() : '';
  if (SUPPORTED_EXT.includes(fromName)) return fromName;

  const mt = (mimetype || '').toLowerCase();
  if (mt.includes('spreadsheetml') || mt.includes('sheet')) return '.xlsx';
  if (mt.includes('ms-excel') || mt.includes('excel')) return '.xls';
  if (mt.includes('csv')) return '.csv';
  if (mt.includes('text/plain')) return '.txt';

  // Tebak dari isi file: .xlsx/.xls adalah arsip ZIP (mulai dengan "PK")
  if (buffer && buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) return '.xlsx';
  // .xls lama berbentuk OLE2 (mulai dengan D0 CF 11 E0)
  if (buffer && buffer.length >= 4 && buffer[0] === 0xd0 && buffer[1] === 0xcf) return '.xls';

  return fromName;
}

/**
 * Ambil documentMessage dari konten pesan (langsung atau yang di-reply),
 * dengan membuka bungkus documentWithCaptionMessage / ephemeral / viewOnce.
 */
function extractDocumentMessage(msg: any): {
  document: any;
  quoted: any;
  targetMessage: any;
} | null {
  const directContent: any = normalizeMessageContent(msg?.message);
  const quotedRaw: any = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const quotedContent: any = normalizeMessageContent(quotedRaw);

  const directDoc = directContent?.documentMessage;
  const quotedDoc = quotedContent?.documentMessage;

  if (directDoc) {
    return { document: directDoc, quoted: null, targetMessage: msg };
  }
  if (quotedDoc) {
    return {
      document: quotedDoc,
      quoted: quotedRaw,
      targetMessage: {
        key: {
          remoteJid: msg?.key?.remoteJid,
          fromMe: false,
          id: msg?.message?.extendedTextMessage?.contextInfo?.stanzaId,
          participant: msg?.message?.extendedTextMessage?.contextInfo?.participant,
        },
        message: quotedRaw,
      },
    };
  }
  return null;
}

export async function handleImportList(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const msg = ctx.msg;
  const sock = getSocket();

  // Deteksi file dokumen: dikirim langsung (caption .importlist) atau di-reply
  const found = extractDocumentMessage(msg);
  const documentMessage = found?.document;

  // Kalau tidak ada file tapi ada teks berisi "|", import langsung dari teks
  const rawArgs = (ctx.fullArgs || '').trim();
  if (!documentMessage && rawArgs.includes('|')) {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `import_text_${Date.now()}.txt`);
    try {
      fs.writeFileSync(tempFilePath, rawArgs, 'utf-8');
      const result = await CatalogExportImportService.importFromFile(ctx.chatJid, tempFilePath, '.txt');
      await reply(
        `✅ *Import Katalog Selesai*\n\n` +
        `➕ Produk baru ditambah: ${result.added}\n` +
        `♻️ Produk diperbarui: ${result.updated}\n` +
        `📦 Total: ${result.added + result.updated}`
      );
    } catch (error) {
      logger.error({ error }, 'Gagal import katalog dari teks');
      await reply('❌ Gagal mengimport dari teks. Pastikan format: nama_produk|deskripsi');
    } finally {
      try { fs.unlinkSync(tempFilePath); } catch { /* abaikan */ }
    }
    return;
  }

  if (!documentMessage) {
    await reply(
      `📥 *Cara Import Katalog:*\n\n` +
      `*Metode 1 — File:*\n` +
      `1. Kirim file Excel (.xlsx) atau Teks (.txt) ke grup (.xlsx disarankan diberi caption .importlist)\n` +
      `2. Atau balas file itu dengan pesan *.importlist*\n\n` +
      `*Metode 2 — Teks langsung:*\n` +
      `Ketik *.importlist* diikuti isi katalog, contoh:\n` +
      `\`.importlist\`\n` +
      `\`youtube|YouTube Premium 1 Bulan - Rp50.000\`\n` +
      `\`netflix|Netflix 1 Bulan - Rp30.000\`\n\n` +
      `*Format file Excel:* 2 kolom (Nama Produk | Deskripsi)\n` +
      `*Format file Teks:* nama_produk|deskripsi (satu per baris)\n\n` +
      `💡 File hasil *.exportlist* langsung kompatibel.`
    );
    return;
  }

  let tempFilePath = '';
  try {
    // Unduh isi file
    const buffer = (await downloadMediaMessage(
      found!.targetMessage as any,
      'buffer',
      {},
      {
        logger: logger as any,
        reuploadRequest: (m: any) => sock.updateMediaMessage(m),
      }
    )) as Buffer;

    if (!buffer || buffer.length === 0) {
      await reply('❌ Gagal mengunduh file. Coba kirim ulang file-nya.');
      return;
    }

    const ext = resolveExtension(documentMessage.fileName, documentMessage.mimetype, buffer);

    logger.info(
      { groupId: ctx.chatJid, fileName: documentMessage.fileName, mimetype: documentMessage.mimetype, ext, size: buffer.length },
      'Import katalog: file diterima'
    );

    if (!SUPPORTED_EXT.includes(ext)) {
      await reply(
        '❌ Format file tidak didukung. Gunakan .xlsx, .xls, .txt, atau .csv\n\n' +
        'Tips: kirim file .xlsx, atau balas file-nya dengan *.importlist*.'
      );
      return;
    }

    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    tempFilePath = path.join(tempDir, `import_${Date.now()}${ext}`);
    fs.writeFileSync(tempFilePath, buffer);

    const result = await CatalogExportImportService.importFromFile(ctx.chatJid, tempFilePath, ext);

    if (result.added === 0 && result.updated === 0) {
      await reply(
        '⚠️ Tidak ada produk yang terbaca dari file.\n\n' +
        'Pastikan format benar:\n' +
        '• Excel: kolom 1 = nama produk, kolom 2 = deskripsi (baris 1 header)\n' +
        '• Teks: `nama_produk|deskripsi` satu per baris'
      );
      return;
    }

    await reply(
      `✅ *Import Katalog Selesai*\n\n` +
      `➕ Produk baru ditambah: ${result.added}\n` +
      `♻️ Produk diperbarui: ${result.updated}\n` +
      `📦 Total: ${result.added + result.updated}`
    );
  } catch (error) {
    logger.error({ error, groupId: ctx.chatJid }, 'Gagal import katalog');
    await reply('❌ Gagal mengimport katalog. Pastikan format file benar.');
  } finally {
    if (tempFilePath) {
      try { fs.unlinkSync(tempFilePath); } catch { /* abaikan */ }
    }
  }
}
