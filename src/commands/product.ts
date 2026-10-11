import { CommandContext, ReplyFn } from '../types';
import { ProductRepository } from '../database/repositories/productRepository';
import { GroupRepository } from '../database/repositories/groupRepository';
import { saveProductImage, deleteMediaFile, resolveMediaPath } from '../services/mediaService';
import { renderCatalog } from '../utils/catalogRenderer';
import { getGroupMetadata, getSocket } from '../connection/whatsapp';
import logger from '../utils/logger';

/**
 * Commands pengelolaan katalog produk (admin grup).
 * Mendukung nama, deskripsi, dan foto opsional.
 */

// ============ Helper ============

/**
 * Parse input produk: mendukung separator `@` dan `|`.
 * Mengembalikan { name, description } atau null jika format salah.
 */
function parseProductInput(fullArgs: string): { name: string; description: string } | null {
  let sep: string | null = null;
  if (fullArgs.includes('|')) sep = '|';
  else if (fullArgs.includes('@')) sep = '@';

  if (!sep) return null;

  const idx = fullArgs.indexOf(sep);
  const name = fullArgs.slice(0, idx).trim();
  const description = fullArgs.slice(idx + 1).trim();

  if (!name || !description) return null;
  return { name, description };
}

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

// ============ List katalog ============

export async function handleList(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!ctx.isGroup) {
    await reply('❌ Perintah ini hanya bisa digunakan di grup.');
    return;
  }

  const products = ProductRepository.getByGroupId(ctx.chatJid);

  // Nama grup
  let groupName = ctx.groupName ?? '';
  if (!groupName) {
    try {
      const meta = await getGroupMetadata(ctx.chatJid);
      groupName = meta?.subject ?? 'Grup';
    } catch {
      groupName = 'Grup';
    }
  }

  const { text, mentions } = renderCatalog({
    groupId: ctx.chatJid,
    groupName,
    requesterJid: ctx.senderJid,
    products,
  });

  await reply(text, { mentions });
}

// ============ Tambah produk ============

export async function handleAddList(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const parsed = parseProductInput(ctx.fullArgs);
  if (!parsed) {
    await reply(
      '❌ Format salah.\nGunakan: *.addlist nama_produk|deskripsi*\n' +
      'Atau kirim foto dengan caption: *.addlist nama_produk|deskripsi*\n' +
      'Contoh: *.addlist youtube|YouTube Premium 1 Bulan - Rp50.000*'
    );
    return;
  }

  const { name, description } = parsed;

  const existing = ProductRepository.findByName(ctx.chatJid, name);
  if (existing) {
    await reply(`❌ Produk dengan nama *${name}* sudah ada di katalog.`);
    return;
  }

  // Cek apakah ada foto (dari pesan atau quoted)
  let imagePath: string | null = null;
  const hasImage =
    ctx.msg?.message?.imageMessage ||
    ctx.msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

  if (hasImage) {
    const saved = await saveProductImage(ctx.msg, ctx.chatJid, name, getSocket());
    if (!saved) {
      await reply(
        '⚠️ Foto gagal diproses (tipe/ukuran tidak valid). Produk akan disimpan tanpa foto.\n' +
        'Gunakan .updatelist untuk mencoba menambahkan foto lagi.'
      );
    } else {
      imagePath = saved.relativePath;
    }
  }

  ProductRepository.create(ctx.chatJid, name, description, imagePath);

  const photoInfo = imagePath ? '\n📷 Dengan foto' : '';
  await reply(`✅ Produk *${name}* berhasil ditambahkan ke katalog.${photoInfo}`);
}

// ============ Update produk (deskripsi dan/atau foto) ============

export async function handleUpdateList(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  // Format: updatelist nama_produk|deskripsi_baru  (deskripsi opsional jika hanya ganti foto)
  const parsed = parseProductInput(ctx.fullArgs);

  // Jika tidak ada deskripsi, mungkin hanya mengganti foto: .updatelist nama_produk
  let name: string;
  let newDescription: string | null = null;

  if (parsed) {
    name = parsed.name;
    newDescription = parsed.description;
  } else {
    // Hanya nama produk (untuk update foto saja)
    name = ctx.fullArgs.trim();
    if (!name) {
      await reply(
        '❌ Format salah.\nGunakan: *.updatelist nama_produk|deskripsi_baru*\n' +
        'Atau balas foto dengan *.updatelist nama_produk* untuk mengganti foto.'
      );
      return;
    }
  }

  const existing = ProductRepository.findByName(ctx.chatJid, name);
  if (!existing) {
    await reply(`❌ Produk *${name}* tidak ditemukan di katalog.`);
    return;
  }

  // Cek foto pengganti
  let newImagePath: string | null | undefined = undefined;
  const hasImage =
    ctx.msg?.message?.imageMessage ||
    ctx.msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

  if (hasImage) {
    const saved = await saveProductImage(ctx.msg, ctx.chatJid, name, getSocket());
    if (!saved) {
      await reply('❌ Foto gagal diproses. Data produk lama tidak diubah.');
      return; // Jangan ubah apapun jika foto gagal (konsistensi data)
    }
    newImagePath = saved.relativePath;
  }

  const finalDescription = newDescription ?? existing.description;

  // Update DB dulu
  ProductRepository.updateDescription(ctx.chatJid, name, finalDescription, newImagePath);

  // Hapus foto lama SETELAH update berhasil (jika ada foto pengganti)
  if (newImagePath !== undefined && existing.image_path && existing.image_path !== newImagePath) {
    deleteMediaFile(existing.image_path);
  }

  const parts: string[] = [];
  if (newDescription) parts.push('deskripsi');
  if (newImagePath !== undefined) parts.push('foto');
  await reply(`✅ Produk *${name}* berhasil diperbarui (${parts.join(' & ') || 'tidak ada perubahan'}).`);
}

// ============ Rename produk ============

export async function handleRenameList(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

  const parsed = parseProductInput(ctx.fullArgs);
  if (!parsed) {
    await reply(
      '❌ Format salah.\nGunakan: *.renamelist nama_lama|nama_baru*\n' +
      'Contoh: *.renamelist youtube|yt premium*'
    );
    return;
  }

  const oldName = parsed.name;
  const newName = parsed.description; // setelah separator

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

  ProductRepository.update(
    ctx.chatJid,
    oldName,
    newName,
    existing.description,
    existing.image_path
  );
  await reply(`✅ Produk *${oldName}* berhasil diubah namanya menjadi *${newName}*.`);
}

// ============ Hapus produk ============

export async function handleDelList(ctx: CommandContext, reply: ReplyFn): Promise<void> {
  if (!(await requireAdmin(ctx, reply))) return;

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
  // Hapus file media setelah data terhapus
  deleteMediaFile(existing.image_path);
  await reply(`✅ Produk *${name}* berhasil dihapus dari katalog.`);
}

// ============ Tampilkan produk (dipanggil dari messageHandler) ============

/**
 * Kirim produk (foto + deskripsi) ke grup.
 * Mengembalikan true jika produk ditemukan & terkirim.
 */
export async function replyProduct(
  ctx: CommandContext,
  reply: ReplyFn
): Promise<boolean> {
  const product = ProductRepository.findByName(ctx.chatJid, ctx.body.trim());
  if (!product) return false;

  const imageAbs = resolveMediaPath(product.image_path);
  const caption = `${product.original_name}\n\n${product.description}`;

  if (imageAbs) {
    await reply(caption, { imagePath: imageAbs });
  } else {
    await reply(caption);
  }
  return true;
}
