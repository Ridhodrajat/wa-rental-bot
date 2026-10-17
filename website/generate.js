/**
 * Generator website statis IDAIDO BOT.
 *
 * Menghasilkan file HTML/CSS/JS statis (tanpa Node.js di hosting) ke folder
 * `website/public/`, siap di-upload ke hosting mana pun (mis. InfinityFree).
 *
 * Sumber data:
 *  - website/content.js    -> teks/konten (brand, fitur, harga, FAQ, dsb)
 *  - src/commands/index.ts -> daftar perintah (dibaca otomatis)
 *  - .env                  -> nomor owner (bila contact.number kosong)
 *
 * Jalankan:  npm run website
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'public');
const ASSETS_SRC = path.join(__dirname, 'assets');
const ASSETS_OUT = path.join(OUT, 'assets');
const IMG_SRC = path.join(ASSETS_SRC, 'img');
const IMG_OUT = path.join(ASSETS_OUT, 'img');

const site_content = require('./content');
const templates = require('./templates');

// ============ Perintah: baca registry dari source ============

function parseCommands() {
  const file = path.join(ROOT, 'src', 'commands', 'index.ts');
  const source = fs.readFileSync(file, 'utf8');
  const result = [];

  for (const line of source.split(/\r?\n/)) {
    const nameMatch = /register\(\{\s*name:\s*'([^']+)'/.exec(line);
    if (!nameMatch) continue;

    const pick = (key) => {
      const m = new RegExp(key + ":\\s*'([^']*)'").exec(line);
      return m ? m[1] : '';
    };
    const flag = (key) => new RegExp(key + ":\\s*true").test(line);

    const ownerOnly = flag('ownerOnly');
    const adminOnly = flag('adminOnly');

    result.push({
      name: nameMatch[1],
      description: pick('description'),
      category: pick('category') || 'utility',
      ownerOnly,
      adminOnly,
      groupOnly: flag('groupOnly'),
      hidden: flag('hidden'),
      access: ownerOnly ? 'owner' : adminOnly ? 'admin' : 'all',
    });
  }

  return result;
}

const ACCESS_LABEL = { owner: 'Owner', admin: 'Admin', all: 'Semua' };

// ============ Nomor owner ============

function readOwnerFromEnv() {
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    const m = /^OWNER_NUMBER=(.+)$/m.exec(env);
    if (m) return m[1].replace(/[^0-9]/g, '');
  } catch {
    /* .env tidak ada -> abaikan */
  }
  return '';
}

function buildSite() {
  const number =
    (site_content.contact.number || '').replace(/[^0-9]/g, '') || readOwnerFromEnv();
  const text = encodeURIComponent(
    site_content.contact.message || 'Halo, saya tertarik menyewa bot.'
  );

  return {
    brand: site_content.brand,
    tagline: site_content.tagline,
    subtitle: site_content.subtitle,
    disclaimer: site_content.disclaimer,
    prefix: site_content.prefix || '.',
    ownerNumber: number,
    waLink: number ? `https://wa.me/${number}?text=${text}` : '#',
    waDisplay: number ? `+${number}` : 'Nomor owner belum diatur',
  };
}

// ============ Halaman: Beranda ============

function buildIndex(site, commands, demoImages) {
  const visible = commands.filter((c) => !c.hidden);
  const featureCount = visible.length;

  const stats = site_content.stats
    .map((s) => {
      const value = String(s.value).replace('{count}', String(featureCount));
      return `<div class="stat"><span class="stat-value">${templates.escapeHtml(
        value
      )}</span><span class="stat-label">${templates.escapeHtml(s.label)}</span></div>`;
    })
    .join('\n        ');

  const demo = demoImages.length
    ? `<div class="demo-grid">
        ${demoImages
          .map(
            (img) => `<figure class="demo-item">
          <img src="assets/img/${templates.escapeHtml(img)}" alt="Tampilan ${templates.escapeHtml(
              site.brand
            )}" loading="lazy">
        </figure>`
          )
          .join('\n        ')}
      </div>`
    : `<div class="demo-placeholder">
        <p><strong>Belum ada tangkapan layar.</strong></p>
        <p>Tambahkan file gambar ke <code>website/assets/img/</code> lalu jalankan ulang generator.</p>
      </div>`;

  const body = `
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-text">
          <p class="pill">🤖 Bot WhatsApp Multi-Grup</p>
          <h1>${templates.escapeHtml(site.tagline)}</h1>
          <p class="lead">${templates.escapeHtml(site.subtitle)}</p>
          <div class="hero-actions">
            <a class="btn btn-wa" href="${site.waLink}" target="_blank" rel="noopener">💬 Hubungi Owner</a>
            <a class="btn btn-ghost" href="command.html">Lihat Daftar Perintah</a>
          </div>
          <p class="hero-note">Kontak: ${templates.escapeHtml(site.waDisplay)}</p>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="chat-bubble bot"><span>🛍️ netflix — Netflix Premium 1 Bulan</span></div>
          <div class="chat-bubble user"><span>${templates.escapeHtml(site.prefix)}done 50000</span></div>
          <div class="chat-bubble bot"><span>🧾 Order dicatat: Rp50.000</span></div>
          <div class="chat-bubble bot"><span>📊 Laporan Order Hari Ini siap (Excel)</span></div>
        </div>
      </div>
    </section>

    <section class="container stats">
        ${stats}
    </section>

    <section class="container section" id="fitur">
      <header class="section-head">
        <h2>Fitur Utama</h2>
        <p>Semua yang dibutuhkan untuk merapikan jualan di grup WhatsApp — tanpa harus standby membalas satu per satu.</p>
      </header>
      <div class="grid cards">
        ${templates.featureCards(site_content.features || [])}
      </div>
    </section>

    <section class="container section" id="harga">
      <header class="section-head">
        <h2>Paket Harga</h2>
        <p>Pilih durasi sesuai kebutuhan. Sewa bersifat kumulatif — sisa waktu tidak hilang saat diperpanjang.</p>
      </header>
      <div class="grid packages">
        ${templates.packageCards(site_content.packages || [], site)}
      </div>
      <p class="note">Harga dapat berubah. Hubungi owner untuk penawaran terbaru.</p>
    </section>

    <section class="container section" id="cara-pesan">
      <header class="section-head">
        <h2>Cara Pesan / Sewa</h2>
        <p>Prosesnya singkat, tidak perlu instal apa pun.</p>
      </header>
      <ol class="steps">
        ${templates.stepCards(site_content.orderSteps || [])}
      </ol>
      <div class="cta-band">
        <div>
          <h3>Siap menyewa bot untuk grupmu?</h3>
          <p>Chat owner sekarang, gratis tanya-tanya dulu.</p>
        </div>
        <a class="btn btn-wa" href="${site.waLink}" target="_blank" rel="noopener">Hubungi Owner</a>
      </div>
    </section>

    <section class="container section" id="demo">
      <header class="section-head">
        <h2>Contoh Tampilan</h2>
        <p>Beginilah bot bekerja di dalam grup.</p>
      </header>
      ${demo}
    </section>

    <section class="container section" id="faq-ringkas">
      <header class="section-head">
        <h2>Pertanyaan Umum</h2>
        <p>Beberapa hal yang paling sering ditanyakan.</p>
      </header>
      <div class="faq">
        ${templates.faqList((site_content.faq || []).slice(0, 4))}
      </div>
      <p class="note"><a href="panduan.html#faq">Lihat semua FAQ &rarr;</a></p>
    </section>
  `;

  return templates.layout(site, {
    title: 'Beranda',
    description: site.subtitle,
    active: 'index',
    content: body,
  });
}

// ============ Halaman: Daftar Perintah ============

function buildCommandsPage(site, commands) {
  const visible = commands.filter((c) => !c.hidden);
  const aliases = commands.filter((c) => c.hidden);

  const chips = Object.keys(site_content.categoryLabels)
    .map((cat) => {
      const count = visible.filter((c) => c.category === cat).length;
      if (!count) return '';
      return `<button class="chip" type="button" data-filter="${cat}">${templates.escapeHtml(
        site_content.categoryLabels[cat]
      )} <span>${count}</span></button>`;
    })
    .join('\n          ');

  const rows = visible
    .map((c) => {
      const cat = site_content.categoryLabels[c.category] || c.category;
      const usage = (site_content.usage || {})[c.name] || `${site.prefix}${c.name}`;
      const search = `${c.name} ${c.description} ${cat}`.toLowerCase();
      return `<tr data-category="${c.category}" data-access="${c.access}" data-search="${templates.escapeHtml(
        search
      )}">
          <td data-label="Perintah"><code>${templates.escapeHtml(site.prefix + c.name)}</code></td>
          <td data-label="Kegunaan">${templates.escapeHtml(c.description)}</td>
          <td data-label="Contoh"><code>${templates.escapeHtml(usage)}</code></td>
          <td data-label="Akses"><span class="tag tag-${c.access}">${templates.escapeHtml(
        ACCESS_LABEL[c.access]
      )}</span> <span class="tag tag-cat">${templates.escapeHtml(cat)}</span></td>
        </tr>`;
    })
    .join('\n        ');

  const aliasRows = aliases
    .map((c) => {
      const usage = (site_content.usage || {})[c.name] || `${site.prefix}${c.name}`;
      return `<tr>
          <td><code>${templates.escapeHtml(site.prefix + c.name)}</code></td>
          <td>${templates.escapeHtml(c.description)}</td>
          <td><code>${templates.escapeHtml(usage)}</code></td>
        </tr>`;
    })
    .join('\n        ');

  const body = `
    <section class="page-head">
      <div class="container">
        <h1>Daftar Perintah</h1>
        <p>${visible.length} perintah siap pakai. Ketik dengan awalan <code>${templates.escapeHtml(
    site.prefix
  )}</code> atau tanpa awalan, tidak peka huruf besar/kecil.</p>
      </div>
    </section>

    <section class="container section">
      <div class="callout">
        <h3>Cara menulis perintah</h3>
        <ul>
          <li>Awalan perintah adalah <code>${templates.escapeHtml(site.prefix)}</code>. Contoh: <code>${templates.escapeHtml(
    site.prefix
  )}list</code>.</li>
          <li>Bisa juga tanpa awalan bila kata pertama cocok. Contoh: <code>list</code>.</li>
          <li>Balas (reply) pesan pelanggan untuk perintah seperti proses dan selesai.</li>
          <li>Beberapa perintah memakai tag. Contoh: <code>${templates.escapeHtml(
            site.prefix
          )}kick @user</code>.</li>
        </ul>
      </div>

      <div class="command-controls">
        <input type="search" id="commandSearch" class="search" placeholder="Cari perintah... (mis. laporan, blacklist, katalog)">
        <div class="chips" id="commandChips">
          <button class="chip active" type="button" data-filter="all">Semua <span>${visible.length}</span></button>
          ${chips}
        </div>
        <select id="accessFilter" class="select">
          <option value="all">Semua akses</option>
          <option value="allusers">Semua pengguna</option>
          <option value="admin">Admin / Owner</option>
          <option value="owner">Khusus owner</option>
        </select>
      </div>

      <div class="table-wrap">
        <table class="command-table">
          <thead>
            <tr><th>Perintah</th><th>Kegunaan</th><th>Contoh</th><th>Akses</th></tr>
          </thead>
          <tbody id="commandRows">
        ${rows}
          </tbody>
        </table>
      </div>
      <p class="note" id="noResult" hidden>Tidak ada perintah yang cocok.</p>

      ${
        aliasRows
          ? `<h2 class="sub-title">Alias Cepat</h2>
      <div class="table-wrap">
        <table class="command-table">
          <thead><tr><th>Alias</th><th>Kegunaan</th><th>Contoh</th></tr></thead>
          <tbody>
        ${aliasRows}
          </tbody>
        </table>
      </div>`
          : ''
      }
    </section>
  `;

  return templates.layout(site, {
    title: 'Daftar Perintah',
    description: `Daftar lengkap ${visible.length} perintah ${site.brand}.`,
    active: 'command',
    content: body,
  });
}

// ============ Halaman: Panduan ============

function buildPanduanPage(site) {
  const body = `
    <section class="page-head">
      <div class="container">
        <h1>Panduan Menggunakan Bot</h1>
        <p>Dari pemesanan sampai bot siap melayani grup — semua langkahnya ada di sini.</p>
      </div>
    </section>

    <section class="container section" id="cara-pesan">
      <h2 class="sub-title">1. Cara Pesan / Sewa</h2>
      <ol class="steps">
        ${templates.stepCards(site_content.orderSteps || [])}
      </ol>
      <p class="note">Sewa bersifat kumulatif. Contoh format durasi: 7h (7 hari), 30h (30 hari), 4w (4 minggu), 2j (2 jam).</p>
    </section>

    <section class="container section" id="quickstart">
      <h2 class="sub-title">2. Persiapan untuk Admin Grup</h2>
      <ol class="steps">
        ${templates.stepCards(site_content.quickstart || [])}
      </ol>
    </section>

    <section class="container section" id="alur">
      <h2 class="sub-title">3. Alur Jual-Beli Harian</h2>
      <div class="callout">
        <ol>
          <li>Pelanggan melihat katalog, lalu mengetik nama produk untuk melihat detailnya.</li>
          <li>Pelanggan memesan dan membayar (di luar bot, sesuai kebijakan toko).</li>
          <li>Admin membalas chat pelanggan, lalu mengirim status diproses.</li>
          <li>Setelah selesai, admin membalas chat pelanggan lalu mengirim status selesai beserta nominalnya (contoh: <code>${templates.escapeHtml(
            site.prefix
          )}done 50000</code>) agar pesanan tercatat.</li>
          <li>Admin dapat mengunduh laporan pendapatan kapan saja.</li>
        </ol>
      </div>
    </section>

    <section class="container section" id="faq">
      <h2 class="sub-title">4. Pertanyaan Umum (FAQ)</h2>
      <div class="faq">
        ${templates.faqList(site_content.faq || [])}
      </div>
    </section>

    <section class="container section" id="troubleshooting">
      <h2 class="sub-title">5. Kendala yang Sering Terjadi</h2>
      <div class="faq">
        ${templates.faqList(site_content.troubleshooting || [])}
      </div>
    </section>

    <section class="container section">
      <div class="cta-band">
        <div>
          <h3>Masih ada pertanyaan?</h3>
          <p>Hubungi owner langsung, dijawab secepatnya.</p>
        </div>
        <a class="btn btn-wa" href="${site.waLink}" target="_blank" rel="noopener">Hubungi Owner</a>
      </div>
    </section>
  `;

  return templates.layout(site, {
    title: 'Panduan',
    description: `Cara pesan, menyiapkan, dan memakai ${site.brand}.`,
    active: 'panduan',
    content: body,
  });
}

// ============ Siapkan folder output & aset ============

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyAssets() {
  fs.mkdirSync(ASSETS_OUT, { recursive: true });

  for (const file of ['style.css', 'app.js']) {
    const src = path.join(ASSETS_SRC, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(ASSETS_OUT, file));
    }
  }

  const images = [];
  if (fs.existsSync(IMG_SRC)) {
    fs.mkdirSync(IMG_OUT, { recursive: true });
    const files = fs
      .readdirSync(IMG_SRC)
      .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
      .sort();
    for (const file of files) {
      fs.copyFileSync(path.join(IMG_SRC, file), path.join(IMG_OUT, file));
      images.push(file);
    }
  }
  return images;
}

// ============ Main ============

function main() {
  const site = buildSite();
  const commands = parseCommands();

  if (!site.ownerNumber) {
    console.warn(
      'PERINGATAN: nomor owner belum diatur. Isi contact.number di website/content.js atau .env.'
    );
  }
  if (commands.length === 0) {
    console.warn('PERINGATAN: tidak ada perintah terbaca dari src/commands/index.ts.');
  }

  resetDir(OUT);
  const images = copyAssets();

  fs.writeFileSync(path.join(OUT, 'index.html'), buildIndex(site, commands, images), 'utf8');
  fs.writeFileSync(path.join(OUT, 'command.html'), buildCommandsPage(site, commands), 'utf8');
  fs.writeFileSync(path.join(OUT, 'panduan.html'), buildPanduanPage(site), 'utf8');

  console.log(`OK: website di-generate ke ${path.relative(ROOT, OUT)}`);
  console.log('    - index.html, command.html, panduan.html');
  console.log(
    `    - ${commands.filter((c) => !c.hidden).length} perintah, ${images.length} gambar`
  );
  console.log(`    - kontak owner: ${site.ownerNumber || '(belum diatur)'}`);
}

main();
