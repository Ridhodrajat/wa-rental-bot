/**
 * Template HTML sederhana (tanpa framework) untuk website IDAIDO BOT.
 * Dipakai oleh generate.js.
 */

'use strict';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const NAV_ITEMS = [
  { href: 'index.html', label: 'Beranda', key: 'index' },
  { href: 'index.html#fitur', label: 'Fitur', key: 'fitur' },
  { href: 'index.html#harga', label: 'Harga', key: 'harga' },
  { href: 'command.html', label: 'Perintah', key: 'command' },
  { href: 'panduan.html', label: 'Panduan', key: 'panduan' },
  { href: 'panduan.html#faq', label: 'FAQ', key: 'faq' },
];

function header(site, active) {
  const items = NAV_ITEMS.map((item) => {
    const cls = item.key === active ? ' class="active"' : '';
    return `<li><a href="${item.href}"${cls}>${escapeHtml(item.label)}</a></li>`;
  }).join('\n          ');

  return `<header class="site-header" id="top">
    <div class="container header-inner">
      <a class="brand" href="index.html">
        <span class="brand-mark">ID</span>
        <span class="brand-name">${escapeHtml(site.brand)}</span>
      </a>
      <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <nav class="site-nav">
        <ul>
          ${items}
        </ul>
        <a class="btn btn-wa btn-sm" href="${site.waLink}" target="_blank" rel="noopener">Hubungi Owner</a>
      </nav>
    </div>
  </header>`;
}

function footer(site) {
  return `<footer class="site-footer">
    <div class="container footer-inner">
      <div>
        <strong>${escapeHtml(site.brand)}</strong>
        <p>${escapeHtml(site.tagline)}</p>
      </div>
      <div class="footer-links">
        <a href="index.html">Beranda</a>
        <a href="command.html">Daftar Perintah</a>
        <a href="panduan.html">Panduan</a>
        <a href="panduan.html#faq">FAQ</a>
      </div>
      <p class="footer-note">${escapeHtml(site.disclaimer)}</p>
      <p class="footer-copy">&copy; <span id="year"></span> ${escapeHtml(site.brand)}.</p>
    </div>
  </footer>`;
}

function layout(site, options) {
  const title = options.title ? `${options.title} — ${site.brand}` : `${site.brand} — ${site.tagline}`;
  const description = options.description || site.subtitle;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  ${header(site, options.active)}
  <main>
${options.content}
  </main>
  ${footer(site)}
  <script src="assets/app.js"></script>
</body>
</html>
`;
}

function featureCards(features) {
  return features
    .map(
      (f) => `<article class="card feature">
        <div class="feature-icon" aria-hidden="true">${escapeHtml(f.icon)}</div>
        <h3>${escapeHtml(f.title)}</h3>
        <p>${escapeHtml(f.text)}</p>
      </article>`
    )
    .join('\n      ');
}

function packageCards(packages, site) {
  return packages
    .map((p) => {
      const feats = p.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('\n            ');
      const badge = p.highlight ? '<span class="badge">Paling Populer</span>' : '';
      const cls = p.highlight ? 'card package highlight' : 'card package';
      return `<article class="${cls}">
        ${badge}
        <h3>${escapeHtml(p.name)}</h3>
        <p class="duration">${escapeHtml(p.duration)}</p>
        <p class="price">${escapeHtml(p.price)}</p>
        <ul class="package-features">
            ${feats}
        </ul>
        <a class="btn btn-wa" href="${site.waLink}" target="_blank" rel="noopener">Pesan Paket Ini</a>
      </article>`;
    })
    .join('\n      ');
}

function stepCards(steps) {
  return steps
    .map(
      (s, i) => `<li class="step">
        <span class="step-no">${i + 1}</span>
        <div>
          <h3>${escapeHtml(s.title || s.step)}</h3>
          <p>${escapeHtml(s.text)}</p>
        </div>
      </li>`
    )
    .join('\n      ');
}

function faqList(items) {
  return items
    .map(
      (item) => `<details class="faq-item">
        <summary>${escapeHtml(item.q)}</summary>
        <p>${escapeHtml(item.a)}</p>
      </details>`
    )
    .join('\n      ');
}

module.exports = {
  escapeHtml,
  layout,
  featureCards,
  packageCards,
  stepCards,
  faqList,
  NAV_ITEMS,
};
