import fs from 'fs';
import path from 'path';
import { downloadMediaMessage, normalizeMessageContent } from '@whiskeysockets/baileys';
import { config } from '../config/env';
import logger from '../utils/logger';

/**
 * Service pengelolaan media (foto produk).
 * Menyimpan file secara persisten di folder media/<groupId>/.
 */

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export interface SavedMedia {
  relativePath: string; // Path relatif terhadap mediaDir (disimpan di DB)
  absolutePath: string;
}

/**
 * Bersihkan nama grup agar aman dipakai sebagai nama folder.
 */
function safeFolderName(groupId: string): string {
  return groupId.replace(/[^a-zA-Z0-9._@-]/g, '_');
}

/**
 * Unduh & simpan media dari pesan (gambar) ke penyimpanan lokal.
 * Mengembalikan null jika bukan gambar / tidak valid / terlalu besar.
 */
export async function saveProductImage(
  msg: any,
  groupId: string,
  productKey: string,
  sock?: any
): Promise<SavedMedia | null> {
  try {
    const imageMessage =
      msg?.message?.imageMessage ??
      msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

    if (!imageMessage) return null;

    const mime = imageMessage.mimetype ?? '';
    if (!ALLOWED_MIME.includes(mime)) {
      logger.warn({ mime }, 'Tipe media tidak diizinkan');
      return null;
    }

    // Cek ukuran (fileLength tersedia pada metadata)
    const fileLength = Number(imageMessage.fileLength ?? 0);
    if (fileLength && fileLength > config.maxMediaSizeBytes) {
      logger.warn({ fileLength }, 'Ukuran media melebihi batas');
      return null;
    }

    // Bangun WAMessage yang berisi imageMessage untuk diunduh
    const targetMessage = msg?.message?.imageMessage
      ? msg
      : {
          key: msg.key,
          message: {
            imageMessage:
              msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage,
          },
        };

    const buffer = (await downloadMediaMessage(
      targetMessage as any,
      'buffer',
      {},
      {
        logger: logger as any,
        reuploadRequest: sock ? (m: any) => sock.updateMediaMessage(m) : (async (m: any) => m),
      }
    )) as Buffer;

    if (!buffer || buffer.length === 0) return null;
    if (buffer.length > config.maxMediaSizeBytes) {
      logger.warn({ size: buffer.length }, 'Ukuran buffer media melebihi batas');
      return null;
    }

    const folder = path.join(config.mediaDir, safeFolderName(groupId));
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const safeKey = productKey.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
    const fileName = `${safeKey}_${Date.now()}.${ext}`;
    const absolutePath = path.join(folder, fileName);

    fs.writeFileSync(absolutePath, buffer);

    const relativePath = path
      .relative(config.mediaDir, absolutePath)
      .replace(/\\/g, '/');

    return { relativePath, absolutePath };
  } catch (error) {
    logger.error({ error }, 'Gagal menyimpan foto produk');
    return null;
  }
}

/**
 * Unduh gambar (dikirim langsung atau di-reply) menjadi Buffer.
 * Dipakai untuk OCR bukti transfer. Mengembalikan null bila bukan gambar/gagal.
 */
export async function downloadImageBuffer(msg: any, sock?: any): Promise<Buffer | null> {
  try {
    const directContent: any = normalizeMessageContent(msg?.message);
    const quotedRaw: any = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedContent: any = normalizeMessageContent(quotedRaw);

    const directImage = directContent?.imageMessage;
    const quotedImage = quotedContent?.imageMessage;
    const imageMessage = directImage || quotedImage;
    if (!imageMessage) return null;

    const targetMessage = directImage
      ? msg
      : {
          key: msg.key,
          message: quotedRaw,
        };

    const buffer = (await downloadMediaMessage(
      targetMessage as any,
      'buffer',
      {},
      {
        logger: logger as any,
        reuploadRequest: sock ? (m: any) => sock.updateMediaMessage(m) : async (m: any) => m,
      }
    )) as Buffer;

    if (!buffer || buffer.length === 0) return null;
    if (buffer.length > config.maxMediaSizeBytes) {
      logger.warn({ size: buffer.length }, 'Ukuran gambar melebihi batas untuk OCR');
      return null;
    }
    return buffer;
  } catch (error) {
    logger.error({ error }, 'Gagal mengunduh gambar untuk OCR');
    return null;
  }
}

/**
 * Ambil path absolut dari path relatif yang tersimpan di DB.
 */
export function resolveMediaPath(relativePath: string | null): string | null {
  if (!relativePath) return null;
  const abs = path.resolve(config.mediaDir, relativePath);
  if (!fs.existsSync(abs)) return null;
  return abs;
}

/**
 * Hapus file media dengan aman (tidak menghapus folder lain).
 */
export function deleteMediaFile(relativePath: string | null): void {
  if (!relativePath) return;
  try {
    const abs = path.resolve(config.mediaDir, relativePath);
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
      logger.info({ path: abs }, 'File media dihapus');
    }
  } catch (error) {
    logger.error({ error, relativePath }, 'Gagal menghapus file media');
  }
}
