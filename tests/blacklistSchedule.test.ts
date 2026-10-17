import { DatabaseSync } from 'node:sqlite';
import { setDatabaseForTesting } from '../src/database/db';
import { runMigrations } from '../src/database/migrations';
import { GroupRepository } from '../src/database/repositories/groupRepository';
import { OrderRepository } from '../src/database/repositories/orderRepository';
import { BlacklistRepository } from '../src/database/repositories/blacklistRepository';
import { GroupSettingsRepository } from '../src/database/repositories/settingsRepository';
import { buildOrderReportPdf } from '../src/services/orderReportService';
import { formatScheduleTime, formatBusinessDate } from '../src/utils/time';

describe('BlacklistRepository', () => {
  let db: DatabaseSync;
  const GROUP = 'bl-test@g.us';
  const OTHER = 'bl-other@g.us';

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
    db.exec('DELETE FROM blacklist;');
    db.exec('DELETE FROM group_settings;');
    db.exec('DELETE FROM orders;');
    db.exec('DELETE FROM groups;');
    BlacklistRepository.clearCache();
    GroupRepository.upsertGroup(GROUP, 'BL Group');
    GroupRepository.upsertGroup(OTHER, 'BL Other');
  });

  test('Tambah, baca, dan normalisasi nomor', () => {
    BlacklistRepository.add(GROUP, '+62 812-3456-7890', 'Penipu', '6281');
    const item = BlacklistRepository.get(GROUP, '6281234567890');
    expect(item).not.toBeNull();
    expect(item!.number).toBe('6281234567890');
    expect(item!.reason).toBe('Penipu');
    expect(BlacklistRepository.isBlacklisted(GROUP, '62 812 3456 7890')).toBe(true);
  });

  test('Tambah ulang memperbarui alasan (upsert)', () => {
    BlacklistRepository.add(GROUP, '628111', 'Spam', '6281');
    BlacklistRepository.add(GROUP, '628111', 'Scam', '6281');
    const all = BlacklistRepository.getAll(GROUP);
    expect(all.length).toBe(1);
    expect(all[0].reason).toBe('Scam');
  });

  test('Edit alasan & hapus', () => {
    BlacklistRepository.add(GROUP, '628222', 'Awal', '6281');
    expect(BlacklistRepository.updateReason(GROUP, '628222', 'Baru')).toBe(true);
    expect(BlacklistRepository.get(GROUP, '628222')!.reason).toBe('Baru');
    expect(BlacklistRepository.remove(GROUP, '628222')).toBe(true);
    expect(BlacklistRepository.isBlacklisted(GROUP, '628222')).toBe(false);
    expect(BlacklistRepository.updateReason(GROUP, '628222', 'x')).toBe(false);
  });

  test('Terisolasi antar grup & cache konsisten', () => {
    BlacklistRepository.add(GROUP, '628333', 'Grup A', '6281');
    expect(BlacklistRepository.isBlacklisted(OTHER, '628333')).toBe(false);
    expect(BlacklistRepository.getNumberSet(GROUP).has('628333')).toBe(true);
    BlacklistRepository.remove(GROUP, '628333');
    expect(BlacklistRepository.getNumberSet(GROUP).has('628333')).toBe(false);
  });
});

describe('Jadwal autoopen/autoclose', () => {
  let db: DatabaseSync;
  const GROUP = 'sched-test@g.us';

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
    db.exec('DELETE FROM group_settings;');
    db.exec('DELETE FROM groups;');
    GroupRepository.upsertGroup(GROUP, 'Sched Group');
  });

  test('Menyimpan & membaca pengaturan jadwal', () => {
    GroupSettingsRepository.setAutoOpenEnabled(GROUP, true);
    GroupSettingsRepository.setAutoOpenTime(GROUP, '08:00');
    GroupSettingsRepository.setAutoCloseEnabled(GROUP, true);
    GroupSettingsRepository.setAutoCloseTime(GROUP, '22:00');

    const s = GroupSettingsRepository.get(GROUP)!;
    expect(s.autoopen_enabled).toBe(1);
    expect(s.autoopen_time).toBe('08:00');
    expect(s.autoclose_enabled).toBe(1);
    expect(s.autoclose_time).toBe('22:00');
  });

  test('getScheduleGroups hanya mengembalikan grup yang aktif', () => {
    expect(GroupSettingsRepository.getScheduleGroups().length).toBe(0);
    GroupSettingsRepository.setAutoCloseEnabled(GROUP, true);
    GroupSettingsRepository.setAutoCloseTime(GROUP, '23:30');
    const groups = GroupSettingsRepository.getScheduleGroups();
    expect(groups.length).toBe(1);
    expect(groups[0].group_id).toBe(GROUP);
  });

  test('Tandai sudah dijalankan hari ini', () => {
    const today = formatBusinessDate();
    GroupSettingsRepository.markAutoOpenRun(GROUP, today);
    expect(GroupSettingsRepository.get(GROUP)!.autoopen_last).toBe(today);
  });

  test('formatScheduleTime menghasilkan HH:MM', () => {
    expect(formatScheduleTime(new Date())).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('Laporan PDF', () => {
  let db: DatabaseSync;
  const GROUP = 'pdf-test@g.us';

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
    db.exec('DELETE FROM orders;');
    db.exec('DELETE FROM groups;');
    GroupRepository.upsertGroup(GROUP, 'PDF Group');
  });

  test('Menghasilkan PDF valid (2 kolom, banyak order)', async () => {
    for (let i = 0; i < 40; i++) {
      OrderRepository.create({ groupId: GROUP, product: `Produk ${i + 1}`, amount: (i + 1) * 1000 });
    }
    const today = formatBusinessDate();
    const buf = await buildOrderReportPdf(GROUP, today, 'Laporan Order Hari Ini');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('PDF tetap dihasilkan saat belum ada order', async () => {
    const today = formatBusinessDate();
    const buf = await buildOrderReportPdf(GROUP, today, 'Laporan Order Hari Ini');
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
