import type { DatabaseSync } from 'node:sqlite';
import logger from '../../utils/logger';

/**
 * Sistem migrasi terstruktur dan idempoten.
 * Setiap migrasi dijalankan satu kali dan dicatat pada tabel `migrations`.
 */

interface Migration {
  id: number;
  name: string;
  up: (db: DatabaseSync) => void;
}

const migrations: Migration[] = [
  {
    id: 1,
    name: 'initial_schema',
    up: (db) => {
      db.exec(`
        -- Tabel grup
        CREATE TABLE IF NOT EXISTS groups (
          group_id TEXT PRIMARY KEY,
          group_name TEXT NOT NULL DEFAULT '',
          joined_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- Tabel rental
        CREATE TABLE IF NOT EXISTS rentals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL CHECK (status IN ('ACTIVE','EXPIRED_GRACE','DELETED')),
          expires_at TEXT NOT NULL,
          grace_until TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
        CREATE INDEX IF NOT EXISTS idx_rentals_expires_at ON rentals(expires_at);

        -- Riwayat rental / audit events
        CREATE TABLE IF NOT EXISTS rental_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id TEXT NOT NULL,
          action TEXT NOT NULL CHECK (action IN ('CREATE','EXTEND','EXPIRE','DELETE','RESTORE')),
          days_added INTEGER,
          previous_expires_at TEXT,
          new_expires_at TEXT,
          performed_by TEXT NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_history_group ON rental_history(group_id);
        CREATE INDEX IF NOT EXISTS idx_history_created ON rental_history(created_at);

        -- Katalog produk per grup
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id TEXT NOT NULL,
          name TEXT NOT NULL,
          original_name TEXT NOT NULL,
          description TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
          UNIQUE (group_id, name)
        );
        CREATE INDEX IF NOT EXISTS idx_products_group ON products(group_id);
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(group_id, name);

        -- Template transaksi per grup
        CREATE TABLE IF NOT EXISTS transaction_templates (
          group_id TEXT PRIMARY KEY,
          proses_template TEXT,
          done_template TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
        );

        -- Template welcome / goodbye per grup
        CREATE TABLE IF NOT EXISTS welcome_goodbye (
          group_id TEXT PRIMARY KEY,
          welcome_enabled INTEGER NOT NULL DEFAULT 0,
          welcome_template TEXT,
          goodbye_enabled INTEGER NOT NULL DEFAULT 0,
          goodbye_template TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
        );

        -- Pengaturan moderasi per grup
        CREATE TABLE IF NOT EXISTS moderation_settings (
          group_id TEXT PRIMARY KEY,
          antiwame_mode INTEGER NOT NULL DEFAULT 0 CHECK (antiwame_mode IN (0,1,2)),
          antilink_mode INTEGER NOT NULL DEFAULT 0 CHECK (antilink_mode IN (0,1,2)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
        );

        -- Pengaturan grup umum (custom data setbot, jeda)
        CREATE TABLE IF NOT EXISTS group_settings (
          group_id TEXT PRIMARY KEY,
          custom_data TEXT,
          jeda_ms INTEGER NOT NULL DEFAULT 1500,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
        );

        -- Konfigurasi pembayaran (global, dikelola owner)
        CREATE TABLE IF NOT EXISTS payment_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- Status AFK pengguna per grup
        CREATE TABLE IF NOT EXISTS user_afk (
          group_id TEXT NOT NULL,
          user_jid TEXT NOT NULL,
          reason TEXT,
          start_time TEXT NOT NULL,
          PRIMARY KEY (group_id, user_jid),
          FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
        );
      `);
    },
  },
  {
    id: 2,
    name: 'add_media_templates_antiprivate',
    up: (db) => {
      // 1. Tambah kolom image_path ke products (jika belum ada)
      const productCols = db
        .prepare('PRAGMA table_info(products)')
        .all() as { name: string }[];
      if (!productCols.some((c) => c.name === 'image_path')) {
        db.exec(`ALTER TABLE products ADD COLUMN image_path TEXT`);
      }

      // 2. Tambah kolom template transaksi baru
      const txCols = db
        .prepare('PRAGMA table_info(transaction_templates)')
        .all() as { name: string }[];
      if (!txCols.some((c) => c.name === 'proses_enabled')) {
        db.exec(
          `ALTER TABLE transaction_templates ADD COLUMN proses_enabled INTEGER NOT NULL DEFAULT 1`
        );
      }
      if (!txCols.some((c) => c.name === 'done_enabled')) {
        db.exec(
          `ALTER TABLE transaction_templates ADD COLUMN done_enabled INTEGER NOT NULL DEFAULT 1`
        );
      }
      if (!txCols.some((c) => c.name === 'open_template')) {
        db.exec(`ALTER TABLE transaction_templates ADD COLUMN open_template TEXT`);
      }
      if (!txCols.some((c) => c.name === 'close_template')) {
        db.exec(`ALTER TABLE transaction_templates ADD COLUMN close_template TEXT`);
      }

      // 3. Tambah kolom catalog template ke group_settings
      const gsCols = db
        .prepare('PRAGMA table_info(group_settings)')
        .all() as { name: string }[];
      if (!gsCols.some((c) => c.name === 'catalog_template_id')) {
        db.exec(
          `ALTER TABLE group_settings ADD COLUMN catalog_template_id INTEGER NOT NULL DEFAULT 1`
        );
      }
      if (!gsCols.some((c) => c.name === 'catalog_header')) {
        db.exec(`ALTER TABLE group_settings ADD COLUMN catalog_header TEXT`);
      }
      if (!gsCols.some((c) => c.name === 'catalog_footer')) {
        db.exec(`ALTER TABLE group_settings ADD COLUMN catalog_footer TEXT`);
      }

      // 4. Tabel konfigurasi anti-private-chat (global)
      db.exec(`
        CREATE TABLE IF NOT EXISTS anti_private_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          enabled INTEGER NOT NULL DEFAULT 1,
          message_limit INTEGER NOT NULL DEFAULT 5,
          auto_block INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
      `);

      // 5. Tabel counter private message per pengguna
      db.exec(`
        CREATE TABLE IF NOT EXISTS private_chat_counters (
          user_jid TEXT PRIMARY KEY,
          message_count INTEGER NOT NULL DEFAULT 0,
          warned INTEGER NOT NULL DEFAULT 0,
          blocked INTEGER NOT NULL DEFAULT 0,
          last_message_at TEXT NOT NULL
        );
      `);

      // 6. Tabel konfigurasi global owner (key-value)
      db.exec(`
        CREATE TABLE IF NOT EXISTS global_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Nilai default anti-private
      const now = new Date().toISOString();
      db.prepare(
        `INSERT OR IGNORE INTO anti_private_settings (id, enabled, message_limit, auto_block, updated_at)
         VALUES (1, 1, 5, 0, ?)`
      ).run(now);
    },
  },
];

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = db
    .prepare('SELECT id FROM migrations')
    .all() as { id: number }[];
  const appliedIds = new Set(applied.map((r) => r.id));

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) continue;
    logger.info({ migration: migration.name }, 'Menjalankan migrasi');

    try {
      db.exec('BEGIN');
      migration.up(db);
      db.prepare(
        'INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)'
      ).run(migration.id, migration.name, new Date().toISOString());
      db.exec('COMMIT');
      logger.info({ migration: migration.name }, 'Migrasi berhasil');
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      logger.error({ error, migration: migration.name }, 'Migrasi gagal');
      throw error;
    }
  }
}
