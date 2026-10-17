import path from 'path';
import logger from '../utils/logger';

/**
 * Service OCR untuk membaca teks dari foto bukti transfer.
 * Memakai tesseract.js (WASM) sehingga tidak butuh binary sistem.
 *
 * Worker dibuat sekali (singleton) agar hemat resource. Jika library tidak
 * tersedia / gagal dimuat, OCR otomatis dinonaktifkan dan tidak mengganggu
 * fitur lain.
 */

let workerPromise: Promise<any> | null = null;
let ocrDisabled = false;

async function getWorker(): Promise<any> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const mod: any = await import('tesseract.js');
    const createWorker = mod.createWorker || mod.default?.createWorker;
    if (typeof createWorker !== 'function') {
      throw new Error('createWorker tidak ditemukan pada tesseract.js');
    }
    // OEM.LSTM_ONLY = 1; cachePath menyimpan eng.traineddata agar tidak
    // diunduh berulang kali (butuh internet pada pemakaian pertama).
    const cachePath = path.resolve(process.cwd(), 'data', 'ocr');
    const worker = await createWorker('eng', 1, { cachePath });
    logger.info('OCR worker siap (tesseract.js)');
    return worker;
  })();
  return workerPromise;
}

/**
 * Jalankan OCR pada buffer gambar. Mengembalikan teks mentah atau null.
 */
export async function ocrImageText(buffer: Buffer): Promise<string | null> {
  if (ocrDisabled) return null;
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(buffer);
    return (data?.text as string) ?? null;
  } catch (error) {
    logger.error({ error }, 'Gagal menjalankan OCR, menonaktifkan OCR sementara');
    ocrDisabled = true;
    return null;
  }
}

export function isOcrAvailable(): boolean {
  return !ocrDisabled;
}
