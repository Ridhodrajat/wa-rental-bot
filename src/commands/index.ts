import { CommandContext, ReplyFn } from '../types';

export type CommandHandler = (
  ctx: CommandContext,
  reply: ReplyFn
) => Promise<void>;

export interface CommandDefinition {
  name: string;
  handler: CommandHandler;
  ownerOnly: boolean;
  adminOnly: boolean; // admin grup atau owner
  groupOnly: boolean;
  description: string;
  category: 'owner' | 'product' | 'transaction' | 'welcome' | 'moderation' | 'settings' | 'utility';
  hidden?: boolean; // Alias tersembunyi dari menu
}

import * as ownerCmd from './owner';
import * as productCmd from './product';
import * as txCmd from './transaction';
import * as welcomeCmd from './welcome';
import * as modCmd from './moderation';
import * as settingsCmd from './groupSettings';
import * as utilCmd from './utility';
import * as catalogCmd from './catalog';
import * as catalogIOCmd from './catalogIO';
import * as advModCmd from './advancedMod';
import * as scheduleCmd from './storeSchedule';

/**
 * Registry seluruh command.
 * Parser memprioritaskan command terdaftar.
 */

export const commands: Record<string, CommandDefinition> = {};

function register(def: CommandDefinition): void {
  commands[def.name.toLowerCase()] = def;
}

// ============ Owner & Info ============
register({ name: 'menu', handler: async (ctx, reply) => { await reply(buildMenu(ctx)); }, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Menampilkan menu bot', category: 'owner' });
register({ name: 'cekmenu', handler: async (ctx, reply) => { await reply(buildMenu(ctx)); }, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Menampilkan menu bot (alias)', category: 'owner', hidden: true });
register({ name: 'owner', handler: ownerCmd.handleOwnerInfo, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Menampilkan kontak owner', category: 'owner' });
register({ name: 'addsewa', handler: ownerCmd.handleAddSewa, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'Tambah/perpanjang sewa (owner)', category: 'owner' });
register({ name: 'delsewa', handler: ownerCmd.handleDelSewa, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'Nonaktifkan sewa (owner)', category: 'owner' });
register({ name: 'ceksewa', handler: ownerCmd.handleCekSewa, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Cek status sewa grup', category: 'owner' });
register({ name: 'listsewa', handler: ownerCmd.handleListSewa, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'List semua rental (owner)', category: 'owner' });

// ============ Anti Private Chat (Owner) ============
register({ name: 'antiprivate', handler: ownerCmd.handleAntiPrivate, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'Aktifkan/matikan anti private chat', category: 'owner' });
register({ name: 'setprivatelimit', handler: ownerCmd.handleSetPrivateLimit, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'Atur batas pesan private', category: 'owner' });
register({ name: 'autoblock', handler: ownerCmd.handleAutoBlock, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'Auto-block internal on/off', category: 'owner' });
register({ name: 'cekantiprivate', handler: ownerCmd.handleCekAntiPrivate, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'Lihat status anti private chat', category: 'owner' });
register({ name: 'setowner', handler: ownerCmd.handleSetOwner, ownerOnly: true, adminOnly: false, groupOnly: false, description: 'Simpan nomor owner override', category: 'owner' });

// ============ Product ============
register({ name: 'list', handler: productCmd.handleList, ownerOnly: false, adminOnly: false, groupOnly: true, description: 'Lihat katalog produk', category: 'product' });
register({ name: 'addlist', handler: productCmd.handleAddList, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Tambah produk', category: 'product' });
register({ name: 'updatelist', handler: productCmd.handleUpdateList, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah info produk', category: 'product' });
register({ name: 'renamelist', handler: productCmd.handleRenameList, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ganti nama produk', category: 'product' });
register({ name: 'dellist', handler: productCmd.handleDelList, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Hapus produk', category: 'product' });

// ============ Transaction ============
register({ name: 'setproses', handler: txCmd.handleSetProses, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Pilih template proses', category: 'transaction' });
register({ name: 'changeproses', handler: txCmd.handleChangeProses, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah template proses', category: 'transaction' });
register({ name: 'delsetproses', handler: txCmd.handleDelSetProses, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Reset template proses', category: 'transaction' });
register({ name: 'setdone', handler: txCmd.handleSetDone, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Pilih template selesai', category: 'transaction' });
register({ name: 'changedone', handler: txCmd.handleChangeDone, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah template selesai', category: 'transaction' });
register({ name: 'delsetdone', handler: txCmd.handleDelSetDone, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Reset template selesai', category: 'transaction' });
register({ name: 'proses', handler: txCmd.handleProses, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Kelola/kirim template proses', category: 'transaction' });
register({ name: 'done', handler: txCmd.handleDone, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Kelola/kirim template selesai', category: 'transaction' });
register({ name: 'setopen', handler: txCmd.handleSetOpen, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Pilih template pesan open', category: 'transaction' });
register({ name: 'setclose', handler: txCmd.handleSetClose, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Pilih template pesan close', category: 'transaction' });

// ============ Catalog Template ============
register({ name: 'setlisttemplate', handler: catalogCmd.handleSetListTemplate, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Pilih template katalog', category: 'product' });
register({ name: 'previewlist', handler: catalogCmd.handlePreviewList, ownerOnly: false, adminOnly: false, groupOnly: true, description: 'Preview katalog', category: 'product' });
register({ name: 'setlistheader', handler: catalogCmd.handleSetListHeader, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Atur header katalog manual', category: 'product' });
register({ name: 'setlistfooter', handler: catalogCmd.handleSetListFooter, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Atur footer katalog manual', category: 'product' });
register({ name: 'resetlisttemplate', handler: catalogCmd.handleResetListTemplate, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Reset template katalog', category: 'product' });

// ============ Catalog Import / Export ============
register({ name: 'exportlist', handler: catalogIOCmd.handleExportList, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Export katalog ke Excel/Teks', category: 'product' });
register({ name: 'importlist', handler: catalogIOCmd.handleImportList, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Import katalog dari file', category: 'product' });

// ============ Welcome / Goodbye ============
register({ name: 'welcome', handler: welcomeCmd.handleWelcome, ownerOnly: false, adminOnly: false, groupOnly: true, description: 'Kelola welcome (on/off/preview)', category: 'welcome' });
register({ name: 'goodbye', handler: welcomeCmd.handleGoodbye, ownerOnly: false, adminOnly: false, groupOnly: true, description: 'Kelola goodbye (on/off/preview)', category: 'welcome' });
register({ name: 'setwelcome', handler: welcomeCmd.handleSetWelcome, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Pilih/atur template welcome', category: 'welcome' });
register({ name: 'changewelcome', handler: welcomeCmd.handleChangeWelcome, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah template welcome', category: 'welcome' });
register({ name: 'delsetwelcome', handler: welcomeCmd.handleDelSetWelcome, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Reset template welcome', category: 'welcome' });
register({ name: 'setleft', handler: welcomeCmd.handleSetLeft, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Pilih/atur template goodbye', category: 'welcome' });
register({ name: 'changeleft', handler: welcomeCmd.handleChangeLeft, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah template goodbye', category: 'welcome' });
register({ name: 'delsetleft', handler: welcomeCmd.handleDelSetLeft, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Reset template goodbye', category: 'welcome' });

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

// ============ Advanced Moderation ============
register({ name: 'deletemsg', handler: advModCmd.handleDeleteMsg, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Hapus pesan (reply)', category: 'moderation' });
register({ name: 'revokelinkgc', handler: advModCmd.handleRevokeLinkGc, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Reset tautan grup', category: 'moderation' });
register({ name: 'addadmin', handler: advModCmd.handleAddAdmin, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Jadikan admin', category: 'moderation' });
register({ name: 'addblacklist', handler: advModCmd.handleAddBlacklist, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Tambah ke blacklist', category: 'moderation' });
register({ name: 'editblacklist', handler: advModCmd.handleEditBlacklist, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Edit blacklist', category: 'moderation' });
register({ name: 'deleteblacklist', handler: advModCmd.handleDeleteBlacklist, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Hapus dari blacklist', category: 'moderation' });
register({ name: 'viewblacklist', handler: advModCmd.handleViewBlacklist, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Lihat blacklist', category: 'moderation' });
register({ name: 'blacklisthelp', handler: advModCmd.handleBlacklistHelp, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Bantuan blacklist', category: 'moderation' });

// ============ Store Schedule & Data ============
register({ name: 'autoopen', handler: scheduleCmd.handleAutoOpen, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Buka otomatis on/off', category: 'settings' });
register({ name: 'autoopenset', handler: scheduleCmd.handleAutoOpenSet, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Atur jam buka otomatis', category: 'settings' });
register({ name: 'autoclose', handler: scheduleCmd.handleAutoClose, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Tutup otomatis on/off', category: 'settings' });
register({ name: 'autocloseset', handler: scheduleCmd.handleAutoCloseSet, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Atur jam tutup otomatis', category: 'settings' });
register({ name: 'dataorder', handler: scheduleCmd.handleDataOrder, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Laporan order otomatis on/off', category: 'settings' });
register({ name: 'dataordernow', handler: scheduleCmd.handleDataOrderNow, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Laporan hari ini (PDF)', category: 'settings' });
register({ name: 'dataorderlast', handler: scheduleCmd.handleDataOrderLast, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Laporan kemarin (PDF)', category: 'settings' });
register({ name: 'dataorderhelp', handler: scheduleCmd.handleDataOrderHelp, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Bantuan data order', category: 'settings' });

// ============ Group Settings ============
register({ name: 'setppgc', handler: settingsCmd.handleSetPpgc, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah foto profil grup', category: 'settings' });
register({ name: 'setnamegc', handler: settingsCmd.handleSetNamegc, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah nama grup', category: 'settings' });
register({ name: 'setdesgc', handler: settingsCmd.handleSetDesgc, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Ubah deskripsi grup', category: 'settings' });
register({ name: 'setbot', handler: settingsCmd.handleSetBot, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Simpan konfigurasi bot', category: 'settings' });
// Hapus updatesetbot & delsetbot dari registry

// ============ Utility ============
register({ name: 'afk', handler: utilCmd.handleAfk, ownerOnly: false, adminOnly: false, groupOnly: true, description: 'Aktifkan status AFK', category: 'utility' });
register({ name: 'status', handler: utilCmd.handleStatus, ownerOnly: false, adminOnly: false, groupOnly: false, description: 'Cek status teknis bot', category: 'utility' });
register({ name: 'p', handler: txCmd.handleProses, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Proses pesanan (alias)', category: 'transaction', hidden: true });
register({ name: 'd', handler: txCmd.handleDone, ownerOnly: false, adminOnly: true, groupOnly: true, description: 'Selesaikan pesanan (alias)', category: 'transaction', hidden: true });
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
  const p = config_prefix();

  // Kelompokkan command berdasarkan kategori & akses
  const groups: Record<string, string[]> = {
    owner: [],
    product: [],
    transaction: [],
    welcome: [],
    moderation: [],
    settings: [],
    utility: [],
  };

  for (const cmd of Object.values(commands)) {
    if (cmd.hidden) continue;
    // Sembunyikan command yang tidak bisa diakses pengguna
    if (cmd.ownerOnly && !isOwnerUser) continue;
    if (cmd.adminOnly && !isAdminUser) continue;
    if (cmd.groupOnly && !ctx.isGroup && cmd.category !== 'owner') continue;

    groups[cmd.category]?.push(`${p}${cmd.name} — ${cmd.description}`);
  }

  const titleMap: Record<string, string> = {
    owner: '👑 Owner & Info',
    product: '📦 Katalog Produk',
    transaction: '🔄 Transaksi',
    welcome: '👋 Welcome / Goodbye',
    moderation: '🛡️ Moderasi Grup',
    settings: '⚙️ Pengaturan Bot',
    utility: '🔧 Utilitas',
  };

  const roleLabel = isOwnerUser ? 'Owner' : isAdminUser ? 'Admin Grup' : 'Anggota';
  let text = `╭── ꒰ 🤖 ꒱ ──\n`;
  text += `│ *MENU BOT*\n`;
  text += `│ Role: *${roleLabel}*\n`;
  text += `│ Prefix: \`${p}\`\n`;
  text += `╰───────────────\n`;

  for (const [cat, items] of Object.entries(groups)) {
    if (!items || items.length === 0) continue;
    text += `\n*${titleMap[cat] ?? cat.toUpperCase()}*\n`;
    text += items.map((i) => `• ${i}`).join('\n') + '\n';
  }

  text += `\n╭── ꒰ 💡 ꒱ ──\n`;
  text += `│ Ketik nama produk untuk melihat detail\n`;
  text += `│ Ketik \`${p}list\` untuk melihat katalog\n`;
  text += `╰───────────────`;

  return text;
}

function config_prefix(): string {
  const { config } = require('../config/env');
  return config.botPrefix;
}
