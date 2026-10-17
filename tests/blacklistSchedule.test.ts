import { DatabaseSync } from 'node:sqlite';
import { setDatabaseForTesting } from '../src/database/db';
import { runMigrations } from '../src/database/migrations';
import { GroupRepository } from '../src/database/repositories/groupRepository';
import { OrderRepository } from '../src/database/repositories/orderRepository';
import { BlacklistRepository } from '../src/database/repositories/blacklistRepository';
import { GroupSettingsRepository } from '../src/database/repositories/settingsRepository';
import { buildOrderReportXlsx } from '../src/services/orderReportService';
import { buildPhoneMap, resolvePhoneNumber, resolvePhoneFromCandidates } from '../src/utils/permissions';
import ExcelJS from 'exceljs';
import {
  formatScheduleTime,
  formatBusinessDate,
  startOfWeekBizDate,
  endOfWeekBizDate,
  startOfMonthBizDate,
  endOfMonthBizDate,
  addDaysToBizDate,
  addMonthsToBizDate,
} from '../src/utils/time';

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

describe('Laporan Excel', () => {
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

  test('Menghasilkan XLSX valid (banyak order)', async () => {
    for (let i = 0; i < 40; i++) {
      OrderRepository.create({ groupId: GROUP, product: `Produk ${i + 1}`, amount: (i + 1) * 1000 });
    }
    const today = formatBusinessDate();
    const buf = await buildOrderReportXlsx(GROUP, 'Laporan Order Hari Ini', today, today);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
    // File .xlsx adalah arsip ZIP -> dimulai dengan "PK".
    expect(buf.subarray(0, 2).toString()).toBe('PK');

    // Baca kembali untuk memastikan struktur & isi benar.
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Detail Order', 'Ringkasan Harian']);
    const detail = wb.worksheets[0];
    // 40 order + 5 baris header/summary + 1 baris TOTAL.
    expect(detail.rowCount).toBe(46);
    const daily = wb.worksheets[1];
    const totalRow = daily.getRow(daily.rowCount);
    expect(totalRow.getCell(1).value).toBe('TOTAL');
    expect(totalRow.getCell(2).value).toBe(40);
    expect(totalRow.getCell(3).value).toBe((40 * 41 * 1000) / 2); // 1..40 ribu
  });

  test('XLSX tetap dihasilkan saat belum ada order', async () => {
    const today = formatBusinessDate();
    const buf = await buildOrderReportXlsx(GROUP, 'Laporan Order Hari Ini', today, today);
    expect(buf.subarray(0, 2).toString()).toBe('PK');
  });

  test('summarizeRange menghitung rentang tanggal', () => {
    OrderRepository.create({ groupId: GROUP, product: 'A', amount: 10000 });
    OrderRepository.create({ groupId: GROUP, product: 'B', amount: 5000 });
    const today = formatBusinessDate();
    const inRange = OrderRepository.summarizeRange(GROUP, today, today);
    expect(inRange.count).toBe(2);
    expect(inRange.totalRevenue).toBe(15000);
    const outRange = OrderRepository.summarizeRange(GROUP, '2000-01-01', '2000-01-02');
    expect(outRange.count).toBe(0);
  });

  test('Pembeli & Admin tampil sebagai nomor asli (LID dipetakan)', async () => {
    OrderRepository.create({
      groupId: GROUP,
      buyerJid: '111222333@lid',
      buyerNumber: '111222333',
      product: 'Tes',
      amount: 1000,
      adminJid: '444555666@lid',
    });
    const today = formatBusinessDate();
    const phoneMap = new Map<string, string>([
      ['111222333', '628111111111'],
      ['444555666', '628222222222'],
    ]);
    const buf = await buildOrderReportXlsx(GROUP, 'Tes', today, today, phoneMap);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
    const row = wb.worksheets[0].getRow(6); // header di baris 5, data mulai baris 6
    expect(String(row.getCell(6).value)).toBe('628111111111');
    expect(String(row.getCell(7).value)).toBe('628222222222');
  });
});

describe('buildPhoneMap (LID -> nomor telepon)', () => {
  test('memetakan LID dan PN ke nomor asli', () => {
    const map = buildPhoneMap({
      participants: [
        { id: '628111@lid', lid: '628111@lid', phoneNumber: '6281234567890' },
        { id: '628999888777@s.whatsapp.net' },
        { id: '999@lid' }, // tanpa nomor -> tidak dipetakan
      ],
    });
    expect(map.get('628111')).toBe('6281234567890');
    expect(map.get('6281234567890')).toBe('6281234567890');
    expect(map.get('628999888777')).toBe('628999888777');
    expect(map.has('999')).toBe(false);
  });

  test('resolvePhoneNumber fallback ke digit asli', () => {
    const map = buildPhoneMap({ participants: [{ id: '555@lid', phoneNumber: '6285' }] });
    expect(resolvePhoneNumber('555@lid', map)).toBe('6285');
    expect(resolvePhoneNumber('777@lid', map)).toBe('777');
    expect(resolvePhoneNumber('123@s.whatsapp.net', map)).toBe('123');
    expect(resolvePhoneNumber(null, map)).toBeNull();
  });

  test('resolvePhoneFromCandidates: prioritas peta, lalu non-LID, abaikan JID grup', () => {
    const map = new Map<string, string>([['111', '628111']]);
    expect(resolvePhoneFromCandidates(['111@lid', '111111111@s.whatsapp.net'], map)).toBe('628111');
    expect(resolvePhoneFromCandidates(['222@lid', '333@s.whatsapp.net'], map)).toBe('333');
    expect(resolvePhoneFromCandidates(['444@lid'], map)).toBe('444');
    expect(resolvePhoneFromCandidates(['1203630@g.us', '555@lid'], map)).toBe('555');
    expect(resolvePhoneFromCandidates([null, undefined], map)).toBeNull();
  });
});

describe('Helper periode (minggu/bulan)', () => {
  test('rentang minggu (Senin–Minggu)', () => {
    // 2026-10-17 adalah hari Sabtu.
    expect(startOfWeekBizDate('2026-10-17')).toBe('2026-10-12');
    expect(endOfWeekBizDate('2026-10-17')).toBe('2026-10-18');
    expect(addDaysToBizDate('2026-10-12', -7)).toBe('2026-10-05');
    expect(addDaysToBizDate('2026-10-12', -1)).toBe('2026-10-11');
  });

  test('rentang bulan', () => {
    expect(startOfMonthBizDate('2026-10-17')).toBe('2026-10-01');
    expect(endOfMonthBizDate('2026-10-17')).toBe('2026-10-31');
    const lastMonth = addMonthsToBizDate(startOfMonthBizDate('2026-10-17'), -1);
    expect(lastMonth).toBe('2026-09-01');
    expect(endOfMonthBizDate(lastMonth)).toBe('2026-09-30');
  });
});
