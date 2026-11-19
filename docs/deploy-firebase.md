# Panduan Deploy ke Firebase Hosting (Spark & Blaze)

Mode ini menghasilkan URL bersih seperti `https://proyek-anda.web.app/r/KODE` dan `/p/SLUG`.

## Varian A: Paket Spark (Gratis, Tanpa Cloud Functions)
1. Instal Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Di `js/config.js`, ubah `deployMode: 'firebase'` dan `useCloudFunctions: false`, serta isi `firebaseConfig`.
4. Jalankan inisialisasi atau langsung gunakan `firebase.json` yang sudah tersedia:
   ```bash
   firebase use --add
   firebase deploy
   ```
   Semua request `/r/**` otomatis diarahkan ke `/r.html` dan `/p/**` ke `/p.html`.

## Varian B: Paket Blaze (Opsional, Dengan Cloud Functions)
Gunakan varian ini jika Anda membutuhkan **redirect HTTP 302 asli** tanpa memuat HTML terlebih dahulu.
1. Upgrade proyek ke paket **Blaze (Pay-as-you-go)** di Firebase Console.
2. **Sangat Dianjurkan**: pasang **Budget Alert** (mis. Rp 15.000 atau \$1) di Google Cloud Billing agar terhindar dari tagihan tak terduga.
3. Instal dependensi Functions:
   ```bash
   cd functions && npm install && cd ..
   ```
4. Ubah `useCloudFunctions: true` di `js/config.js`.
5. Deploy menggunakan `firebase.blaze.json`:
   ```bash
   firebase deploy --config firebase.blaze.json
   ```
