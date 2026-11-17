// Baileys dikirim sebagai ESM sehingga tidak bisa di-parse Jest.
jest.mock(
  '@whiskeysockets/baileys',
  () => ({
    default: () => ({}),
    makeWASocket: () => ({}),
    useMultiFileAuthState: async () => ({ state: {}, saveCreds: () => {} }),
    fetchLatestBaileysVersion: async () => ({ version: [2, 3000, 0] }),
    downloadMediaMessage: async () => Buffer.from(''),
    normalizeMessageContent: (m: unknown) => m,
    Browsers: { macOS: () => ['Mac OS', 'Chrome', '1.0'] },
    DisconnectReason: {},
  }),
  { virtual: true }
);

import { DatabaseSync } from 'node:sqlite';
import { setDatabaseForTesting } from '../src/database/db';
import { runMigrations } from '../src/database/migrations';
import { GroupRepository } from '../src/database/repositories/groupRepository';
import { RentalRepository } from '../src/database/repositories/rentalRepository';
import { UsageRepository } from '../src/database/repositories/usageRepository';
import { RentalService } from '../src/services/rentalService';
import { PlanService } from '../src/services/planService';
import { buildMenu, getCommand } from '../src/commands/index';
import { handleTrial } from '../src/commands/owner';
import { config } from '../src/config/env';
import {
  TRIAL_AD_MARKER,
  appendTrialAd,
  buildLimitNotice,
  buildPremiumLockedMessage,
} from '../src/templates/trialAds';
import { formatBusinessDate } from '../src/utils/time';
import type { CommandContext } from '../src/types';

const GROUP = '120363000000000001@g.us';
const ORIGINAL_LIMIT = config.trialDailyLimit;
const TEST_LIMIT = 3;

function makeCtx(plan: 'trial' | 'paid', isOwner = false): CommandContext {
  return {
    chatJid: GROUP,
    senderJid: '628123456789@s.whatsapp.net',
    senderNumber: '628123456789',
    isGroup: true,
    isOwner,
    isAdmin: true,
    isBotAdmin: true,
    body: '.menu',
    commandName: 'menu',
    args: [],
    fullArgs: '',
    mentionedJids: [],
    groupName: 'Toko Uji',
    plan,
    trialRemaining: 2,
    trialLimit: TEST_LIMIT,
  } as unknown as CommandContext;
}

describe('Paket trial vs berbayar', () => {
  let db: DatabaseSync;

  beforeAll(() => {
    config.trialDailyLimit = TEST_LIMIT;
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    setDatabaseForTesting(db);
    runMigrations(db);
  });

  afterAll(() => {
    config.trialDailyLimit = ORIGINAL_LIMIT;
    setDatabaseForTesting(null);
    db.close();
  });

  beforeEach(() => {
    db.exec('DELETE FROM daily_usage;');
    db.exec('DELETE FROM rental_history;');
    db.exec('DELETE FROM rentals;');
    db.exec('DELETE FROM groups;');
    GroupRepository.upsertGroup(GROUP, 'Toko Uji');
  });

  function seedRental(plan: 'trial' | 'paid' = 'paid'): void {
    RentalService.createOrExtend(GROUP, 30 * 24 * 60 * 60 * 1000, '628123456789');
    PlanService.setPlan(GROUP, plan);
  }

  test('rental baru default berpaket berbayar', () => {
    RentalService.createOrExtend(GROUP, 30 * 24 * 60 * 60 * 1000, '628123456789');
    expect(RentalRepository.getPlan(GROUP)).toBe('paid');
  });

  test('setPlan mengganti paket dan mereset kuota harian', () => {
    seedRental('trial');
    const date = formatBusinessDate();
    UsageRepository.increment(GROUP, date);
    UsageRepository.increment(GROUP, date);

    PlanService.setPlan(GROUP, 'paid');
    expect(RentalRepository.getPlan(GROUP)).toBe('paid');
    expect(UsageRepository.getCount(GROUP, date)).toBe(0);

    PlanService.setPlan(GROUP, 'trial');
    expect(PlanService.getAccess(GROUP).isTrial).toBe(true);
  });

  test('kuota trial bertambah dan berhenti tepat di batas', () => {
    seedRental('trial');

    for (let i = 0; i < TEST_LIMIT; i++) {
      expect(PlanService.consume(GROUP).allowed).toBe(true);
    }

    const blocked = PlanService.consume(GROUP);
    expect(blocked.allowed).toBe(false);
    expect(blocked.access.limitReached).toBe(true);
    expect(blocked.access.used).toBe(TEST_LIMIT);
  });

  test('paket berbayar tidak pernah kena kuota', () => {
    seedRental('paid');
    for (let i = 0; i < TEST_LIMIT * 5; i++) {
      expect(PlanService.consume(GROUP).allowed).toBe(true);
    }
    expect(PlanService.getAccess(GROUP).isTrial).toBe(false);
  });

  test('notifikasi kuota habis hanya sekali per hari', () => {
    seedRental('trial');
    expect(PlanService.notifyLimitOnce(GROUP)).toBe(true);
    expect(PlanService.notifyLimitOnce(GROUP)).toBe(false);
  });

  test('iklan trial ditempel dan tidak dobel', () => {
    seedRental('trial');
    const access = PlanService.getAccess(GROUP);

    const withAd = appendTrialAd('Halo kak', access);
    expect(withAd).toContain('Halo kak');
    expect(withAd).toContain(TRIAL_AD_MARKER);
    expect(withAd).toContain('wa.me/');

    expect(appendTrialAd(withAd, access)).toBe(withAd);
  });

  test('iklan tidak ditempel pada pesan error/peringatan', () => {
    seedRental('trial');
    const access = PlanService.getAccess(GROUP);
    const errorText = '❌ Grup ini belum terdaftar.';
    expect(appendTrialAd(errorText, access)).toBe(errorText);

    const warning = '⚠️ Pesan Anda dihapus.';
    expect(appendTrialAd(warning, access)).toBe(warning);
  });

  test('pesan upsell memuat harga dan kontak owner', () => {
    seedRental('trial');
    const access = PlanService.getAccess(GROUP);

    expect(buildLimitNotice(access)).toContain('Rp5.000');
    expect(buildLimitNotice(access)).toContain('Rp10.000');
    expect(buildLimitNotice(access)).toContain(config.ownerNumber);

    const locked = buildPremiumLockedMessage('dataordernow', access);
    expect(locked).toContain('dataordernow');
    expect(locked).toContain('Berbayar');
  });

  test('menu trial menandai fitur premium dengan gembok', () => {
    const menu = buildMenu(makeCtx('trial'));
    expect(menu).toContain('🆓 Trial');
    expect(menu).toContain(`🔒 ${config.botPrefix}dataordernow — `);
    expect(menu).not.toContain(`• ${config.botPrefix}dataordernow — `);
    expect(menu).toContain('paket');
  });

  test('menu berbayar tidak menampilkan gembok', () => {
    const menu = buildMenu(makeCtx('paid'));
    expect(menu).toContain('💎 Berbayar');
    expect(menu).not.toContain('🔒');
    expect(menu).toContain(`• ${config.botPrefix}dataordernow — `);
  });

  test('fitur premium terdaftar dengan benar', () => {
    for (const name of ['dataordernow', 'exportlist', 'autoopen', 'setppgc']) {
      expect(getCommand(name)?.premiumOnly).toBe(true);
    }
    // Fitur inti tetap gratis agar trial tetap berguna.
    for (const name of ['list', 'addlist', 'proses', 'welcome', 'antilink']) {
      expect(getCommand(name)?.premiumOnly).toBeFalsy();
    }
  });

  test('.trial memakai durasi default yang bisa diatur owner', async () => {
    const originalDays = config.trialDefaultDays;
    config.trialDefaultDays = 3;
    try {
      const messages: string[] = [];
      await handleTrial(makeCtx('paid', true), async (text) => {
        messages.push(text);
      });

      const rental = RentalRepository.getByGroupId(GROUP)!;
      expect(rental.plan).toBe('trial');
      const days = (new Date(rental.expires_at).getTime() - Date.now()) / 86400000;
      expect(days).toBeGreaterThan(2.9);
      expect(days).toBeLessThan(3.1);
      expect(messages.join('\n')).toContain('3 hari (default)');
    } finally {
      config.trialDefaultDays = originalDays;
    }
  });

  test('.trial menerima durasi bebas dari owner', async () => {
    const ctx = makeCtx('paid', true);
    ctx.args = ['2h'];
    const messages: string[] = [];

    await handleTrial(ctx, async (text) => {
      messages.push(text);
    });

    const rental = RentalRepository.getByGroupId(GROUP)!;
    expect(rental.plan).toBe('trial');
    const days = (new Date(rental.expires_at).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(1.9);
    expect(days).toBeLessThan(2.1);
    expect(messages.join('\n')).toContain('2h');
  });

  test('.trial menolak menurunkan grup yang masih berbayar aktif', async () => {
    seedRental('paid');
    const messages: string[] = [];

    await handleTrial(makeCtx('paid', true), async (text) => {
      messages.push(text);
    });

    expect(RentalRepository.getPlan(GROUP)).toBe('paid');
    expect(messages.join('\n')).toContain('Berbayar');
  });
});
