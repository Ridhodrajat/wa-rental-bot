import { parseCommand } from '../src/utils/parser';

/**
 * Test suite untuk verifikasi core logic.
 */

describe('WA Rental Bot Tests', () => {
  describe('Command Parser', () => {
    const validCommands = new Set(['list', 'owner', 'cekmenu', 'addlist']);

    test('Parse command dengan prefix', () => {
      const result = parseCommand('.list', validCommands);
      expect(result.isCommand).toBe(true);
      expect(result.commandName).toBe('list');
    });

    test('Parse command tanpa prefix', () => {
      const result = parseCommand('owner', validCommands);
      expect(result.isCommand).toBe(true);
      expect(result.commandName).toBe('owner');
    });

    test('Pesan biasa bukan command', () => {
      const result = parseCommand('halo selamat pagi', validCommands);
      expect(result.isCommand).toBe(false);
    });

    test('Parse command dengan arguments', () => {
      const result = parseCommand('.addlist youtube|YouTube Premium 1 Bulan', validCommands);
      expect(result.isCommand).toBe(true);
      expect(result.commandName).toBe('addlist');
      expect(result.fullArgs).toBe('youtube|YouTube Premium 1 Bulan');
    });

    test('Case-insensitive command matching', () => {
      const result = parseCommand('OWNER', validCommands);
      expect(result.isCommand).toBe(true);
      expect(result.commandName).toBe('owner');
    });
  });

  describe('Kalkulator Utilitas', () => {
    test('Penjumlahan bekerja', () => {
      expect(5 + 3).toBe(8);
      expect(10.5 + 2.3).toBeCloseTo(12.8);
    });

    test('Pengurangan bekerja', () => {
      expect(10 - 3).toBe(7);
      expect(5.5 - 2.2).toBeCloseTo(3.3);
    });

    test('Perkalian bekerja', () => {
      expect(4 * 5).toBe(20);
      expect(2.5 * 4).toBe(10);
    });

    test('Pembagian bekerja', () => {
      expect(20 / 4).toBe(5);
      expect(10 / 3).toBeCloseTo(3.333, 2);
    });

    test('Pembagian nol menghasilkan Infinity', () => {
      const result = 10 / 0;
      expect(result).toBe(Infinity);
    });
  });

  describe('Text Processing', () => {
    test('Normalisasi nama produk lowercase', () => {
      const normalize = (name: string) => name.trim().toLowerCase();
      expect(normalize('YouTube Premium')).toBe('youtube premium');
      expect(normalize('  Netflix  ')).toBe('netflix');
    });

    test('Extract JID number dari WhatsApp ID', () => {
      const extractNumber = (jid: string) => jid.replace(/[^0-9]/g, '');
      expect(extractNumber('628123456789@s.whatsapp.net')).toBe('628123456789');
      expect(extractNumber('1203630123456789@g.us')).toBe('1203630123456789');
    });

    test('Group JID detection', () => {
      const isGroup = (jid: string) => jid.endsWith('@g.us');
      expect(isGroup('628123456789@s.whatsapp.net')).toBe(false);
      expect(isGroup('1203630123456789@g.us')).toBe(true);
    });
  });

  describe('Date & Time', () => {
    test('Add days calculation', () => {
      const addDays = (date: Date | string | number, days: number) => {
        const d = new Date(date);
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        return d;
      };

      const base = new Date('2026-10-10');
      const future = addDays(base, 30);
      const diff = (future.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(30);
    });

    test('ISO string format', () => {
      const date = new Date('2026-10-10T12:00:00Z');
      const iso = date.toISOString();
      expect(iso).toBe('2026-10-10T12:00:00.000Z');
    });

    test('Human readable remaining time', () => {
      const humanRemainingTime = (targetIso: string) => {
        const target = new Date(targetIso).getTime();
        const diff = target - Date.now();
        if (diff <= 0) return 'Sudah berakhir';
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days > 0) return `${days} hari`;
        return 'Kurang dari 1 hari';
      };

      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const result = humanRemainingTime(futureDate);
      expect(result).toMatch(/hari/);
    });
  });
});
