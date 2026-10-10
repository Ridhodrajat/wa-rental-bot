import { CommandContext } from '../types';

export type CommandHandler = (
  ctx: CommandContext,
  reply: (text: string) => Promise<any>
) => Promise<void>;

export interface CommandDefinition {
  name: string;
  handler: CommandHandler;
  ownerOnly: boolean;
  adminOnly: boolean; // admin grup atau owner
  groupOnly: boolean;
  description: string;
  category: 'owner' | 'product' | 'transaction' | 'welcome' | 'moderation' | 'settings' | 'utility';
}

import * as ownerCmd from './owner';
import * as productCmd from './product';
import * as txCmd from './transaction';
import * as welcomeCmd from './welcome';
import * as modCmd from './moderation';
import * as settingsCmd from './groupSettings';
import * as utilCmd from './utility';

/**
 * Registry seluruh command.
 * Parser memprioritaskan command terdaftar.
 */

export const commands: Record<string, CommandDefinition> = {};

function register(def: CommandDefinition): void {
  commands[def.name.toLowerCase()] = def;
}

// ============ Owner & Info ============
register({ name: 'cekmenu', handler: async (ctx, reply) => { await reply(buildMenu(ctx)); }, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Menampilkan menu bot', category: 'owner' });
register({ name: 'owner', handler: ownerCmd.handleOwnerInfo, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Menampilkan kontak owner', category: 'owner' });
register({ name: 'addsewa', handler: ownerCmd.handleAddSewa, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'Tambah/perpanjang sewa (owner)', category: 'owner' });
register({ name: 'delsewa', handler: ownerCmd.handleDelSewa, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'Nonaktifkan sewa (owner)', category: 'owner' });
register({ name: 'ceksewa', handler: ownerCmd.handleCekSewa, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Cek status sewa grup', category: 'owner' });
register({ name: 'listsewa', handler: ownerCmd.handleListSewa, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'List semua rental (owner)', category: 'owner' });
register({ name: 'pay', handler: ownerCmd.handlePay, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Metode pembayaran', category: 'owner' });
register({ name: 'setpay', handler: ownerCmd.handleSetPay, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'Atur metode pembayaran (owner)', category: 'owner' });

// ============ Product ============
register({ name: 'list', handler: productCmd.handleList, ownerOnly: false, adminOnly: false, groupOnly: true, description: 'Lihat katalog produk', category: 'product' });
register({ name: 'addlist', handler: productCmd.handleAddList, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Tambah produk', category: 'product' });
register({ name: 'updatelist', handler: productCmd.handleUpdateList, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah info produk', category: 'product' });
register({ name: 'renamelist', handler: productCmd.handleRenameList, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ganti nama produk', category: 'product' });
register({ name: 'dellist', handler: productCmd.handleDelList, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Hapus produk', category: 'product' });

// ============ Transaction ============
register({ name: 'setproses', handler: txCmd.handleSetProses, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Buat template proses', category: 'transaction' });
register({ name: 'changeproses', handler: txCmd.handleChangeProses, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah template proses', category: 'transaction' });
register({ name: 'delsetproses', handler: txCmd.handleDelSetProses, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Hapus template proses', category: 'transaction' });
register({ name: 'setdone', handler: txCmd.handleSetDone, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Buat template selesai', category: 'transaction' });
register({ name: 'changedone', handler: txCmd.handleChangeDone, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah template selesai', category: 'transaction' });
register({ name: 'delsetdone', handler: txCmd.handleDelSetDone, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Hapus template selesai', category: 'transaction' });
register({ name: 'proses', handler: txCmd.handleProses, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Kirim template proses', category: 'transaction' });
register({ name: 'done', handler: txCmd.handleDone, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Kirim template selesai', category: 'transaction' });

// ============ Welcome / Goodbye ============
register({ name: 'welcome', handler: welcomeCmd.handleWelcome, ownerOnly: false, adminOnly: false, groupOnly: true, description: 'Lihat template welcome', category: 'welcome' });
register({ name: 'goodbye', handler: welcomeCmd.handleGoodbye, ownerOnly: false, adminOnly: false, groupOnly: true, description: 'Lihat template goodbye', category: 'welcome' });
register({ name: 'setwelcome', handler: welcomeCmd.handleSetWelcome, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Atur template welcome', category: 'welcome' });
register({ name: 'changewelcome', handler: welcomeCmd.handleChangeWelcome, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah template welcome', category: 'welcome' });
register({ name: 'delsetwelcome', handler: welcomeCmd.handleDelSetWelcome, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Hapus template welcome', category: 'welcome' });
register({ name: 'setleft', handler: welcomeCmd.handleSetLeft, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Atur template goodbye', category: 'welcome' });
register({ name: 'changeleft', handler: welcomeCmd.handleChangeLeft, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah template goodbye', category: 'welcome' });
register({ name: 'delsetleft', handler: welcomeCmd.handleDelSetLeft, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Hapus template goodbye', category: 'welcome' });

// ============ Moderation ============
register({ name: 'antiwame', handler: modCmd.handleAntiwame, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Antiwame mode 1', category: 'moderation' });
register({ name: 'antiwame2', handler: modCmd.handleAntiwame2, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Antiwame mode 2', category: 'moderation' });
register({ name: 'antilink', handler: modCmd.handleAntilink, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Antilink mode 1', category: 'moderation' });
register({ name: 'antilink2', handler: modCmd.handleAntilink2, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Antilink mode 2', category: 'moderation' });
register({ name: 'open', handler: modCmd.handleOpen, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Buka grup', category: 'moderation' });
register({ name: 'close', handler: modCmd.handleClose, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Tutup grup', category: 'moderation' });
register({ name: 'hidetag', handler: modCmd.handleHidetag, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Tag semua anggota', category: 'moderation' });
register({ name: 'add', handler: modCmd.handleAdd, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Tambah anggota', category: 'moderation' });
register({ name: 'kick', handler: modCmd.handleKick, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Keluarkan anggota', category: 'moderation' });
register({ name: 'promote', handler: modCmd.handlePromote, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Jadikan admin', category: 'moderation' });
register({ name: 'demote', handler: modCmd.handleDemote, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Turunkan admin', category: 'moderation' });
register({ name: 'linkgc', handler: modCmd.handleLinkGc, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ambil tautan grup', category: 'moderation' });
register({ name: 'resetlinkgc', handler: modCmd.handleResetLinkGc, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Reset tautan grup', category: 'moderation' });

// ============ Group Settings ============
register({ name: 'setppgc', handler: settingsCmd.handleSetPpgc, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah foto profil grup', category: 'settings' });
register({ name: 'setnamegc', handler: settingsCmd.handleSetNamegc, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah nama grup', category: 'settings' });
register({ name: 'setdesgc', handler: settingsCmd.handleSetDesgc, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah deskripsi grup', category: 'settings' });
register({ name: 'setbot', handler: settingsCmd.handleSetBot, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Simpan konfigurasi bot', category: 'settings' });
register({ name: 'updatesetbot', handler: settingsCmd.handleUpdateSetBot, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah konfigurasi bot', category: 'settings' });
register({ name: 'delsetbot', handler: settingsCmd.handleDelSetBot, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Hapus konfigurasi bot', category: 'settings' });

// ============ Utility ============
register({ name: 'afk', handler: utilCmd.handleAfk, ownerOnly: false, adminOnly: false, groupOnly: true, description: 'Aktifkan status AFK', category: 'utility' });
register({ name: 'jeda', handler: utilCmd.handleJeda, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Atur jeda operasi', category: 'utility' });
register({ name: 'tambah', handler: utilCmd.handleTambah, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Kalkulator tambah', category: 'utility' });
register({ name: 'kurang', handler: utilCmd.handleKurang, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Kalkulator kurang', category: 'utility' });
register({ name: 'kali', handler: utilCmd.handleKali, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Kalkulator kali', category: 'utility' });
register({ name: 'bagi', handler: utilCmd.handleBagi, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Kalkulator bagi', category: 'utility' });
register({ name: 'bot', handler: utilCmd.handleBotInfo, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Info bot', category: 'utility' });

export function getCommandNames(): Set<string> {
  return new Set(Object.keys(commands));
}

export function getCommand(name: string): CommandDefinition | undefined {
  return commands[name.toLowerCase()];
}

/**
 * Menu yang disesuaikan berdasarkan hak akses pengguna.
 */
export function buildMenu(ctx: CommandContext): string {
  const isOwnerUser = ctx.isOwner;
  const isAdminUser = ctx.isAdmin || ctx.isOwner;

  const categories: Record<string, string[]> = {};

  for (const cmd of Object.values(commands)) {
    if (cmd.ownerOnly && !isOwnerUser) continue;
    if (cmd.adminOnly && !isAdminUser) continue;

    if (!categories[cmd.category]) categories[cmd.category] = [];
    categories[cmd.category].push(`${config_prefix()}${cmd.name} - ${cmd.description}`);
  }

  const titleMap: Record<string, string> = {
    owner: '👑 OWNER & INFO',
    product: '📦 KATALOG PRODUK',
    transaction: '🔄 TRANSAKSI',
    welcome: '👋 WELCOME/GOODBYE',
    moderation: '🛡️ MODERASI',
    settings: '⚙️ PENGATURAN',
    utility: '🔧 UTILITAS',
  };

  let text = `*📋 MENU BOT*\n`;
  text += `Role: ${isOwnerUser ? 'Owner' : isAdminUser ? 'Admin Grup' : 'Anggota'}\n\n`;

  for (const [cat, items] of Object.entries(categories)) {
    text += `*${titleMap[cat] ?? cat.toUpperCase()}*\n`;
    text += items.join('\n') + '\n\n';
  }

  return text.trim();
}

function config_prefix(): string {
  const { config } = require('../config/env');
  return config.botPrefix;
}
