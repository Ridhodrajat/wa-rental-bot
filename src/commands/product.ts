import { CommandContext } from '../types';
import { ProductRepository } from '../database/repositories/productRepository';

/**
 * Commands pengelolaan katalog produk (admin grup).
 */

export async function handleList(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }

  const products = ProductRepository.getByGroupId(ctx.chatJid);

  if (products.length === 0) {
    await reply('ℹ️ Belum ada produk di katalog grup ini.');
    return;
  }

  let text = `📦 *Katalog Produk (${products.length})*\n\n`;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    text += `${i + 1}. *${p.original_name}*\n   ${p.description}\n\n`;
  }

  await reply(text.trim());
}

export async function handleAddList(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }

  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  // Format: addlist nama_produk|deskripsi
  const parts = ctx.fullArgs.split('|');
  if (parts.length < 2) {
    await reply(
      '❌ Format salah.\nGunakan: *.addlist nama_produk|deskripsi*\n' +
      'Contoh: *.addlist YouTube Premium|YouTube Premium 1 Bulan - Rp50.000*'
    );
    return;
  }

  const name = parts[0].trim();
  const description = parts.slice(1).join('|').trim();

  if (!name || !description) {
    await reply('❌ Nama produk dan deskripsi tidak boleh kosong.');
    return;
  }

  const existing = ProductRepository.findByName(ctx.chatJid, name);
  if (existing) {
    await reply(`❌ Produk dengan nama *${name}* sudah ada di katalog.`);
    return;
  }

  ProductRepository.create(ctx.chatJid, name, description);
  await reply(`✅ Produk *${name}* berhasil ditambahkan ke katalog.`);
}

export async function handleUpdateList(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }

  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  // Format: updatelist nama_produk|deskripsi_baru
  const parts = ctx.fullArgs.split('|');
  if (parts.length < 2) {
    await reply(
      '❌ Format salah.\nGunakan: *.updatelist nama_produk|deskripsi_baru*\n' +
      'Contoh: *.updatelist YouTube Premium|YouTube Premium 2 Bulan - Rp90.000*'
    );
    return;
  }

  const name = parts[0].trim();
  const newDescription = parts.slice(1).join('|').trim();

  if (!name || !newDescription) {
    await reply('❌ Nama produk dan deskripsi tidak boleh kosong.');
    return;
  }

  const existing = ProductRepository.findByName(ctx.chatJid, name);
  if (!existing) {
    await reply(`❌ Produk *${name}* tidak ditemukan di katalog.`);
    return;
  }

  ProductRepository.updateDescription(ctx.chatJid, name, newDescription);
  await reply(`✅ Deskripsi produk *${name}* berhasil diperbarui.`);
}

export async function handleRenameList(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }

  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  // Format: renamelist nama_lama|nama_baru
  const parts = ctx.fullArgs.split('|');
  if (parts.length < 2) {
    await reply(
      '❌ Format salah.\nGunakan: *.renamelist nama_lama|nama_baru*\n' +
      'Contoh: *.renamelist youtube|yt premium*'
    );
    return;
  }

  const oldName = parts[0].trim();
  const newName = parts[1].trim();

  if (!oldName || !newName) {
    await reply('❌ Nama lama dan nama baru tidak boleh kosong.');
    return;
  }

  const existing = ProductRepository.findByName(ctx.chatJid, oldName);
  if (!existing) {
    await reply(`❌ Produk *${oldName}* tidak ditemukan di katalog.`);
    return;
  }

  const collision = ProductRepository.findByName(ctx.chatJid, newName);
  if (collision && collision.id !== existing.id) {
    await reply(`❌ Nama *${newName}* sudah dipakai oleh produk lain.`);
    return;
  }

  ProductRepository.update(ctx.chatJid, oldName, newName, existing.description);
  await reply(`✅ Produk *${oldName}* berhasil diubah namanya menjadi *${newName}*.`);
}

export async function handleDelList(ctx: CommandContext, reply: (text: string) => Promise<any>): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }

  if (!ctx.isAdmin && !ctx.isOwner) {
    await reply('❌ Perintah ini hanya dapat dijalankan oleh admin grup atau owner bot.');
    return;
  }

  const name = ctx.fullArgs.trim();
  if (!name) {
    await reply('❌ Sebutkan nama produk yang ingin dihapus.\nContoh: *.dellist YouTube Premium*');
    return;
  }

  const existing = ProductRepository.findByName(ctx.chatJid, name);
  if (!existing) {
    await reply(`❌ Produk *${name}* tidak ditemukan di katalog.`);
    return;
  }

  ProductRepository.delete(ctx.chatJid, name);
  await reply(`✅ Produk *${name}* berhasil dihapus dari katalog.`);
}
