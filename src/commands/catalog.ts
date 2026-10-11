import { CommandContext, ReplyFn } from '../types';
import { GroupSettingsRepository } from '../database/repositories/settingsRepository';
import { ProductRepository } from '../database/repositories/productRepository';
import { CATALOG_TEMPLATES, getCatalogTemplate } from '../templates/catalogTemplates';
import { renderCatalog } from '../utils/catalogRenderer';
import { getGroupMetadata } from '../connection/whatsapp';

/**
 * Commands pengaturan template katalog (.list) per grup.
 */

async function requireAdmin(ctx: CommandContext, reply: ReplyFn): Promise<boolean> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return false;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return false;
  }
  return true;
}

async function resolveGroupName(ctx: CommandContext): Promise<string> {
  if (ctx.groupName) return ctx.groupName;
  try {
    const meta = await getGroupMetadata(ctx.chatJid);
    return meta?.subject ?? 'Grup';
  } catch {
    return 'Grup';
  }
}

// ============ Pilih / lihat template ============

export async function handleSetListTemplate(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const arg = ctx.args[0];

  // Tanpa argumen: tampilkan daftar pilihan
  if (!arg) {
    let text = `🎨 *Pilih Template Katalog*\n\n`;
    for (const t of CATALOG_TEMPLATES) {
      text += `*${t.id}.* ${t.label}\n`;
    }
    text += `\nGunakan: *.setlisttemplate <nomor>*\nContoh: *.setlisttemplate 1*`;
    await reply(text);
    return;
  }

  const id = parseInt(arg, 10);
  if (isNaN(id) || id < 1 || id > CATALOG_TEMPLATES.length) {
    await reply(`❌ Nomor template tidak valid. Pilih 1-${CATALOG_TEMPLATES.length}.`);
    return;
  }

  // Konfirmasi menimpa header/footer manual
  const current = GroupSettingsRepository.get(ctx.chatJid);
  const hasManual = current?.catalog_header || current?.catalog_footer;

  GroupSettingsRepository.setCatalogTemplate(ctx.chatJid, id);
  // Reset header/footer manual agar template baru diterapkan penuh
  if (hasManual) {
    GroupSettingsRepository.setCatalogHeader(ctx.chatJid, null);
    GroupSettingsRepository.setCatalogFooter(ctx.chatJid, null);
  }

  const t = getCatalogTemplate(id);
  await reply(
    `✅ Template katalog diatur ke *${t.label}* (${id}).` +
    (hasManual ? '\nℹ️ Header/footer manual sebelumnya telah direset.' : '')
  );
}

// ============ Preview ============

export async function handlePreviewList(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }

  const products = ProductRepository.getByGroupId(ctx.chatJid);
  const groupName = await resolveGroupName(ctx);

  const { text, mentions } = renderCatalog({
    groupId: ctx.chatJid,
    groupName,
    requesterJid: ctx.senderJid,
    products,
  });

  await reply(`🔍 *Preview Katalog:*\n\n${text}`, { mentions });
}

// ============ Header / footer manual ============

export async function handleSetListHeader(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const header = ctx.fullArgs.trim();
  if (!header) {
    await reply(
      '❌ Format: *.setlistheader <teks header>*\n' +
      'Placeholder: @namagrup, @namawaorangyangmengetiklist, @jam\n' +
      'Contoh: *.setlistheader 🛍️ Katalog @namagrup*'
    );
    return;
  }

  GroupSettingsRepository.setCatalogHeader(ctx.chatJid, header);
  await reply('✅ Header katalog berhasil diatur.');
}

export async function handleSetListFooter(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const footer = ctx.fullArgs.trim();
  if (!footer) {
    await reply(
      '❌ Format: *.setlistfooter <teks footer>*\n' +
      'Contoh: *.setlistfooter terima kasih sudah berbelanja ♡*'
    );
    return;
  }

  GroupSettingsRepository.setCatalogFooter(ctx.chatJid, footer);
  await reply('✅ Footer katalog berhasil diatur.');
}

export async function handleResetListTemplate(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  GroupSettingsRepository.setCatalogTemplate(ctx.chatJid, 1);
  GroupSettingsRepository.setCatalogHeader(ctx.chatJid, null);
  GroupSettingsRepository.setCatalogFooter(ctx.chatJid, null);
  await reply('✅ Template katalog direset ke bawaan (Hhi-Haloow).');
}
