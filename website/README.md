# Website IDAIDO BOT

Situs informasi (bukan web bot) untuk calon pembeli: tentang bot, daftar perintah,
cara pesan, dan panduan pemakaian.

Situs ini **statis** — hanya HTML/CSS/JS, jadi bisa di-upload ke hosting biasa
(mis. InfinityFree), GitHub Pages, Cloudflare Pages, dsb. Tidak butuh Node.js di hosting.

## Cara generate

Dari root project:

```bash
npm run website
```

Hasilnya ada di `website/public/`:

```
website/public/
├── index.html      (beranda: fitur, harga, cara pesan, FAQ ringkas)
├── command.html    (daftar semua perintah + pencarian & filter)
├── panduan.html    (cara pesan, quickstart admin, alur, FAQ, troubleshooting)
└── assets/
    ├── style.css
    ├── app.js
    └── img/        (tangkapan layar, bila ada)
```

## Mengubah isi website

Semua teks diatur di `website/content.js` (brand, fitur, **harga**, FAQ,
langkah pemesanan, contoh perintah, dan nomor kontak). Setelah diubah, jalankan
`npm run website` lagi.

Daftar perintah **tidak ditulis manual** — generator membaca
`src/commands/index.ts`, jadi situs selalu sinkron dengan bot. Tambah perintah
baru di bot, lalu generate ulang.

Nomor kontak tombol WhatsApp diambil otomatis dari `.env` (`OWNER_NUMBER`).
Kalau ingin nomor lain, isi `contact.number` di `website/content.js`.

## Menambah tangkapan layar

Taruh file gambar (`.png`/`.jpg`/`.webp`) di `website/assets/img/`, jalankan
`npm run website`, dan gambar akan otomatis muncul di bagian **Contoh Tampilan**
halaman beranda.

## Upload ke InfinityFree

1. Jalankan `npm run website`.
2. Buka File Manager / FTP (mis. FileZilla) akun InfinityFree-mu.
3. Masuk ke folder `htdocs/`.
4. Unggah **isi** folder `website/public/` (bukan foldernya), sehingga
   `htdocs/index.html` ada.
5. Buka domainmu di browser.

Pastikan semua file ikut terunggah, termasuk folder `assets/`.

## Catatan

File di `website/public/` adalah hasil generate — boleh dihapus dan dibuat ulang
kapan saja dengan `npm run website`.
