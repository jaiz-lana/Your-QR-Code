/**
 * Konfigurasi Utama "Your QR Code"
 * Ubah file ini sesuai dengan proyek Firebase dan target deploy Anda.
 */
export const APP_CONFIG = {
  appName: 'Your QR Code',
  version: '1.0.0',
  defaultLang: 'id', // 'id' | 'en'

  /**
   * Mode deploy:
   * - "pages": GitHub Pages (paket Spark gratis, redirect lewat r.html?c=KODE)
   * - "firebase": Firebase Hosting (URL bersih /r/KODE dan /p/SLUG)
   */
  deployMode: 'pages',

  /**
   * Aktifkan jika menggunakan Cloud Functions (paket Firebase Blaze)
   * untuk redirect 302 asli & verifikasi kata sandi sisi server.
   */
  useCloudFunctions: false,

  /**
   * URL dasar aplikasi. Kosongkan ('') agar otomatis mendeteksi origin + basePath.
   * Contoh untuk GitHub Pages: 'https://username.github.io/your-qr-code'
   */
  baseUrl: '',

  /**
   * Versi Firebase SDK modular yang di-pin lewat CDN gstatic.
   */
  firebaseSdkVersion: '10.14.1',

  /**
   * Salin konfigurasi Web App dari Firebase Console > Project Settings.
   * Jika apiKey masih kosong, aplikasi otomatis berjalan dalam Mode Lokal/Demo
   * (QR statis 100% jalan, data dinamis tersimpan di localStorage browser).
   */
  firebaseConfig: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: ''
  },

  /**
   * Opsional: Firebase App Check (reCAPTCHA v3 site key) untuk melindungi kuota Spark.
   */
  appCheckSiteKey: '',

  /**
   * Aktifkan atau nonaktifkan modul agar aplikasi tetap ringan sesuai kebutuhan.
   */
  modules: {
    pelajar: true,
    ormawa: true,
    sekolah: true,
    umkm: true,
    analytics: true,
    brandKit: true,
    bulkCsv: true,
    toolkit: true
  },

  /**
   * Batas keamanan & kuota hemat Spark.
   */
  limits: {
    maxUploadBytes: 10 * 1024 * 1024, // 10 MB
    allowedUploadMime: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml'
    ],
    dashboardPageSize: 20,
    forbiddenSlugs: [
      'admin', 'api', 'app', 'auth', 'dashboard', 'docs', 'generator',
      'index', 'login', 'modul', 'p', 'privacy', 'r', 'scan', 'terms', 'verify'
    ]
  },

  /**
   * Tautan pengembang, dukungan, & pelaporan bug.
   */
  developerName: 'jaiz-lana (GitHub)',
  developerGithub: 'https://github.com/jaiz-lana',
  supportUrl: 'https://saweria.co/jaizlana',
  bugReportUrl: 'https://github.com/jaiz-lana/your-qr-code/issues/new'
};

/**
 * Menghitung base URL aplikasi secara dinamis jika APP_CONFIG.baseUrl kosong.
 */
export function getBaseUrl() {
  if (APP_CONFIG.baseUrl) {
    return APP_CONFIG.baseUrl.replace(/\/+$/, '');
  }
  const { origin, pathname } = window.location;
  // Deteksi subfolder jika di-host di GitHub Pages (mis. /your-qr-code/generator.html)
  const cleanPath = pathname
    .replace(/\/modul\/[^/]*$/, '')
    .replace(/\/[^/]*\.html$/, '')
    .replace(/\/+$/, '');
  return `${origin}${cleanPath}`;
}

/**
 * Membangun URL QR Dinamis berdasarkan deployMode.
 */
export function buildShortUrl(code) {
  const base = getBaseUrl();
  if (APP_CONFIG.deployMode === 'firebase') {
    return `${base}/r/${encodeURIComponent(code)}`;
  }
  return `${base}/r.html?c=${encodeURIComponent(code)}`;
}

/**
 * Membangun URL Halaman Hosting berdasarkan deployMode.
 */
export function buildHostedPageUrl(slug) {
  const base = getBaseUrl();
  if (APP_CONFIG.deployMode === 'firebase') {
    return `${base}/p/${encodeURIComponent(slug)}`;
  }
  return `${base}/p.html?s=${encodeURIComponent(slug)}`;
}

/**
 * Mengecek apakah Firebase sudah dikonfigurasi.
 */
export function isFirebaseConfigured() {
  return Boolean(
    APP_CONFIG.firebaseConfig?.apiKey &&
    APP_CONFIG.firebaseConfig?.projectId
  );
}
