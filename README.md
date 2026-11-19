# Your QR Code

Platform **QR Code Generator (Statis & Dinamis)**, **Halaman Hosting**, **Analitik Scan**, dan **Modul Khusus** untuk Pelajar, Organisasi Mahasiswa (Ormawa), Sekolah/Madrasah, serta UMKM.

**100% Gratis Selamanya • Open Source (Lisensi MIT) • Tanpa Paywall • Tanpa Iklan.**

🌐 **Live Demo:** https://your-qr-code-web.web.app/

## Fitur Utama
- **QR Statis Offline (100% di Browser)**: URL, WhatsApp, WiFi, vCard, Teks, Email, SMS, Telepon, Lokasi Maps, Kalender iCal, Sosial Media, QRIS.
- **QR Dinamis & Halaman Hosting**: Ubah tujuan kapan saja, slug kustom, jadwal aktif, batas jumlah scan, kata sandi opsional, Smart Link (iOS/Android), A/B rotasi, Menu Digital, Link-in-Bio, PDF, Event, Kupon, Katalog.
- **Kustomisasi Desain + Pengecek Keterbacaan**: Warna solid/gradasi, pola modul, bentuk mata, logo tengah/bawaan, bingkai CTA, Brand Kit, dan skor keterbacaan 0–100 dengan saran perbaikan 1 klik.
- **Ekspor & Cetak Massal**: PNG (512–4096px), SVG, JPG, WEBP, PDF (A4/A5/Kartu), salin clipboard, Bulk CSV → ZIP, dan Template Cetak (stiker, tent card meja, poster).
- **Analitik Scan Hemat Kuota**: Tanpa menyimpan IP mentah, grafik harian (`Chart.js`), ekspor CSV.
- **Modul Khusus Target** (dapat diaktifkan/nonaktifkan lewat `js/config.js`):
  - **Pelajar**: Presensi kelas token berputar, check-in, kuis mini.
  - **Ormawa**: Tiket event + check-in, sertifikat + verifikasi keaslian, polling 1 perangkat 1 suara.
  - **Sekolah/Madrasah**: Verifikasi dokumen/ijazah, katalog perpustakaan, inventaris sarana.
  - **UMKM**: Menu digital + keranjang WhatsApp per meja, kartu stempel loyalti, label produk PIRT/Halal.

## Cara Menjalankan Lokal
Cukup jalankan server statis apa pun di folder proyek (tidak perlu build step):
```bash
npx serve .
# atau
python -m http.server 8080
```
Jika `firebaseConfig` di `js/config.js` masih kosong, aplikasi otomatis berjalan di **Mode Lokal/Demo** menggunakan `localStorage` sehingga semua fitur dapat langsung dicoba.

## Panduan Deploy
- [Deploy ke GitHub Pages (Gratis / Spark)](./docs/deploy-github-pages.md)
- [Deploy ke Firebase Hosting (Spark & Blaze)](./docs/deploy-firebase.md)
- [Daftar Uji Manual](./docs/daftar-uji-manual.md)

## Dukungan Pengembang
Jika proyek ini bermanfaat untuk sekolah, organisasi, atau usaha Anda, dukung pengembangan berkelanjutan melalui:
- **Saweria**: https://saweria.co/jaizlana

## Lisensi
Proyek ini dilisensikan di bawah [Lisensi MIT](./LICENSE).
