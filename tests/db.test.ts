import { DatabaseSync } from 'node:sqlite';
import { setDatabaseForTesting } from '../src/database/db';
import { runMigrations } from '../src/database/migrations';
import { GroupRepository } from '../src/database/repositories/groupRepository';
import { ProductRepository } from '../src/database/repositories/productRepository';
import { RentalRepository } from '../src/database/repositories/rentalRepository';
import { RentalService } from '../src/services/rentalService';
import { addDays } from '../src/utils/time';

describe('Database Integration Tests', () => {
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
  });

  test('Grup baru berhasil dibuat', () => {
    const group = GroupRepository.upsertGroup('123@g.us', 'Test Group');
    expect(group.group_id).toBe('123@g.us');
    expect(group.group_name).toBe('Test Group');
  });

  test('Isolasi produk antar grup', () => {
    GroupRepository.upsertGroup('111@g.us', 'Group 1');
    GroupRepository.upsertGroup('222@g.us', 'Group 2');

    ProductRepository.create('111@g.us', 'YouTube Premium', '1 Bulan');
    ProductRepository.create('222@g.us', 'Netflix Premium', '1 Bulan');

    const p1 = ProductRepository.getByGroupId('111@g.us');
    const p2 = ProductRepository.getByGroupId('222@g.us');

    expect(p1.length).toBe(1);
    expect(p1[0].name).toBe('youtube premium');

    expect(p2.length).toBe(1);
    expect(p2[0].name).toBe('netflix premium');

    expect(ProductRepository.findByName('111@g.us', 'netflix premium')).toBeNull();
  });

  test('Rental lifecycle: addsewa, expire, grace period, auto delete', () => {
    const groupId = 'test@g.us';
    GroupRepository.upsertGroup(groupId, 'Lifecycle Group');

    const DAY = 24 * 60 * 60 * 1000;

    // Add sewa 30 hari (dalam ms)
    const res = RentalService.createOrExtend(groupId, 30 * DAY, '628123456789');
    expect(res.action).toBe('CREATE');
    expect(res.rental.status).toBe('ACTIVE');

    // Perpanjang 10 hari lagi
    const res2 = RentalService.createOrExtend(groupId, 10 * DAY, '628123456789');
    expect(res2.action).toBe('EXTEND');

    // Simulasi expiry
    const past = addDays(new Date(), -1);
    RentalRepository.update({
      group_id: groupId,
      status: 'ACTIVE',
      expires_at: past.toISOString(),
      grace_until: addDays(past, 30).toISOString(),
    });

    RentalService.processExpired();
    const expiredRental = RentalRepository.getByGroupId(groupId);
    expect(expiredRental?.status).toBe('EXPIRED_GRACE');

    // Simulasi melewati batas grace period 30 hari -> data dihapus
    const pastGrace = addDays(new Date(), -31);
    RentalRepository.update({
      group_id: groupId,
      status: 'EXPIRED_GRACE',
      expires_at: addDays(pastGrace, -30).toISOString(),
      grace_until: pastGrace.toISOString(),
    });

    RentalService.processExpired();
    expect(RentalRepository.getByGroupId(groupId)).toBeNull();
    expect(GroupRepository.getGroupById(groupId)).toBeNull();
  });
});
