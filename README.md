# WA Rental Bot

WhatsApp Rental Bot dengan sistem multi-grup, manajemen katalog produk, transaksi, moderasi, dan backup otomatis.

## 🎯 Fitur Utama

### Sistem Rental
- ✅ Masa sewa per grup dengan expiry otomatis
- ✅ Grace period 30 hari setelah kedaluwarsa
- ✅ Perpanjangan rental kumulatif
- ✅ Auto backup & restore data grup
- ✅ Riwayat rental & audit log

### Manajemen Katalog
- ✅ Produk katalog terisolasi per grup
- ✅ Pencarian produk case-insensitive
- ✅ CRUD lengkap (tambah, ubah, rename, hapus)
- ✅ Auto-reply jika produk ditemukan

### Transaksi & Template
- ✅ Template proses & selesai per grup
- ✅ Welcome & goodbye message otomatis
- ✅ Custom placeholder support

### Moderasi Grup
- ✅ Antiwame (2 mode: warn/kick)
- ✅ Antilink (2 mode: warn/kick)
- ✅ Open/Close grup
- ✅ Kick, Add, Promote, Demote anggota
- ✅ Hidetag (mention all)
- ✅ Link grup & reset link

### Utilitas
- ✅ AFK status per user
- ✅ Kalkulator (tambah, kurang, kali, bagi)
- ✅ Jeda operasi configurable
- ✅ Info bot & owner

### Keamanan & Reliability
- ✅ Role-based access control (Owner, Admin Grup, Member)
- ✅ Isolasi data antar grup (foreign key enforcement)
- ✅ Parameterized SQL queries
- ✅ Input validation & sanitization
- ✅ Error isolation per message
- ✅ Duplicate message prevention
- ✅ Auto reconnect dengan backoff
- ✅ Graceful shutdown
- ✅ Backup database otomatis

## 📋 Requirements

- Node.js >= 18 (tested on v26.10.0)
- NPM >= 9
- VPS/Server Linux untuk deployment (Ubuntu recommended)
- WhatsApp number (bukan WhatsApp Business API)

## 🚀 Instalasi & Setup

### 1. Clone & Install Dependencies

```bash
git clone <repo-url> wa-rental-bot
cd wa-rental-bot
npm install
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
nano .env
```

Edit file `.env`:

```env
OWNER_NUMBER=628123456789    # Nomor owner (tanpa +, -, spasi)
BOT_PREFIX=.                 # Prefix command (default: .)
DATABASE_PATH=./data/bot.sqlite
AUTH_DIR=./auth
LOG_LEVEL=info              # debug, info, warn, error
NODE_ENV=development        # development atau production
```

### 3. Build TypeScript

```bash
npm run build
```

### 4. Jalankan Bot

```bash
npm start
```

Scan QR code yang muncul di terminal menggunakan WhatsApp **Linked Devices**.

## 🧪 Testing

```bash
npm test
```

Test coverage:
- ✅ Command parser (dengan/tanpa prefix)
- ✅ Kalkulator utilitas
- ✅ Text processing & normalization
- ✅ Date & time calculations

## 📖 Penggunaan

### Command Owner

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `.owner` | Info kontak owner | `.owner` |
| `.addsewa <hari>` | Tambah/perpanjang sewa grup | `.addsewa 30` |
| `.delsewa` | Nonaktifkan rental grup | `.delsewa` |
| `.ceksewa` | Cek status sewa grup | `.ceksewa` |
| `.listsewa` | List semua rental (owner only) | `.listsewa` |
| `.pay` | Lihat metode pembayaran | `.pay` |
| `.setpay <info>` | Atur metode pembayaran | `.setpay BCA: 123456` |

### Command Katalog (Admin Grup)

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `.list` | Lihat katalog produk | `.list` |
| `.addlist <nama>\|<info>` | Tambah produk | `.addlist netflix\|Netflix Premium 1 Bulan - Rp50k` |
| `.updatelist <nama>\|<info>` | Ubah info produk | `.updatelist netflix\|Netflix 2 Bulan - Rp90k` |
| `.renamelist <lama>\|<baru>` | Rename produk | `.renamelist netflix\|nt premium` |
| `.dellist <nama>` | Hapus produk | `.dellist netflix` |

**Pencarian Otomatis:** Ketik nama produk langsung (misal: `netflix`) untuk melihat info produk.

### Command Transaksi (Admin Grup)

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `.setproses <teks>` | Buat template proses | `.setproses ⏳ Pesanan diproses...` |
| `.changeproses <teks>` | Ubah template proses | `.changeproses ⏳ Mohon tunggu...` |
| `.delsetproses` | Hapus template proses | `.delsetproses` |
| `.proses` | Kirim template proses | `.proses` |
| `.setdone <teks>` | Buat template selesai | `.setdone ✅ Pesanan selesai` |
| `.changedone <teks>` | Ubah template selesai | `.changedone ✅ Terima kasih` |
| `.delsetdone` | Hapus template selesai | `.delsetdone` |
| `.done` | Kirim template selesai | `.done` |

### Command Welcome/Goodbye (Admin Grup)

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `.setwelcome <teks>` | Atur template welcome | `.setwelcome Selamat datang @user!` |
| `.changewelcome <teks>` | Ubah template welcome | `.changewelcome Halo @user!` |
| `.delsetwelcome` | Hapus template welcome | `.delsetwelcome` |
| `.setleft <teks>` | Atur template goodbye | `.setleft Goodbye @user` |
| `.changeleft <teks>` | Ubah template goodbye | `.changeleft Selamat tinggal @user` |
| `.delsetleft` | Hapus template goodbye | `.delsetleft` |

Placeholder: `@user` = mention user, `@group` = nama grup

### Command Moderasi (Admin Grup)

| Command | Deskripsi |
|---------|-----------|
| `.antiwame` | Aktifkan antiwame mode 1 (warn) |
| `.antiwame2` | Aktifkan antiwame mode 2 (kick) |
| `.antilink` | Aktifkan antilink mode 1 (warn) |
| `.antilink2` | Aktifkan antilink mode 2 (kick) |
| `.open` | Buka grup (semua bisa kirim pesan) |
| `.close` | Tutup grup (hanya admin) |
| `.hidetag <pesan>` | Tag semua anggota tanpa list panjang |
| `.kick @user` | Keluarkan anggota |
| `.add <nomor>` | Tambah anggota (contoh: `.add 628123456789`) |
| `.promote @user` | Jadikan admin |
| `.demote @user` | Turunkan admin |
| `.linkgc` | Ambil tautan undangan grup |
| `.resetlinkgc` | Reset tautan undangan grup |

### Command Pengaturan Grup (Admin)

| Command | Deskripsi |
|---------|-----------|
| `.setnamegc <nama>` | Ubah nama grup |
| `.setdesgc <deskripsi>` | Ubah deskripsi grup |
| `.setppgc` | Ubah foto profil grup (reply gambar) |
| `.setbot <data>` | Simpan konfigurasi bot custom |
| `.updatesetbot <data>` | Ubah konfigurasi bot |
| `.delsetbot` | Hapus konfigurasi bot |

### Command Utilitas

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `.afk <alasan>` | Aktifkan status AFK | `.afk tidur` |
| `.jeda <ms>` | Atur jeda operasi (admin) | `.jeda 2000` |
| `.tambah <a> <b>` | Kalkulator tambah | `.tambah 5 3` |
| `.kurang <a> <b>` | Kalkulator kurang | `.kurang 10 3` |
| `.kali <a> <b>` | Kalkulator kali | `.kali 4 5` |
| `.bagi <a> <b>` | Kalkulator bagi | `.bagi 20 4` |
| `.bot` | Info bot & status | `.bot` |
| `.cekmenu` | Menu sesuai role | `.cekmenu` |

## 🏗️ Arsitektur

```
wa-rental-bot/
├── src/
│   ├── index.ts              # Entry point & scheduler
│   ├── config/env.ts         # Environment config
│   ├── connection/whatsapp.ts # Baileys integration
│   ├── handlers/             # Event handlers
│   │   ├── messageHandler.ts
│   │   ├── groupHandler.ts
│   │   └── connectionHandler.ts
│   ├── commands/             # Command implementations
│   │   ├── owner.ts
│   │   ├── product.ts
│   │   ├── transaction.ts
│   │   ├── welcome.ts
│   │   ├── moderation.ts
│   │   ├── groupSettings.ts
│   │   ├── utility.ts
│   │   └── index.ts          # Command registry & menu
│   ├── services/             # Business logic
│   │   ├── rentalService.ts
│   │   └── backupService.ts
│   ├── database/             # Database layer
│   │   ├── db.ts
│   │   ├── migrations/
│   │   └── repositories/
│   ├── utils/                # Utilities
│   │   ├── parser.ts
│   │   ├── permissions.ts
│   │   ├── logger.ts
│   │   └── time.ts
│   └── types/                # TypeScript types
├── data/                     # SQLite database
├── auth/                     # WhatsApp session
├── backups/                  # Auto backups
└── tests/                    # Unit tests
```

## 🗄️ Database Schema

**Tables:**
- `groups` - Data grup WhatsApp
- `rentals` - Status sewa per grup
- `rental_history` - Audit log rental
- `products` - Katalog produk per grup
- `transaction_templates` - Template proses/selesai
- `welcome_goodbye` - Template welcome/goodbye
- `moderation_settings` - Pengaturan moderasi
- `group_settings` - Pengaturan custom grup
- `payment_config` - Metode pembayaran (global)
- `user_afk` - Status AFK per user

## 🚢 Deployment ke VPS

### Ubuntu/Debian

```bash
# 1. Update sistem
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs build-essential

# 3. Clone project
git clone <repo-url> wa-rental-bot
cd wa-rental-bot

# 4. Install dependencies
npm install

# 5. Setup environment
cp .env.example .env
nano .env

# 6. Build
npm run build

# 7. Install PM2
sudo npm install -g pm2

# 8. Jalankan dengan PM2
pm2 start dist/index.js --name wa-rental-bot

# 9. Setup auto-restart
pm2 startup
pm2 save

# 10. Monitor
pm2 logs wa-rental-bot
pm2 monit
```

### Pairing WhatsApp

Saat pertama kali dijalankan, QR code akan muncul di log. Scan dengan WhatsApp:

```bash
# Lihat QR code
pm2 logs wa-rental-bot --lines 50
```

Buka WhatsApp → Settings → Linked Devices → Link a Device → Scan QR

## 🔒 Keamanan

### Apa yang HARUS dilakukan:

✅ Ganti `OWNER_NUMBER` di `.env` dengan nomor Anda  
✅ Jangan commit file `.env` atau `auth/` ke Git  
✅ Backup database secara berkala  
✅ Gunakan VPS dengan firewall aktif  
✅ Update dependencies secara rutin (`npm audit fix`)  
✅ Monitor log untuk aktivitas mencurigakan  

### Apa yang JANGAN dilakukan:

❌ Jangan jalankan di laptop/PC pribadi untuk production  
❌ Jangan share session `auth/` ke orang lain  
❌ Jangan spam atau kirim pesan massal tanpa izin  
❌ Jangan jalankan multiple instance dengan sesi sama  
❌ Jangan expose database ke public  

## ⚠️ Disclaimer

Baileys adalah library **tidak resmi** untuk WhatsApp. Penggunaan bot ini berpotensi melanggar Terms of Service WhatsApp. Risiko:
- Nomor bisa diblokir oleh WhatsApp
- Tidak ada dukungan resmi dari WhatsApp
- API bisa berubah tanpa pemberitahuan

**Gunakan dengan bijak dan tanggung jawab Anda sendiri.**

## 🐛 Troubleshooting

### Bot tidak terkoneksi setelah restart

**Solusi:** Session invalid. Hapus folder `auth/` dan scan QR ulang.

```bash
rm -rf auth/
pm2 restart wa-rental-bot
pm2 logs wa-rental-bot
```

### Database error: locked

**Solusi:** Matikan instance duplikat. Hanya 1 instance per database.

```bash
pm2 list
pm2 stop wa-rental-bot
pm2 start wa-rental-bot
```

### Command tidak respon di grup

**Cek:**
1. Apakah rental grup masih aktif? (`.ceksewa`)
2. Apakah bot sudah terkoneksi? (`pm2 logs`)
3. Apakah user punya hak akses? (Admin/Owner untuk command tertentu)

### Better-sqlite3 build error

**Solusi:** Install build tools

```bash
# Ubuntu/Debian
sudo apt install -y build-essential python3

# Rebuild
npm rebuild better-sqlite3
```

## 📊 Monitoring & Maintenance

### Cek Status

```bash
pm2 status
pm2 logs wa-rental-bot --lines 100
```

### Restart Bot

```bash
pm2 restart wa-rental-bot
```

### Update Code

```bash
git pull
npm install
npm run build
pm2 restart wa-rental-bot
```

### Backup Manual

Database backup otomatis dibuat setiap 1 jam di folder `backups/`. Untuk backup manual:

```bash
cp data/bot.sqlite backups/manual-$(date +%Y%m%d-%H%M%S).sqlite
```

### Restore Database

```bash
pm2 stop wa-rental-bot
cp backups/backup-TIMESTAMP.sqlite data/bot.sqlite
pm2 start wa-rental-bot
```

## 📝 License

ISC

## 🤝 Contributing

Pull requests welcome. Untuk perubahan besar, buka issue terlebih dahulu.

## 📞 Support

Hubungi owner bot (lihat `.env` → `OWNER_NUMBER`) atau buka issue di repository ini.

---

**Built with ❤️ using TypeScript, Baileys, SQLite, and Node.js**
