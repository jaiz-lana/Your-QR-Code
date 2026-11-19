/* Service Worker PWA untuk mode offline (terutama Generator QR Statis) */
const CACHE_NAME = 'your-qr-code-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './generator.html',
  './dashboard.html',
  './scan.html',
  './tentang.html',
  './assets/css/tokens.css',
  './assets/css/app.css',
  './assets/js/theme.js',
  './assets/js/i18n.js',
  './assets/js/utils.js',
  './assets/js/nav.js',
  './assets/js/qr-engine.js',
  './assets/i18n/id.json',
  './assets/i18n/en.json',
  './js/config.js',
  './js/api.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Jangan cache API Firestore / redirect dinamis
  if (url.pathname.endsWith('/r.html') || url.pathname.startsWith('/r/') || url.hostname.includes('googleapis.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
