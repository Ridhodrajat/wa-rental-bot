/**
 * Konten website IDAIDO BOT.
 * Semua teks yang tampil di situs diatur di file ini — tidak perlu edit HTML.
 *
 * CATATAN: harga pada `packages` masih CONTOH. Ganti dengan harga aslimu.
 */

module.exports = {
  brand: 'IDAIDO BOT',
  tagline: 'Bot WhatsApp serba bisa untuk grup jualan kamu',
  subtitle:
    'Melayani katalog, memproses pesanan, menjaga grup dari spam, dan mencatat pendapatan secara otomatis — 24 jam nonstop tanpa kamu harus standby.',
  prefix: '.',

  contact: {
    // Kosongkan untuk mengambil otomatis dari file .env bot (OWNER_NUMBER).
    number: '',
    displayName: 'IDAIDO BOT',
    message: 'Halo, saya tertarik menyewa bot untuk grup WhatsApp saya. Boleh info paketnya?',
  },

  stats: [
    { value: '{count}', label: 'Perintah siap pakai' },
    { value: 'Multi-grup', label: 'Satu bot, banyak grup' },
    { value: '24/7', label: 'Balas otomatis' },
    { value: 'Excel', label: 'Laporan pendapatan' },
  ],

  features: [
    {
      icon: '🛍️',
      title: 'Katalog Produk + Foto',
      text: 'Tambah produk lengkap dengan foto. Pelanggan cukup ketik nama produk, bot langsung membalas detailnya.',
    },
    {
      icon: '💬',
      title: 'Template Pesan Otomatis',
      text: 'Pesan "diproses", "selesai", welcome, goodbye, hingga pesan buka/tutup grup — tersedia banyak gaya dan bisa dikustom.',
    },
    {
      icon: '🔓',
      title: 'Buka & Tutup Grup Otomatis',
      text: 'Atur jam buka dan tutup grup. Bot menguncinya tepat waktu setiap hari tanpa perlu diingatkan.',
    },
    {
      icon: '🛡️',
      title: 'Moderasi Lengkap',
      text: 'Anti-link, anti-wame, hapus pesan, kick/promote, sampai blacklist permanen yang menghapus pesan pelaku otomatis.',
    },
    {
      icon: '📊',
      title: 'Laporan Pendapatan Excel',
      text: 'Catat order sambil mengirim status selesai, lalu unduh laporan harian, mingguan, dan bulanan dalam format Excel.',
    },
    {
      icon: '🤖',
      title: 'OCR Bukti Transfer',
      text: 'Balas foto bukti transfer dengan perintah selesai, bot membaca nominalnya otomatis lalu meminta konfirmasi.',
    },
    {
      icon: '📥',
      title: 'Import & Export Katalog',
      text: 'Pindahkan katalog dari/ke file Excel atau teks. Ganti template toko tanpa mengetik ulang satu per satu.',
    },
    {
      icon: '🔒',
      title: 'Anti Private Chat',
      text: 'Nomor bot tidak melayani chat pribadi. Siapa pun yang mengirim DM akan diarahkan menghubungi owner.',
    },
  ],

  packages: [
    {
      name: 'Paket Mingguan',
      price: 'Rp10.000',
      duration: '7 hari',
      features: ['Semua fitur bot', '1 grup WhatsApp', 'Laporan pendapatan', 'Support via WhatsApp'],
      highlight: false,
    },
    {
      name: 'Paket Bulanan',
      price: 'Rp25.000',
      duration: '30 hari',
      features: [
        'Semua fitur bot',
        '1 grup WhatsApp',
        'Laporan pendapatan',
        'Prioritas support',
        'Gratis bantuan setting awal',
      ],
      highlight: true,
    },
    {
      name: 'Paket 3 Bulan',
      price: 'Rp60.000',
      duration: '90 hari',
      features: ['Semua fitur bot', '1 grup WhatsApp', 'Lebih hemat', 'Prioritas support'],
      highlight: false,
    },
    {
      name: 'Paket Grup Tambahan',
      price: 'Rp15.000',
      duration: '30 hari / grup',
      features: ['Untuk grup tambahan', 'Data terpisah per grup', 'Katalog & template sendiri'],
      highlight: false,
    },
  ],

  orderSteps: [
    {
      title: 'Hubungi Owner',
      text: 'Klik tombol WhatsApp di situs ini, lalu sampaikan kamu ingin menyewa bot.',
    },
    {
      title: 'Pilih Paket & Bayar',
      text: 'Tentukan durasi sewa. Pembayaran langsung ke owner (di luar bot).',
    },
    {
      title: 'Owner Mengaktifkan Sewa',
      text: 'Setelah pembayaran, owner mengaktifkan masa sewa untuk grupmu.',
    },
    {
      title: 'Undang Bot & Jadikan Admin',
      text: 'Undang nomor bot ke grupmu, lalu jadikan bot sebagai admin grup.',
    },
    {
      title: 'Siap Dipakai',
      text: 'Ketik perintah menu di grup dan mulai atur katalog serta templatemu.',
    },
  ],

  quickstart: [
    { step: 'Jadikan bot admin', text: 'Tanpa hak admin, fitur moderasi dan pengaturan grup tidak bisa dipakai.' },
    { step: 'Lihat menu', text: 'Ketik perintah menu untuk melihat seluruh perintah sesuai hak aksesmu.' },
    { step: 'Susun katalog', text: 'Tambah produk dengan format nama dan deskripsi dipisah tanda pipa ( | ).' },
    { step: 'Atur template', text: 'Pilih gaya pesan proses, selesai, welcome, dan goodbye sesuai selera tokomu.' },
    { step: 'Jadwalkan buka/tutup', text: 'Atur jam buka dan tutup grup agar otomatis setiap hari.' },
    { step: 'Aktifkan laporan', text: 'Hidupkan laporan order agar ringkasan pendapatan terkirim tiap grup ditutup.' },
  ],

  faq: [
    {
      q: 'Apakah bot butuh nomor WhatsApp baru?',
      a: 'Sebaiknya ya. Gunakan nomor khusus untuk bot agar tidak mengganggu nomor pribadimu.',
    },
    {
      q: 'Berapa banyak grup yang bisa dilayani?',
      a: 'Bot bersifat multi-grup. Setiap grup memiliki katalog, template, dan pengaturan sendiri, serta bisa disewa terpisah.',
    },
    {
      q: 'Apakah aman dipakai?',
      a: 'Bot bekerja seperti aplikasi WhatsApp Web yang tertaut pada satu nomor. Karena memakai library tidak resmi, gunakan secara wajar dan hindari spam.',
    },
    {
      q: 'Bisa berhenti kapan saja?',
      a: 'Bisa. Cukup tidak memperpanjang sewa. Grup dinonaktifkan, dan data grup dihapus otomatis setelah masa tenggang berakhir.',
    },
    {
      q: 'Data grup saya dilihat owner?',
      a: 'Owner hanya mengelola masa sewa dan teknis bot. Katalog, template, dan laporan order tersimpan terpisah per grup.',
    },
    {
      q: 'Bagaimana kalau bot terputus?',
      a: 'Owner akan menautkan ulang sesi WhatsApp. Selama bot terdaftar, kamu bisa menghubungi owner untuk pemulihan.',
    },
    {
      q: 'Apakah bisa laporan pendapatan?',
      a: 'Bisa. Catat order sambil mengirim status selesai, lalu unduh laporan harian, mingguan, atau bulanan dalam format Excel.',
    },
    {
      q: 'Bagaimana cara pesan produknya?',
      a: 'Pelanggan cukup mengetik nama produk di grup. Bot otomatis membalas deskripsi dan foto produk tersebut.',
    },
  ],

  troubleshooting: [
    { q: 'Bot tidak membalas di grup', a: 'Pastikan masa sewa grup masih aktif dan kamu memakai perintah sesuai hak akses.' },
    { q: 'Muncul pesan bot harus admin', a: 'Jadikan bot sebagai admin grup terlebih dahulu dari menu pengaturan grup WhatsApp.' },
    { q: 'Fitur moderasi tidak jalan', a: 'Pastikan fitur sudah diaktifkan dan bot adalah admin grup.' },
    { q: 'Katalog tidak muncul', a: 'Tambahkan produk terlebih dahulu, lalu jalankan perintah daftar produk.' },
    { q: 'Import katalog gagal', a: 'Pastikan format file benar (Excel dua kolom, atau teks dengan pemisah pipa) dan kamu admin/owner.' },
  ],

  // Contoh pemakaian untuk halaman daftar perintah (opsional per nama perintah).
  usage: {
    menu: '.menu',
    owner: '.owner',
    ceksewa: '.ceksewa',
    list: '.list',
    addlist: '.addlist netflix|Netflix Premium 1 Bulan - Rp50.000',
    updatelist: '.updatelist netflix|Deskripsi baru',
    renamelist: '.renamelist netflix|netflix premium',
    dellist: '.dellist netflix',
    proses: '.proses   (balas chat pelanggan)',
    done: '.done 50000   (balas chat pelanggan)',
    setproses: '.setproses 1',
    setdone: '.setdone 1',
    setwelcome: '.setwelcome 1',
    setleft: '.setleft 1',
    open: '.open',
    close: '.close',
    hidetag: '.hidetag Info penting',
    add: '.add 628123456789',
    kick: '.kick @user',
    promote: '.promote @user',
    demote: '.demote @user',
    addblacklist: '.addblacklist 628123456789 Penipu',
    deleteblacklist: '.deleteblacklist 628123456789',
    viewblacklist: '.viewblacklist',
    autoopen: '.autoopen on',
    autoopenset: '.autoopenset 08:00',
    autoclose: '.autoclose on',
    autocloseset: '.autocloseset 22:00',
    dataorder: '.dataorder on',
    dataordernow: '.dataordernow',
    dataorderweek: '.dataorderweek',
    dataordermonth: '.dataordermonth',
    setnominal: '.setnominal 50000',
    exportlist: '.exportlist 1',
    importlist: '.importlist',
    setppgc: '.setppgc   (balas sebuah gambar)',
    setnamegc: '.setnamegc Nama Grup Baru',
    setdesgc: '.setdesgc Deskripsi grup baru',
    afk: '.afk sedang keluar',
    p: '.p   (alias dari proses)',
    d: '.d 50000   (alias dari done)',
  },

  categoryLabels: {
    owner: 'Owner & Info',
    product: 'Katalog Produk',
    transaction: 'Transaksi',
    welcome: 'Welcome / Goodbye',
    moderation: 'Moderasi Grup',
    settings: 'Pengaturan Bot',
    utility: 'Utilitas',
  },

  categoryDescriptions: {
    owner: 'Perintah pengelolaan sewa dan informasi bot. Sebagian hanya untuk owner.',
    product: 'Mengatur katalog produk, template tampilan katalog, serta import/export.',
    transaction: 'Pesan status pesanan dan pemilihan template proses/selesai.',
    welcome: 'Pesan otomatis saat anggota masuk dan keluar grup.',
    moderation: 'Menjaga ketertiban grup: anti-link, kick, blacklist, dan lain-lain.',
    settings: 'Pengaturan grup, jadwal otomatis, foto/nama grup, dan laporan order.',
    utility: 'Perintah bantu seperti status bot dan mode AFK.',
  },

  disclaimer:
    'Bot ini memakai library tidak resmi (Baileys) dan bukan produk resmi WhatsApp. Gunakan secara wajar dan bertanggung jawab.',
};
