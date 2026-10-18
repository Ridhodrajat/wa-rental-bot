// Baileys dikirim sebagai ESM sehingga tidak bisa di-parse Jest.
// Modul ini tidak dipakai oleh menu/registry, cukup distub agar impor berhasil.
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

import { buildMenu, getCommand } from '../src/commands/index';
import { config } from '../src/config/env';
import type { CommandContext } from '../src/types';

const P = config.botPrefix;

function makeCtx(role: 'owner' | 'admin' | 'member'): CommandContext {
  return {
    chatJid: 'menu-test@g.us',
    senderJid: '628123456789@s.whatsapp.net',
    senderNumber: '628123456789',
    isGroup: true,
    isOwner: role === 'owner',
    isAdmin: role === 'admin',
    isBotAdmin: true,
    body: `${P}menu`,
    commandName: 'menu',
    args: [],
    fullArgs: '',
    mentionedJids: [],
    groupName: 'Menu Test',
  } as unknown as CommandContext;
}

/** Perintah yang tidak boleh muncul di menu anggota. */
const KHUSUS_ADMIN = [
  'welcome',
  'goodbye',
  'setwelcome',
  'blacklisthelp',
  'dataorderhelp',
  'addlist',
  'kick',
  'antilink',
  'dataordernow',
  'setppgc',
];

/** Perintah yang memang boleh dipakai anggota. */
const UNTUK_ANGGOTA = ['menu', 'list', 'previewlist', 'afk', 'status', 'bot', 'ceksewa', 'owner'];

describe('Menu disesuaikan dengan hak akses', () => {
  it('anggota tidak melihat perintah khusus admin/owner', () => {
    const menu = buildMenu(makeCtx('member'));
    for (const name of KHUSUS_ADMIN) {
      expect(menu).not.toContain(`${P}${name} — `);
    }
  });

  it('anggota tetap melihat perintah yang bisa dipakainya', () => {
    const menu = buildMenu(makeCtx('member'));
    for (const name of UNTUK_ANGGOTA) {
      expect(menu).toContain(`${P}${name} — `);
    }
  });

  it('anggota tidak melihat judul kategori yang kosong', () => {
    const menu = buildMenu(makeCtx('member'));
    expect(menu).not.toContain('Welcome / Goodbye');
    expect(menu).not.toContain('Moderasi Grup');
    expect(menu).not.toContain('Pengaturan Bot');
  });

  it('admin grup melihat perintah pengelolaan', () => {
    const menu = buildMenu(makeCtx('admin'));
    expect(menu).toContain(`${P}welcome — `);
    expect(menu).toContain(`${P}addlist — `);
    expect(menu).toContain('Admin Grup');
  });

  it('owner melihat perintah khusus owner', () => {
    const menu = buildMenu(makeCtx('owner'));
    expect(menu).toContain(`${P}addsewa — `);
    expect(menu).toContain(`${P}listsewa — `);
  });
});

describe('Label hak akses cocok dengan perilaku', () => {
  it('perintah pengelolaan ditandai adminOnly', () => {
    for (const name of ['welcome', 'goodbye', 'blacklisthelp', 'dataorderhelp']) {
      expect(getCommand(name)?.adminOnly).toBe(true);
    }
  });
});
