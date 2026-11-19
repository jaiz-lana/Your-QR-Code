# Daftar Uji Manual (Quality Assurance Checklist)

Jalankan pengujian berikut sebelum merilis ke produksi:

1. **Generator Statis (Tanpa Login)**:
   - [ ] Buat QR URL, WhatsApp, WiFi, dan vCard tanpa internet (setelah halaman termuat).
   - [ ] Pindai menggunakan kamera HP Android & iOS.
   - [ ] Uji Pengecek Keterbacaan: atur warna terang di atas putih → skor turun & tombol "Tingkatkan kontras" memperbaiki otomatis.
   - [ ] Pasang logo tengah besar (>42%) → pastikan ECC otomatis naik ke `H` dan saran muncul.
   - [ ] Ekspor PNG (1024px), SVG, dan PDF A4 lalu periksa hasilnya.
2. **QR Dinamis & Redirect (`r.html`)**:
   - [ ] Simpan QR Dinamis dengan slug kustom (cek validasi duplikat tidak peka huruf besar/kecil).
   - [ ] Pindai URL pendek → pastikan redirect berjalan <1 detik dan jumlah scan bertambah di Dashboard.
   - [ ] Jeda QR dari Dashboard → pindai ulang → pastikan halaman menampilkan pesan dijeda.
   - [ ] Uji kata sandi QR → masukkan sandi salah (ditolak) dan benar (berhasil dialihkan).
3. **Halaman Hosting (`p.html`) & Modul**:
   - [ ] Buat Menu Digital UMKM + `?meja=1` → tambah item ke keranjang → klik pesan WhatsApp.
   - [ ] Uji Presensi Kelas berputar di `modul/pelajar.html` dan cegah absen ganda.
   - [ ] Uji Tiket & Sertifikat di `modul/ormawa.html`.
4. **Tema, Bahasa & Responsivitas**:
   - [ ] Uji Mode Terang & Mode Gelap di HP layar kecil (360px) dan desktop.
   - [ ] Uji ganti bahasa ID ↔ EN di navbar.
   - [ ] Uji Scanner Kamera & Baca Gambar di `scan.html`.
