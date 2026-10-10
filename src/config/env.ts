import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

/**
 * Konfigurasi aplikasi yang dibaca dari environment variable.
 * Validasi dilakukan saat startup agar kesalahan konfigurasi
 * terdeteksi lebih awal (fail-fast).
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Environment variable "${name}" wajib diisi. Lihat .env.example untuk contoh.`
    );
  }
  return value.trim();
}

function normalizeNumber(raw: string): string {
  // Hilangkan karakter non-digit (spasi, +, -, dll)
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 8) {
    throw new Error(`OWNER_NUMBER tidak valid: "${raw}"`);
  }
  return digits;
}

const ownerNumber = normalizeNumber(required('OWNER_NUMBER'));
const botPrefix = (process.env.BOT_PREFIX ?? '.').trim() || '.';
const databasePath = path.resolve(
  process.cwd(),
  process.env.DATABASE_PATH ?? './data/bot.sqlite'
);
const authDir = path.resolve(process.cwd(), process.env.AUTH_DIR ?? './auth');
const logLevel = (process.env.LOG_LEVEL ?? 'info').trim();
const nodeEnv = (process.env.NODE_ENV ?? 'development').trim();

// Zona waktu operasional (untuk tampilan). Default Asia/Makassar (WITA).
const timezone = (process.env.TZ_DISPLAY ?? 'Asia/Makassar').trim();

export const config = {
  ownerNumber,
  botPrefix,
  databasePath,
  authDir,
  logLevel,
  nodeEnv,
  timezone,
  isProduction: nodeEnv === 'production',
  // Durasi masa tenggang data setelah kedaluwarsa (hari)
  gracePeriodDays: 30,
  // Batas panjang pesan yang diproses (anti abuse)
  maxMessageLength: 4000,
  // Nama bot
  botName: 'WA Rental Bot',
  version: '1.0.0',
};

export function ensureRuntimeDirs(): void {
  const dirs = [
    path.dirname(config.databasePath),
    config.authDir,
    path.resolve(process.cwd(), 'backups'),
    path.resolve(process.cwd(), 'data'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export type AppConfig = typeof config;
