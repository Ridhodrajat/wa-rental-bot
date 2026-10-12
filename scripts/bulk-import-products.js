/**
 * Bulk import produk ke katalog grup secara langsung via database.
 *
 * Tujuan: mengisi katalog tanpa mengirim banyak pesan ke grup (anti-spam).
 * Cara pakai:
 *   1. Pastikan bot berhenti dulu (opsional tapi sangat disarankan):
 *      pm2 stop wa-rental-bot
 *   2. Jalankan script:
 *      node scripts/bulk-import-products.js <group_id> <file>
 *   3. Jalankan kembali bot:
 *      pm2 start ecosystem.config.js
 *
 * Format file yang didukung:
 * - .txt  -> satu baris per produk: nama_produk|deskripsi
 *            deskripsi boleh mengandung \n untuk newline
 * - .json -> array of { "name": "...", "description": "..." }
 *
 * Contoh .txt:
 *   youtube|YouTube Premium 1 Bulan - Rp50.000
 *   netflix|Netflix 1 Bulan - Rp30.000\nAktivasi cepat 1x24 jam
 *
 * Contoh .json:
 *   [
 *     { "name": "youtube", "description": "YouTube Premium 1 Bulan - Rp50.000" },
 *     { "name": "netflix", "description": "Netflix 1 Bulan - Rp30.000" }
 *   ]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { initDatabase, closeDatabase, getDatabase } = require('../dist/database/db');
const { runMigrations } = require('../dist/database/migrations');
const { config } = require('../dist/config/env');
const { GroupRepository } = require('../dist/database/repositories/groupRepository');
const { ProductRepository } = require('../dist/database/repositories/productRepository');

function printUsage() {
  console.log('Usage: node scripts/bulk-import-products.js <group_id> <file>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/bulk-import-products.js 120363xxxxxxxxxx@g.us data/products.txt');
  console.log('  node scripts/bulk-import-products.js 120363xxxxxxxxxx@g.us data/products.json');
  process.exit(1);
}

function nowUtc() {
  return new Date().toISOString();
}

function ensureGroup(groupId) {
  // Ambil nama grup dari database kalau ada
  const db = getDatabase();
  let groupName = '';
  try {
    const row = db.prepare('SELECT group_name FROM groups WHERE group_id = ?').get(groupId);
    groupName = row?.group_name ?? '';
  } catch {
    // abaikan
  }

  // Pastikan grup ada di tabel groups (agar FK products tidak error)
  db.prepare(
    `INSERT INTO groups (group_id, group_name, joined_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(group_id) DO UPDATE SET
       updated_at = excluded.updated_at,
       group_name = COALESCE(NULLIF(excluded.group_name, ''), groups.group_name)`
  ).run(groupId, groupName, nowUtc(), nowUtc(), nowUtc());

  console.log(`✅ Group ${groupId} ensured`);
}

function parseTxtFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const products = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = trimmed.indexOf('|');
    if (idx === -1) {
      console.warn(`⚠️ Skip invalid line (no separator): ${trimmed}`);
      continue;
    }

    const name = trimmed.slice(0, idx).trim();
    const description = trimmed.slice(idx + 1).trim().replace(/\\n/g, '\n');

    if (!name) {
      console.warn('⚠️ Skip line with empty product name');
      continue;
    }

    products.push({ name, description });
  }

  return products;
}

function parseJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('JSON file must contain an array of { name, description } objects');
  }

  return parsed.map((p) => ({
    name: String(p.name ?? '').trim(),
    description: String(p.description ?? '').trim().replace(/\\n/g, '\n'),
  })).filter((p) => p.name);
}

function parseProducts(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') return parseJsonFile(filePath);
  if (ext === '.txt' || ext === '') return parseTxtFile(filePath);
  throw new Error(`Unsupported file extension: ${ext}. Use .txt or .json`);
}

async function main() {
  const [groupId, filePath] = process.argv.slice(2);

  if (!groupId || !filePath) {
    printUsage();
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  if (!groupId.endsWith('@g.us')) {
    console.warn(`⚠️ group_id usually ends with @g.us. You provided: ${groupId}`);
  }

  try {
    console.log('🗄️  Initializing database...');
    initDatabase();
    runMigrations(getDatabase());

    console.log('📥 Parsing products...');
    const products = parseProducts(filePath);

    if (products.length === 0) {
      console.log('ℹ️ No products to import');
      closeDatabase();
      process.exit(0);
    }

    console.log(`📦 Found ${products.length} products to import`);

    ensureGroup(groupId);

    let inserted = 0;
    let skipped = 0;

    for (const { name, description } of products) {
      const existing = ProductRepository.findByName(groupId, name);
      if (existing) {
        console.warn(`⚠️ Skipped duplicate: ${name}`);
        skipped++;
        continue;
      }

      ProductRepository.create(groupId, name, description);
      console.log(`✅ Inserted: ${name}`);
      inserted++;
    }

    console.log('');
    console.log('🎉 Import complete');
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped (duplicates): ${skipped}`);
    console.log(`   Group: ${groupId}`);

    closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error.message || error);
    console.error(error.stack);
    closeDatabase();
    process.exit(1);
  }
}

main();
