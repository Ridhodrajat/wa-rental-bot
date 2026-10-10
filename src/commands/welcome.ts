import { CommandContext } from '../types';
import { WelcomeGoodbyeRepository } from '../database/repositories/settingsRepository';

/**
 * Commands template welcome & goodbye.
 */

export async function handleSetWelcome(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  const template = ctx.fullArgs.trim();
  if (!template) {
    await reply(
      '❌ Format: *.setwelcome <teks template>*\n' +
      'Gunakan @user untuk nama pengguna, @group untuk nama grup.\n' +
      'Contoh: *.setwelcome Selamat datang @user di @group! 👋*'
    );
    return;
  }

  WelcomeGoodbyeRepository.setWelcome(ctx.chatJid, template, true);
  await reply('✅ Template *welcome* berhasil disimpan dan diaktifkan.');
}

export async function handleChangeWelcome(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

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
  await reply('✅ Template *welcome* berhasil diubah.');
}

export async function handleDelSetWelcome(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  WelcomeGoodbyeRepository.setWelcome(ctx.chatJid, null, false);
  await reply('✅ Template *welcome* berhasil dihapus dan dinonaktifkan.');
}

export async function handleSetLeft(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  const template = ctx.fullArgs.trim();
  if (!template) {
    await reply(
      '❌ Format: *.setleft <teks template>*\n' +
      'Gunakan @user untuk nama pengguna, @group untuk nama grup.\n' +
      'Contoh: *.setleft Selamat tinggal @user. Terima kasih sudah berkunjung ke @group! 👋*'
    );
    return;
  }

  WelcomeGoodbyeRepository.setGoodbye(ctx.chatJid, template, true);
  await reply('✅ Template *goodbye* berhasil disimpan dan diaktifkan.');
}

export async function handleChangeLeft(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

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
  await reply('✅ Template *goodbye* berhasil diubah.');
}

export async function handleDelSetLeft(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }
  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  WelcomeGoodbyeRepository.setGoodbye(ctx.chatJid, null, false);
  await reply('✅ Template *goodbye* berhasil dihapus dan dinonaktifkan.');
}

export async function handleWelcome(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }

  const current = WelcomeGoodbyeRepository.get(ctx.chatJid);
  if (!current?.welcome_enabled || !current?.welcome_template) {
    await reply('ℹ️ Fitur welcome belum diaktifkan. Hubungi admin grup.');
    return;
  }

  await reply(`*Welcome Template:*\n${current.welcome_template}`);
}

export async function handleGoodbye(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }

  const current = WelcomeGoodbyeRepository.get(ctx.chatJid);
  if (!current?.goodbye_enabled || !current?.goodbye_template) {
    await reply('ℹ️ Fitur goodbye belum diaktifkan. Hubungi admin grup.');
    return;
  }

  await reply(`*Goodbye Template:*\n${current.goodbye_template}`);
}
