# Panduan Deploy ke GitHub Pages (100% Gratis — Firebase Spark)

Mode ini menggunakan **GitHub Pages** untuk file statis dan **Firebase paket Spark (Gratis)** untuk Authentication, Cloud Firestore, dan Cloud Storage tanpa memerlukan Cloud Functions.

## Langkah-Langkah
1. **Buat Proyek Firebase (Spark)**:
   - Buka [Firebase Console](https://console.firebase.google.com/) → **Add Project** → pilih paket gratis **Spark**.
   - Daftarkan Web App (`</>`), lalu salin objek `firebaseConfig`.
2. **Aktifkan Layanan Firebase**:
   - **Authentication**: aktifkan metode **Google**, **Email/Password**, dan **Email link (passwordless sign-in)**.
   - **Cloud Firestore**: buat database (pilih lokasi terdekat, mis. `asia-southeast2` Jakarta).
   - **Cloud Storage**: aktifkan Storage.
3. **Konfigurasi `js/config.js`**:
   - Tempel `firebaseConfig` Anda.
   - Pastikan `deployMode: 'pages'` dan `useCloudFunctions: false`.
   - Isi `baseUrl` jika perlu (mis. `https://username.github.io/your-qr-code`), atau biarkan kosong `''` untuk deteksi otomatis.
4. **Deploy Security Rules & Indexes**:
   - Salin isi `firestore.rules` ke tab **Firestore Database → Rules** dan klik **Publish**.
   - Salin isi `storage.rules` ke tab **Storage → Rules** dan klik **Publish**.
   - (Opsional lewat CLI): `firebase deploy --only firestore,storage`.
5. **Push ke GitHub & Aktifkan Pages**:
   - Push seluruh kode ke repositori GitHub Anda.
   - Buka **Settings → Pages → Source: Deploy from a branch** (`main` / root `/`).
6. **Tambahkan Authorized Domain**:
   - Di Firebase Console → **Authentication → Settings → Authorized domains**, tambahkan `<username>.github.io` (atau domain kustom Anda) agar Google Sign-In & Magic Link berjalan.

## Catatan Kuota & Keterbatasan Mode Pages
- **Kuota Spark**: Firestore menyediakan ~50.000 pembacaan & ~20.000 penulisan per hari. Aplikasi ini sudah hemat kuota (dashboard membaca `stats` harian, bukan menghitung ulang `scans`).
- **Redirect & Kata Sandi Sisi Klien**: Tautan dinamis berformat `r.html?c=KODE`. Verifikasi kata sandi dilakukan di sisi klien (`r.html`). Untuk keamanan kata sandi sisi server dan HTTP 302 asli, gunakan Firebase Hosting + Cloud Functions (paket Blaze).
