import { DatabaseSync } from 'node:sqlite';
import { setDatabaseForTesting } from '../src/database/db';
import { runMigrations } from '../src/database/migrations';
import { GroupRepository } from '../src/database/repositories/groupRepository';
import { ProductRepository } from '../src/database/repositories/productRepository';
import { RentalRepository } from '../src/database/repositories/rentalRepository';
import { RentalService } from '../src/services/rentalService';
import { AntiPrivateRepository } from '../src/database/repositories/antiPrivateRepository';
import { parseDurationMs } from '../src/utils/time';
import { resolveTemplate } from '../src/utils/placeholder';
import { getDefaultTemplate, MESSAGE_TEMPLATES } from '../src/templates/messageTemplates';
import { CATALOG_TEMPLATES } from '../src/templates/catalogTemplates';
import { parseCommand } from '../src/utils/parser';

/**
 * Test suite untuk fitur-fitur baru:
 * - Katalog dengan foto (kolom image_path)
 * - Durasi sewa menit/jam/hari
 * - Template pesan (welcome/goodbye/proses/done/open/close)
 * - Template katalog aesthetic
 * - Anti-private-chat
 */

describe('Fitur Baru WA Rental Bot', () => {
  let db: DatabaseSync;

  beforeAll(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    setDatabaseForTesting(db);
    runMigrations(db);
  });

  afterAll(() => {
    setDatabaseForTesting(null);
    db.close();
  });

  beforeEach(() => {
    db.exec('DELETE FROM rental_history;');
    db.exec('DELETE FROM products;');
    db.exec('DELETE FROM rentals;');
    db.exec('DELETE FROM groups;');
    db.exec('DELETE FROM private_chat_counters;');
    db.exec('UPDATE anti_private_settings SET enabled = 1, message_limit = 5, auto_block = 0 WHERE id = 1;');
  });

  describe('Durasi sewa (m/j/h)', () => {
    test('Parse menit', () => {
      expect(parseDurationMs('30m')).toBe(30 * 60 * 1000);
    });

    test('Parse jam', () => {
      expect(parseDurationMs('2j')).toBe(2 * 60 * 60 * 1000);
    });

    test('Parse hari', () => {
      expect(parseDurationMs('30h')).toBe(30 * 24 * 60 * 60 * 1000);
    });

    test('Angka polos dianggap hari (kompatibilitas)', () => {
      expect(parseDurationMs('30')).toBe(30 * 24 * 60 * 60 * 1000);
    });

    test('Format tidak valid ditolak', () => {
      expect(parseDurationMs('abc')).toBeNull();
      expect(parseDurationMs('0m')).toBeNull();
      expect(parseDurationMs('-5h')).toBeNull();
      expect(parseDurationMs('')).toBeNull();
    });

    test('Perpanjangan menambah durasi, bukan mengganti', () => {
      const groupId = 'dur@g.us';
      GroupRepository.upsertGroup(groupId, 'Dur Group');
      const MIN = 60 * 1000;

      const r1 = RentalService.createOrExtend(groupId, 10 * MIN, '628123');
      const firstExpiry = new Date(r1.rental.expires_at).getTime();

      const r2 = RentalService.createOrExtend(groupId, 5 * MIN, '628123');
      const secondExpiry = new Date(r2.rental.expires_at).getTime();

      // Selisih harus 5 menit dari expiry sebelumnya
      expect(secondExpiry - firstExpiry).toBe(5 * MIN);
      expect(r2.action).toBe('EXTEND');
    });
  });

  describe('Produk dengan foto', () => {
    test('Simpan produk dengan image_path', () => {
      GroupRepository.upsertGroup('img@g.us', 'Image Group');
      const p = ProductRepository.create('img@g.us', 'Kopi', 'Kopi enak', 'img@g.us/kopi.jpg');
      expect(p.image_path).toBe('img@g.us/kopi.jpg');
    });

    test('Produk tanpa foto tetap valid', () => {
      GroupRepository.upsertGroup('nofoto@g.us', 'No Photo Group');
      const p = ProductRepository.create('nofoto@g.us', 'Teh', 'Teh manis');
      expect(p.image_path).toBeNull();
    });

    test('Update foto tanpa menghilangkan data jika hanya deskripsi', () => {
      GroupRepository.upsertGroup('upd@g.us', 'Upd Group');
      ProductRepository.create('upd@g.us', 'Produk A', 'Deskripsi A', 'path/a.jpg');
      // Update deskripsi saja (imagePath tidak diberikan -> undefined)
      ProductRepository.updateDescription('upd@g.us', 'Produk A', 'Deskripsi B');
      const p = ProductRepository.findByName('upd@g.us', 'Produk A');
      expect(p?.description).toBe('Deskripsi B');
      expect(p?.image_path).toBe('path/a.jpg'); // foto lama tetap
    });

    test('Produk terisolasi antar grup', () => {
      GroupRepository.upsertGroup('iso1@g.us', 'Iso 1');
      GroupRepository.upsertGroup('iso2@g.us', 'Iso 2');
      ProductRepository.create('iso1@g.us', 'pay', 'Metode bayar grup 1');
      expect(ProductRepository.findByName('iso2@g.us', 'pay')).toBeNull();
      expect(ProductRepository.findByName('iso1@g.us', 'pay')).not.toBeNull();
    });

    test('Nama produk "pay"/"payment" tetap bisa disimpan', () => {
      GroupRepository.upsertGroup('payg@g.us', 'Pay Group');
      const p1 = ProductRepository.create('payg@g.us', 'pay', 'Instruksi pembayaran');
      const p2 = ProductRepository.create('payg@g.us', 'payment', 'Metode pembayaran');
      expect(p1.name).toBe('pay');
      expect(p2.name).toBe('payment');
    });
  });

  describe('Template pesan', () => {
    test('Setiap fitur punya minimal 3 template', () => {
      for (const feature of ['welcome', 'goodbye', 'proses', 'done', 'open', 'close'] as const) {
        expect(MESSAGE_TEMPLATES[feature].length).toBeGreaterThanOrEqual(3);
      }
    });

    test('Template default tersedia langsung', () => {
      expect(getDefaultTemplate('welcome')).toContain('@namagrup');
      expect(getDefaultTemplate('proses')).toContain('@user');
    });

    test('Resolve placeholder @user dan @namagrup', () => {
      const { text } = resolveTemplate('Halo @user di @namagrup!', {
        user: 'budi',
        userJid: '628123@s.whatsapp.net',
        groupName: 'Toko ABC',
      });
      expect(text).toContain('budi');
      expect(text).toContain('Toko ABC');
      expect(text).not.toContain('@user');
      expect(text).not.toContain('@namagrup');
    });

    test('Placeholder tanpa nilai dibersihkan (tidak mentah)', () => {
      const { text } = resolveTemplate('Produk: @produk', {});
      expect(text).not.toContain('@produk');
    });

    test('Mention dikumpulkan untuk @user', () => {
      const { mentions } = resolveTemplate('Halo @user!', {
        user: 'budi',
        userJid: '628123@s.whatsapp.net',
      });
      expect(mentions).toContain('628123@s.whatsapp.net');
    });
  });

  describe('Template katalog', () => {
    test('Tersedia minimal 5 template katalog', () => {
      expect(CATALOG_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    });

    test('Template 1 adalah Hhi-Haloow', () => {
      expect(CATALOG_TEMPLATES[0].label).toBe('Hhi-Haloow');
      expect(CATALOG_TEMPLATES[0].header).toContain('@namagrup');
      expect(CATALOG_TEMPLATES[0].productPrefix).toContain('𖦹');
    });

    test('Semua template punya header, footer, productPrefix', () => {
      for (const t of CATALOG_TEMPLATES) {
        expect(t.header.length).toBeGreaterThan(0);
        expect(t.footer.length).toBeGreaterThan(0);
        expect(t.productPrefix.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Anti private chat', () => {
    test('Settings default terbaca', () => {
      const s = AntiPrivateRepository.getSettings();
      expect(s.enabled).toBe(1);
      expect(s.message_limit).toBe(5);
      expect(s.auto_block).toBe(0);
    });

    test('Increment counter pesan', () => {
      const jid = '628999@s.whatsapp.net';
      AntiPrivateRepository.increment(jid);
      AntiPrivateRepository.increment(jid);
      const c = AntiPrivateRepository.getCounter(jid);
      expect(c?.message_count).toBe(2);
    });

    test('Mark warned & blocked', () => {
      const jid = '628888@s.whatsapp.net';
      AntiPrivateRepository.increment(jid);
      AntiPrivateRepository.markWarned(jid);
      expect(AntiPrivateRepository.getCounter(jid)?.warned).toBe(1);

      AntiPrivateRepository.markBlocked(jid);
      expect(AntiPrivateRepository.isBlocked(jid)).toBe(true);
    });

    test('Counter persisten (tidak reset setelah increment ulang)', () => {
      const jid = '628777@s.whatsapp.net';
      AntiPrivateRepository.increment(jid);
      AntiPrivateRepository.increment(jid);
      AntiPrivateRepository.increment(jid);
      // Simulasi "restart" dengan membaca ulang
      const c = AntiPrivateRepository.getCounter(jid);
      expect(c?.message_count).toBe(3);
    });

    test('Reset counter menghapus data', () => {
      const jid = '628666@s.whatsapp.net';
      AntiPrivateRepository.increment(jid);
      AntiPrivateRepository.resetCounter(jid);
      expect(AntiPrivateRepository.getCounter(jid)).toBeNull();
    });
  });

  describe('Command parser baru', () => {
    const validCommands = new Set(['menu', 'ping', 'list', 'setlisttemplate']);

    test('menu tanpa prefix dikenali', () => {
      const r = parseCommand('menu', validCommands);
      expect(r.isCommand).toBe(true);
      expect(r.commandName).toBe('menu');
    });

    test('ping dengan prefix', () => {
      const r = parseCommand('.ping', validCommands);
      expect(r.isCommand).toBe(true);
      expect(r.commandName).toBe('ping');
    });

    test('Multi-line args dipertahankan', () => {
      const r = parseCommand('.setwelcome Halo @user\nSelamat datang!', validCommands);
      expect(r.isCommand).toBe(true);
      expect(r.fullArgs).toContain('\n');
    });
  });
});
