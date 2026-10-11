import { CommandContext, ReplyFn } from '../types';
import { WelcomeGoodbyeRepository } from '../database/repositories/settingsRepository';
import { MESSAGE_TEMPLATES, getDefaultTemplate, getTemplateOption } from '../templates/messageTemplates';
import { resolveTemplate, displayNameFromJid } from '../utils/placeholder';

/**
 * Commands template welcome & goodbye.
 *
 * - .welcome [on|off|preview|list|<teks>]  : kelola welcome
 * - .goodbye [on|off|preview|list|<teks>]  : kelola goodbye
 * - .setwelcome <nomor|teks>               : pilih template welcome
 * - .changewelcome <teks>                  : ubah teks welcome
 * - .delsetwelcome                         : reset ke default
 * - .setleft/.changeleft/.delsetleft       : sama untuk goodbye
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

function renderPreview(template: string, ctx: CommandContext): string {
  const { text } = resolveTemplate(template, {
    user: displayNameFromJid(ctx.senderJid),
    userJid: ctx.senderJid,
    groupName: ctx.groupName ?? 'Grup',
  });
  return text;
}

// ============ Welcome ============

export async function handleWelcome(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');

  const arg = ctx.args[0]?.toLowerCase();

  // .welcome on / off
  if (arg === 'on' || arg === 'off') {
    if (!(await requireAdmin(ctx, reply))) return;
    const enabled = arg === 'on';
    WelcomeGoodbyeRepository.toggleWelcome(ctx.chatJid, enabled);
    // Pastikan template ada (gunakan default jika belum)
    const current = WelcomeGoodbyeRepository.get(ctx.chatJid)!;
    if (!current.welcome_template) {
      WelcomeGoodbyeRepository.setWelcome(ctx.chatJid, getDefaultTemplate('welcome'), enabled);
    }
    await reply(`✅ Fitur *welcome* ${enabled ? 'diaktifkan 🟢' : 'dimatikan 🔴'}.`);
    return;
  }

  // .welcome list -> tampilkan pilihan template
  if (arg === 'list') {
    if (!(await requireAdmin(ctx, reply))) return;
    let text = `🎨 *Pilihan Template Welcome*\n\n`;
    for (const t of MESSAGE_TEMPLATES.welcome) text += `*${t.id}.* ${t.label}\n`;
    text += `\nGunakan: *.setwelcome <nomor>* atau *.setwelcome <teks>*`;
    await reply(text);
    return;
  }

  // .welcome preview
  if (arg === 'preview') {
    const current = WelcomeGoodbyeRepository.get(ctx.chatJid);
    const template = current?.welcome_template ?? getDefaultTemplate('welcome');
    await reply(`🔍 *Preview Welcome:*\n\n${renderPreview(template, ctx)}`);
    return;
  }

  // Tanpa argumen: tampilkan status & template saat ini
  const current = WelcomeGoodbyeRepository.get(ctx.chatJid);
  const status = current?.welcome_enabled ? '🟢 ON' : '🔴 OFF';
  const template = current?.welcome_template ?? getDefaultTemplate('welcome');
  await reply(
    `👋 *Welcome*\nStatus: ${status}\n\n*Template saat ini:*\n${template}\n\n` +
    `Ubah dengan: *.setwelcome <nomor|teks>*`
  );
}

export async function handleSetWelcome(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const arg = ctx.fullArgs.trim();
  if (!arg) {
    let text = `🎨 *Pilihan Template Welcome*\n\n`;
    for (const t of MESSAGE_TEMPLATES.welcome) text += `*${t.id}.* ${t.label}\n`;
    text += `\nGunakan: *.setwelcome <nomor>* atau *.setwelcome <teks>*`;
    await reply(text);
    return;
  }

  // Jika angka -> pilih dari daftar template
  if (/^\d+$/.test(arg)) {
    const option = getTemplateOption('welcome', parseInt(arg, 10));
    if (!option) {
      await reply(`❌ Nomor template tidak valid (1-${MESSAGE_TEMPLATES.welcome.length}).`);
      return;
    }
    WelcomeGoodbyeRepository.setWelcome(ctx.chatJid, option.text, true);
    await reply(`✅ Template welcome *${option.label}* dipilih & diaktifkan.\n\n🔍 Preview:\n${renderPreview(option.text, ctx)}`);
    return;
  }

  // Teks kustom
  WelcomeGoodbyeRepository.setWelcome(ctx.chatJid, arg, true);
  await reply(`✅ Template welcome kustom disimpan & diaktifkan.\n\n🔍 Preview:\n${renderPreview(arg, ctx)}`);
}

export async function handleChangeWelcome(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const template = ctx.fullArgs.trim();
  if (!template) {
    await reply('❌ Format: *.changewelcome <teks template baru>*');
    return;
  }

  const current = WelcomeGoodbyeRepository.get(ctx.chatJid);
  if (!current?.welcome_template) {
    await reply('ℹ️ Template welcome belum diatur. Gunakan *.setwelcome* terlebih dahulu.');
    return;
  }

  WelcomeGoodbyeRepository.setWelcome(ctx.chatJid, template);
  await reply(`✅ Template *welcome* berhasil diubah.\n\n🔍 Preview:\n${renderPreview(template, ctx)}`);
}

export async function handleDelSetWelcome(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;
  WelcomeGoodbyeRepository.setWelcome(ctx.chatJid, getDefaultTemplate('welcome'), true);
  await reply('✅ Template *welcome* direset ke default dan diaktifkan.');
}

// ============ Goodbye ============

export async function handleGoodbye(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) return reply('❌ Perintah ini hanya bisa digunakan di grup.');

  const arg = ctx.args[0]?.toLowerCase();

  if (arg === 'on' || arg === 'off') {
    if (!(await requireAdmin(ctx, reply))) return;
    const enabled = arg === 'on';
    WelcomeGoodbyeRepository.toggleGoodbye(ctx.chatJid, enabled);
    const current = WelcomeGoodbyeRepository.get(ctx.chatJid)!;
    if (!current.goodbye_template) {
      WelcomeGoodbyeRepository.setGoodbye(ctx.chatJid, getDefaultTemplate('goodbye'), enabled);
    }
    await reply(`✅ Fitur *goodbye* ${enabled ? 'diaktifkan 🟢' : 'dimatikan 🔴'}.`);
    return;
  }

  if (arg === 'list') {
    if (!(await requireAdmin(ctx, reply))) return;
    let text = `🎨 *Pilihan Template Goodbye*\n\n`;
    for (const t of MESSAGE_TEMPLATES.goodbye) text += `*${t.id}.* ${t.label}\n`;
    text += `\nGunakan: *.setleft <nomor>* atau *.setleft <teks>*`;
    await reply(text);
    return;
  }

  if (arg === 'preview') {
    const current = WelcomeGoodbyeRepository.get(ctx.chatJid);
    const template = current?.goodbye_template ?? getDefaultTemplate('goodbye');
    await reply(`🔍 *Preview Goodbye:*\n\n${renderPreview(template, ctx)}`);
    return;
  }

  const current = WelcomeGoodbyeRepository.get(ctx.chatJid);
  const status = current?.goodbye_enabled ? '🟢 ON' : '🔴 OFF';
  const template = current?.goodbye_template ?? getDefaultTemplate('goodbye');
  await reply(
    `👋 *Goodbye*\nStatus: ${status}\n\n*Template saat ini:*\n${template}\n\n` +
    `Ubah dengan: *.setleft <nomor|teks>*`
  );
}

export async function handleSetLeft(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const arg = ctx.fullArgs.trim();
  if (!arg) {
    let text = `🎨 *Pilihan Template Goodbye*\n\n`;
    for (const t of MESSAGE_TEMPLATES.goodbye) text += `*${t.id}.* ${t.label}\n`;
    text += `\nGunakan: *.setleft <nomor>* atau *.setleft <teks>*`;
    await reply(text);
    return;
  }

  if (/^\d+$/.test(arg)) {
    const option = getTemplateOption('goodbye', parseInt(arg, 10));
    if (!option) {
      await reply(`❌ Nomor template tidak valid (1-${MESSAGE_TEMPLATES.goodbye.length}).`);
      return;
    }
    WelcomeGoodbyeRepository.setGoodbye(ctx.chatJid, option.text, true);
    await reply(`✅ Template goodbye *${option.label}* dipilih & diaktifkan.\n\n🔍 Preview:\n${renderPreview(option.text, ctx)}`);
    return;
  }

  WelcomeGoodbyeRepository.setGoodbye(ctx.chatJid, arg, true);
  await reply(`✅ Template goodbye kustom disimpan & diaktifkan.\n\n🔍 Preview:\n${renderPreview(arg, ctx)}`);
}

export async function handleChangeLeft(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const template = ctx.fullArgs.trim();
  if (!template) {
    await reply('❌ Format: *.changeleft <teks template baru>*');
    return;
  }

  const current = WelcomeGoodbyeRepository.get(ctx.chatJid);
  if (!current?.goodbye_template) {
    await reply('ℹ️ Template goodbye belum diatur. Gunakan *.setleft* terlebih dahulu.');
    return;
  }

  WelcomeGoodbyeRepository.setGoodbye(ctx.chatJid, template);
  await reply(`✅ Template *goodbye* berhasil diubah.\n\n🔍 Preview:\n${renderPreview(template, ctx)}`);
}

export async function handleDelSetLeft(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;
  WelcomeGoodbyeRepository.setGoodbye(ctx.chatJid, getDefaultTemplate('goodbye'), true);
  await reply('✅ Template *goodbye* direset ke default dan diaktifkan.');
}
