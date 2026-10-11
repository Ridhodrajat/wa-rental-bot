/**
 * Konfigurasi PM2 untuk WA Rental Bot.
 *
 * Cara pakai:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *
 * Catatan penting:
 * - instances HARUS 1. Jangan jalankan lebih dari satu proses dengan sesi WhatsApp
 *   yang sama (menyebabkan konflik stream / Bad MAC / logout).
 * - exec_mode 'fork' (bukan 'cluster') karena Baileys tidak mendukung cluster.
 * - max_memory_restart mencegah memory leak jangka panjang.
 * - NODE_ENV=production memakai konfigurasi produksi.
 */
module.exports = {
  apps: [
    {
      name: 'wa-rental-bot',
      script: './dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      // Tunggu 5 detik sebelum restart jika crash berulang (hindari restart loop)
      restart_delay: 5000,
      // Jangan langsung menyerah saat crash (biarkan PM2 restart otomatis)
      max_restarts: 50,
      min_uptime: '20s',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
    },
  ],
};
