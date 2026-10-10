# Panduan Deployment WA Rental Bot ke VPS

Dokumentasi lengkap untuk deploy WA Rental Bot ke production VPS (Ubuntu/Debian).

## 📋 Prerequisites

- VPS/Server dengan minimal:
  - RAM: 1GB (recommended 2GB)
  - Storage: 10GB free space
  - OS: Ubuntu 20.04 LTS atau lebih baru
  - Port 22 (SSH) terbuka
- Akses root atau sudo
- Domain/IP publik (opsional tapi direkomendasikan)
- WhatsApp number (bukan Business API)

## 🚀 Langkah Deployment

### 1. Persiapan Server

```bash
# Login ke VPS
ssh root@your-vps-ip

# Update sistem
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl git build-essential
```

### 2. Install Node.js 22+

```bash
# Install Node.js 22 LTS (mendukung node:sqlite built-in)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi instalasi
node -v  # harus >= v22.0.0
npm -v
```

### 3. Setup User Non-Root (Recommended)

```bash
# Buat user khusus untuk bot
sudo adduser wabot
sudo usermod -aG sudo wabot

# Login sebagai user wabot
su - wabot
```

### 4. Clone & Setup Project

```bash
# Clone repository
cd ~
git clone <your-repo-url> wa-rental-bot
cd wa-rental-bot

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env
```

**Edit `.env`:**
```env
OWNER_NUMBER=628123456789    # Ganti dengan nomor owner Anda
BOT_PREFIX=.
DATABASE_PATH=./data/bot.sqlite
AUTH_DIR=./auth
LOG_LEVEL=info
NODE_ENV=production
TZ_DISPLAY=Asia/Makassar
```

### 5. Build Project

```bash
npm run build
```

### 6. Install PM2 Process Manager

```bash
# Install PM2 global
sudo npm install -g pm2

# Setup PM2 startup script
pm2 startup
# Jalankan command yang ditampilkan PM2
```

### 7. Jalankan Bot dengan PM2

```bash
# Start bot
pm2 start dist/index.js --name wa-rental-bot --time

# Save PM2 configuration
pm2 save

# Lihat status
pm2 status
pm2 logs wa-rental-bot --lines 50
```

### 8. Pairing WhatsApp

```bash
# Lihat QR Code di log
pm2 logs wa-rental-bot --lines 100

# Scan QR dengan WhatsApp:
# WhatsApp → Settings → Linked Devices → Link a Device
```

**Setelah scan berhasil:**
- Bot akan terkoneksi
- Session tersimpan di folder `auth/`
- Restart tidak perlu scan ulang

## 🔧 Konfigurasi PM2 Lanjutan

### Ecosystem File (Optional)

Buat `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'wa-rental-bot',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }]
};
```

Start dengan ecosystem:
```bash
pm2 start ecosystem.config.js
pm2 save
```

## 🔒 Keamanan

### 1. Firewall

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 2. Fail2Ban (Protection SSH)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Permissions

```bash
# Set ownership
cd ~/wa-rental-bot
chmod 700 auth/
chmod 600 .env
chmod 700 data/
chmod 700 backups/
```

### 4. SSH Key Authentication

Disable password login, gunakan SSH key (strongly recommended).

## 📊 Monitoring & Maintenance

### Monitoring Real-time

```bash
# Lihat log live
pm2 logs wa-rental-bot

# Monitor resource usage
pm2 monit

# Status detail
pm2 show wa-rental-bot
```

### Restart Bot

```bash
# Restart
pm2 restart wa-rental-bot

# Reload (zero-downtime, tapi tidak selalu work untuk bot)
pm2 reload wa-rental-bot

# Stop
pm2 stop wa-rental-bot

# Delete dari PM2
pm2 delete wa-rental-bot
```

### Update Code

```bash
cd ~/wa-rental-bot

# Backup dulu
cp -r data/ backups/data-backup-$(date +%Y%m%d)
cp -r auth/ backups/auth-backup-$(date +%Y%m%d)

# Pull update
git pull origin main

# Install dependencies baru
npm install

# Rebuild
npm run build

# Restart
pm2 restart wa-rental-bot
```

### Database Backup Manual

```bash
# Backup database
cp data/bot.sqlite backups/manual-backup-$(date +%Y%m%d-%H%M%S).sqlite

# Atau gunakan cron otomatis
crontab -e
```

Tambahkan:
```cron
# Backup database setiap hari jam 2 pagi
0 2 * * * cp ~/wa-rental-bot/data/bot.sqlite ~/wa-rental-bot/backups/daily-$(date +\%Y\%m\%d).sqlite

# Hapus backup lebih dari 30 hari
0 3 * * * find ~/wa-rental-bot/backups/ -name "daily-*.sqlite" -mtime +30 -delete
```

### Restore Database

```bash
cd ~/wa-rental-bot
pm2 stop wa-rental-bot

# Restore dari backup
cp backups/backup-TIMESTAMP.sqlite data/bot.sqlite

pm2 start wa-rental-bot
```

## 🐛 Troubleshooting

### Bot Disconnect Terus

**Penyebab:**
- Network tidak stabil
- WhatsApp mendeteksi behavior mencurigakan
- Session corrupt

**Solusi:**
```bash
pm2 stop wa-rental-bot
rm -rf auth/
pm2 start wa-rental-bot
# Scan QR ulang
```

### Database Locked Error

**Penyebab:** Multiple instance mengakses database sama

**Solusi:**
```bash
pm2 list
pm2 delete all  # Hapus semua
pm2 start dist/index.js --name wa-rental-bot
```

### Memory Leak / High Memory

**Penyebab:** Buildup koneksi atau cache

**Solusi:**
```bash
# Set max memory restart di PM2
pm2 restart wa-rental-bot --max-memory-restart 500M
pm2 save
```

### Session Invalid / Logout Tiba-tiba

**Penyebab:**
- WhatsApp logout manual
- WhatsApp banned number
- Terlalu banyak instance

**Solusi:**
```bash
rm -rf auth/
pm2 restart wa-rental-bot
# Scan QR ulang
```

### Port/Network Issues

```bash
# Cek koneksi
ping -c 4 google.com

# Cek DNS
nslookup whatsapp.com

# Restart networking
sudo systemctl restart networking
```

## 🔄 Automatic Restart on Failure

PM2 sudah otomatis restart bot jika crash. Tapi untuk monitoring lebih lanjut:

### PM2 Plus (Optional - Monitoring Cloud)

```bash
pm2 plus
# Follow instruksi untuk link ke PM2 Plus dashboard
```

### Health Check Script

Buat `healthcheck.sh`:

```bash
#!/bin/bash
STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="wa-rental-bot") | .pm2_env.status')

if [ "$STATUS" != "online" ]; then
    echo "Bot offline, restarting..."
    pm2 restart wa-rental-bot
    # Send notification (optional)
fi
```

Jalankan via cron setiap 5 menit:
```cron
*/5 * * * * /home/wabot/wa-rental-bot/healthcheck.sh
```

## 📈 Performance Tuning

### Node.js Memory Limit

```bash
pm2 start dist/index.js --name wa-rental-bot --node-args="--max-old-space-size=512"
pm2 save
```

### Log Rotation

PM2 built-in log rotation:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🌐 Domain & Reverse Proxy (Optional)

Jika ingin expose API atau webhook (future feature):

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/wabot
```

Contoh config nginx:
```nginx
server {
    listen 80;
    server_name bot.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📞 Support & Maintenance Contact

Hubungi owner bot (sesuai OWNER_NUMBER di `.env`) untuk support.

---

**Best Practices:**
- ✅ Backup database setiap hari
- ✅ Monitor log secara berkala
- ✅ Update dependencies (npm audit fix)
- ✅ Jangan share session `auth/` folder
- ✅ Gunakan SSH key, bukan password
- ✅ Set firewall & fail2ban
- ✅ Monitor resource usage (pm2 monit)
- ✅ Dokumentasikan perubahan konfigurasi

**Jangan:**
- ❌ Jalankan multiple instance dengan sesi sama
- ❌ Share .env atau auth folder
- ❌ Expose port unnecessary
- ❌ Spam atau kirim pesan massal
- ❌ Login WhatsApp manual saat bot running

---

**Deployment Checklist:**
- [ ] VPS setup & secured
- [ ] Node.js 22+ installed
- [ ] Project cloned & built
- [ ] .env configured
- [ ] PM2 installed & configured
- [ ] Bot started & WhatsApp paired
- [ ] Firewall enabled
- [ ] Backup cron configured
- [ ] Monitoring setup
- [ ] Documentation updated

**Happy Deploying! 🚀**
