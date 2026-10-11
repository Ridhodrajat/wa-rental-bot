# PENYESUAIAN FITUR — WA RENTAL BOT

Dokumen ini merangkum penyesuaian fitur sesuai `PENYESUAIAN FITUR BOT.txt`.
Seluruh perubahan diimplementasikan pada source code proyek yang sudah ada
(bukan proyek baru), mempertahankan arsitektur, stack, dan fitur lama.

## Ringkasan Perubahan

| No | Fitur | Status |
|----|-------|--------|
| 1 | Katalog produk dengan foto | ✅ |
| 2 | Durasi sewa menit/jam/hari (m/j/h) | ✅ |
| 3 | `cekmenu` → `menu` (+ alias) | ✅ |
| 4 | Hapus `pay` & `setpay` | ✅ |
| 5 | Sistem template pesan siap pakai | ✅ |
| 6 | 3+ template welcome/goodbye/proses/done/open/close | ✅ |
| 7 | Hapus `jeda`, `tambah`, `kurang`, `kali`, `bagi` | ✅ |
| 8 | Tambah `ping` | ✅ |
| 9 | Template katalog aesthetic (Hhi-Haloow) | ✅ |
| 10 | 4 template katalog tambahan | ✅ |
| 11 | Pemilihan & pengeditan template katalog | ✅ |
| 12 | Hak akses & isolasi data | ✅ (dipertahankan) |
| 13 | Migrasi database aman & idempoten | ✅ |
| 14 | Pengujian | ✅ 46/46 lulus |
| 16 | Anti-private-chat | ✅ |
| 17 | Hitung bubble chat & auto-block internal | ✅ |
| 18 | Disclaimer denda Rp100.000 (aman) | ✅ |

## 1. Katalog Produk dengan Foto

- Tabel `products` mendapat kolom baru `image_path` (TEXT, nullable).
- Foto disimpan persisten di `./media/<groupId>/` (bukan memori).
- Format: `.addlist nama|deskripsi` dengan/atau kirim foto + caption,
  atau balas foto dengan `.addlist nama|deskripsi`.
- Validasi tipe (jpeg/png/webp) dan ukuran (default 5 MB, `MAX_MEDIA_SIZE`).
- Jika foto gagal diproses, data produk tetap konsisten (tidak tersimpan setengah).
- `.updatelist`: foto lama **tidak dihapus** sampai foto baru berhasil disimpan.
- `.dellist`: file media ikut dibersihkan dengan aman.
- Menampilkan produk: jika ada foto → kirim foto + caption nama & deskripsi;
  jika tidak → kirim teks.

## 2. Sistem Sewa (m/j/h)

- `.addsewa 30m` (menit), `.addsewa 2j` (jam), `.addsewa 30h` (hari).
- Angka polos tetap dianggap **hari** (kompatibilitas format lama).
- Perpanjangan **menambah** waktu kedaluwarsa yang ada (tidak reset dari sekarang).
- Jika `EXPIRED_GRACE`, perpanjangan dimulai dari sekarang (RESTORE).
- Zona waktu tampilan default **Asia/Jakarta (WIB)**.

## 3. Menu

- Command `menu` (+ alias `cekmenu` yang disembunyikan dari daftar).
- Kategori: Owner, Katalog, Transaksi, Welcome/Goodbye, Moderasi, Pengaturan, Utilitas.
- Tidak menampilkan command yang tidak bisa diakses role pengguna.
- Tidak menampilkan kredensial/konfigurasi internal.

## 4. Penghapusan Command

- Dihapus: `pay`, `setpay`, `jeda`, `tambah`, `kurang`, `kali`, `bagi`.
- Nama produk `pay`/`payment` **tetap bisa** disimpan dan dicari.
- Tabel `payment_config` lama tidak dihapus (data aman).

## 5. Template Pesan

- Tabel `transaction_templates` ditambah kolom `proses_enabled`, `done_enabled`,
  `open_template`, `close_template`.
- Tabel `welcome_goodbye` sudah mendukung welcome/goodbye.
- Semua konfigurasi tersimpan di database (persisten setelah restart).

### Command

| Command | Fungsi |
|---------|--------|
| `.welcome on/off/preview/list` | Kelola welcome |
| `.goodbye on/off/preview/list` | Kelola goodbye |
| `.proses on/off/preview/list` | Kelola template proses |
| `.done on/off/preview/list` | Kelola template done |
| `.setwelcome <no\|teks>` | Pilih/atur template welcome |
| `.changewelcome <teks>` | Ubah teks welcome |
| `.delsetwelcome` | Reset ke default |
| `.setleft` / `.changeleft` / `.delsetleft` | Sama untuk goodbye |
| `.setproses` / `.changeproses` / `.delsetproses` | Template proses |
| `.setdone` / `.changedone` / `.delsetdone` | Template done |
| `.setopen <no\|teks>` / `.setclose <no\|teks>` | Template pesan open/close |

- `.open` / `.close` tetap **mengubah izin kirim grup** (moderasi), lalu mengirim template.

### Placeholder

`@user`, `@namagrup`, `@admin`, `@tanggal`, `@jam`, `@produk`, `@deskripsi`,
`@nominal`, `@nomor`. Placeholder tanpa nilai **dibersihkan** (tidak dikirim mentah).

## 6. Template Bawaan

Setiap fitur punya 3 gaya: Cute Pastel, Soft Minimal, Playful Kawaii.
Template default langsung aktif tanpa konfigurasi.

## 9-11. Template Katalog

- 5 template: Hhi-Haloow (1), Soft Pink (2), Bunny Shop (3), Cloud Dream (4),
  Minimalist Cute (5).
- Command:
  - `.setlisttemplate` / `.setlisttemplate <1-5>`
  - `.previewlist`
  - `.setlistheader <teks>`
  - `.setlistfooter <teks>`
  - `.resetlisttemplate`
- Placeholder: `@namagrup`, `@namawaorangyangmengetiklist`, `@jam`.
- Header/footer manual menimpa template; memilih template baru/reset menghapus manual.

## 16-18. Anti-Private-Chat

- DM ke nomor bot memicu peringatan otomatis (sekali saja per pengirim).
- Menghitung bubble chat (persisten).
- Setelah mencapai batas (default 5) & `auto_block` ON → tandai `BLOCKED_INTERNAL`
  (blocklist internal bot, **bukan** pemblokiran akun WhatsApp) dan notifikasi owner.
- Pesan owner tidak memicu peringatan. Pesan grup tidak dihitung.
- Disclaimer denda Rp100.000 bersifat pemberitahuan kebijakan (bukan tagihan otomatis).

### Command (Owner)

- `.antiprivate on/off`
- `.setprivatelimit <angka>`
- `.autoblock on/off`
- `.cekantiprivate`
- `.setowner <nomor>` (override nomor owner, berlaku setelah restart)

## 8. Ping

- `.ping` / `ping` — cek respons + latency + status DB (query ringan `SELECT 1`).

## 13. Migrasi Database

- Migrasi id 2 (`add_media_templates_antiprivate`), idempoten & aman pada DB berisi data.
- Menambah kolom via `ALTER TABLE ... ADD COLUMN` dengan default aman.
- Membuat tabel: `anti_private_settings`, `private_chat_counters`, `global_config`.
- Backup otomatis dibuat sebelum migrasi (`backups/`).

## Struktur File Baru

```
src/
  commands/catalog.ts              # Command template katalog
  database/repositories/antiPrivateRepository.ts
  database/repositories/globalConfigRepository.ts
  handlers/privateChatHandler.ts   # Anti-private-chat
  services/mediaService.ts         # Simpan/hapus foto produk
  templates/messageTemplates.ts    # Template welcome/goodbye/proses/done/open/close
  templates/catalogTemplates.ts    # 5 template katalog
  utils/catalogRenderer.ts         # Render katalog
  utils/placeholder.ts             # Resolver placeholder
tests/features.test.ts             # 27 test fitur baru
```

## Menjalankan

```bash
npm run build
npm start
```

Migrasi berjalan otomatis saat startup. Tidak perlu langkah manual.

## Hasil Pengujian

- Typecheck (`tsc`): ✅ exit 0
- Build: ✅ exit 0
- Jest: ✅ 46/46 lulus (3 suite)
- Migrasi pada DB nyata: ✅ idempoten
