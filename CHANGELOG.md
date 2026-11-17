# CHANGELOG — WA RENTAL BOT (IDAIDO BOT)

Semua perubahan penting pada proyek `wa-rental-bot` dicatat di dokumen ini.

---

## [1.1.0] — 17 November 2026

### Fitur Baru & Perubahan Utama
- **Sistem Paket Trial & Berbayar (`trial` vs `paid`)**:
  - Grup rental baru secara default berpaket `paid` (berbayar).
  - Grup trial dibatasi kuota balasan harian per grup (reset pukul 00.00 WIB).
  - Fitur premium terkunci pada paket trial dan hanya terbuka di paket berbayar.
- **Perintah Owner Baru**:
  - `.trial [durasi]`: Aktifkan/mulai paket trial dengan durasi bebas (default dari env `TRIAL_DEFAULT_DAYS`, default 7 hari). Dilengkapi pengaman agar tidak sengaja menurunkan grup berbayar aktif.
  - `.setplan <trial|paid>`: Mengubah status paket grup tanpa mengubah tanggal kedaluwarsa rental.
  - `.paket`: Menampilkan informasi paket grup saat ini, status kuota trial, serta daftar harga materi upsell.
- **Penyesuaian Iklan Upsell Trial**:
  - **Pesan Panjang (Katalog >18 baris / >900 karakter)**: Menampilkan banner ringkas (2 baris) di bagian paling atas pesan agar tidak tenggelam, serta iklan lengkap di bawah.
  - **Pesan Pendek**: Menampilkan iklan lengkap di bagian bawah pesan.
  - **Sambutan Anggota (Welcome)**: Menampilkan iklan ringkas pada pesan welcome di grup paket trial.
  - Iklan tidak ditempel pada pesan peringatan/error (`⚠️`, `❌`, `⏳`, `🔒`), menu (`.menu`), atau price list (`.paket`).
- **Penyesuaian Harga Sewa**:
  - **Paket Mingguan (7 hari)**: Rp5.000
  - **Paket Bulanan (30 hari)**: Rp10.000 (Hemat 53% dibanding mingguan)
- **Konfigurasi Environment Baru**:
  - `TRIAL_DAILY_LIMIT` (default `300`): Batas balasan harian per grup trial.
  - `TRIAL_DEFAULT_DAYS` (default `7`): Durasi default saat owner menjalankan `.trial` tanpa argumen.

### Perbaikan & Bug Fixes
- **Moderasi Grup**: Perbaikan antilink & antiwame agar benar-benar menghapus pesan dan memberikan peringatan/kick sesuai mode.
- **Hak Akses Menu**: Perintah pengelolaan owner/admin kini disembunyikan dari tampilan `.menu` anggota biasa.
- **Laporan Excel**: Perbaikan resolusi nomor telepon asli (menangani LID WhatsApp).

---

## [1.0.0] — 18 Oktober 2026

### Fitur Awal (Rilis Pertama)
- **Katalog Produk**: Manajemen produk (`.addlist`, `.updatelist`, `.dellist`, `.list`) dengan template teks dan foto.
- **Pencatatan Transaksi**: Pengelolaan status proses (`.proses`, `.done`), template otomatis (`setopen`, `setclose`), dan konfirmasi OCR transfer.
- **Laporan Excel**: Export rekap pendapatan dan order bulanan/mingguan ke format Excel (`.xlsx`).
- **Moderasi Grup**: Antilink, antiwame, pembuka/penutup grup otomatis, hidetag, dan blacklist anggota.
- **Welcome & Goodbye**: Pesan sambutan dan perpisahan kustom dengan variabel dinamis.
- **Sistem Sewa (Rental)**: Pendaftaran sewa per grup (`.addsewa`, `.delsewa`, `.listsewa`, `.ceksewa`) dengan pengingat otomatis menjelang kadaluwarsa.
