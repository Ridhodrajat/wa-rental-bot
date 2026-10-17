import { DatabaseSync } from 'node:sqlite';
import { setDatabaseForTesting } from '../src/database/db';
import { runMigrations } from '../src/database/migrations';
import { GroupRepository } from '../src/database/repositories/groupRepository';
import { OrderRepository } from '../src/database/repositories/orderRepository';
import { parseAmountToNumber, extractAmountFromText, formatRupiah } from '../src/utils/amount';
import { formatBusinessDate } from '../src/utils/time';

describe('Parsing nominal rupiah', () => {
  test('Format umum', () => {
    expect(parseAmountToNumber('50000')).toBe(50000);
    expect(parseAmountToNumber('50.000')).toBe(50000);
    expect(parseAmountToNumber('Rp50.000')).toBe(50000);
    expect(parseAmountToNumber('Rp 50.000')).toBe(50000);
    expect(parseAmountToNumber('50k')).toBe(50000);
    expect(parseAmountToNumber('50rb')).toBe(50000);
    expect(parseAmountToNumber('50ribu')).toBe(50000);
    expect(parseAmountToNumber('1jt')).toBe(1000000);
    expect(parseAmountToNumber('1,5jt')).toBe(1500000);
    expect(parseAmountToNumber('2 juta')).toBe(2000000);
  });

  test('Nilai tidak valid mengembalikan null', () => {
    expect(parseAmountToNumber('')).toBeNull();
    expect(parseAmountToNumber(null)).toBeNull();
    expect(parseAmountToNumber('abc')).toBeNull();
    expect(parseAmountToNumber('0')).toBeNull();
  });

  test('Ekstraksi dari teks OCR bukti transfer', () => {
    expect(extractAmountFromText('Transfer Berhasil\nTotal: Rp50.000\nBerhasil')).toBe(50000);
    expect(extractAmountFromText('IDR 1.500.000')).toBe(1500000);
    expect(extractAmountFromText('tidak ada angka besar')).toBeNull();
  });

  test('Format tampilan rupiah', () => {
    expect(formatRupiah(50000)).toBe('Rp50.000');
    expect(formatRupiah(0)).toBe('Rp0');
  });
});

describe('OrderRepository', () => {
  let db: DatabaseSync;
  const GROUP = 'order-test@g.us';

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
    GroupRepository.upsertGroup(GROUP, 'Order Test Group');
  });

  test('Mencatat order dan menghitung ringkasan harian', () => {
    OrderRepository.create({ groupId: GROUP, product: 'Netflix', amount: 50000, adminJid: '6281' });
    OrderRepository.create({ groupId: GROUP, product: 'Spotify', amount: 25000, source: 'ocr', adminJid: '6281' });

    const today = formatBusinessDate(new Date());
    const { count, totalRevenue, orders } = OrderRepository.summarize(GROUP, today);

    expect(count).toBe(2);
    expect(totalRevenue).toBe(75000);
    expect(orders.length).toBe(2);
    expect(orders[1].source).toBe('ocr');
  });

  test('Koreksi nominal order terakhir', () => {
    OrderRepository.create({ groupId: GROUP, product: 'Disney', amount: 0, adminJid: '6281' });
    const last = OrderRepository.getLastForGroup(GROUP);
    expect(last).not.toBeNull();

    OrderRepository.updateAmount(last!.id, 40000);
    expect(OrderRepository.getById(last!.id)?.amount).toBe(40000);
  });

  test('Data terisolasi antar grup', () => {
    const other = 'order-other@g.us';
    GroupRepository.upsertGroup(other, 'Other');
    OrderRepository.create({ groupId: GROUP, amount: 10000 });
    OrderRepository.create({ groupId: other, amount: 99999 });

    const today = formatBusinessDate(new Date());
    expect(OrderRepository.summarize(GROUP, today).totalRevenue).toBe(10000);
    expect(OrderRepository.summarize(other, today).totalRevenue).toBe(99999);
  });
});
