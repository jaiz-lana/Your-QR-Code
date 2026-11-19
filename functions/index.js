/**
 * Cloud Functions Opsional (Paket Firebase Blaze)
 * - redirect: HTTP 302 asli + pencatatan scan sisi server (tanpa menyimpan IP mentah)
 * - verifyQrPassword: Verifikasi kata sandi QR di sisi server
 */
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');

initializeApp();
const db = getFirestore();

function isSafeHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

exports.redirect = onRequest({ region: 'asia-southeast2' }, async (req, res) => {
  const parts = req.path.split('/').filter(Boolean);
  const kode = (parts[parts.length - 1] || '').toLowerCase();
  if (!kode || kode === 'r') {
    return res.status(404).send('Kode QR tidak ditemukan.');
  }

  const linkSnap = await db.collection('links').doc(kode).get();
  if (!linkSnap.exists) {
    return res.status(404).send('QR Code tidak terdaftar.');
  }

  const link = linkSnap.data();
  if (link.status !== 'active') {
    return res.status(410).send(link.pesanDijeda || 'QR Code sedang dijeda atau kedaluwarsa.');
  }

  // Jika ada password, arahkan ke r.html untuk prompt verifikasi aman
  if (link.passwordHash) {
    return res.redirect(302, `/r.html?c=${encodeURIComponent(kode)}`);
  }

  const ua = req.get('user-agent') || '';
  let target = link.tujuan;
  if (/iPhone|iPad|iPod/i.test(ua) && link.aturan?.ios) target = link.aturan.ios;
  else if (/Android/i.test(ua) && link.aturan?.android) target = link.aturan.android;

  if (!isSafeHttpUrl(target)) {
    return res.status(400).send('Tautan tujuan tidak valid.');
  }

  // Catat scan tanpa menyimpan IP mentah (pakai hash harian anonim)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const ip = req.ip || '0.0.0.0';
  const hashUnik = crypto.createHash('sha256').update(`${kode}_${today}_${ip}_${ua}`).digest('hex');

  const batch = db.batch();
  batch.set(db.collection('scans').doc(), {
    kode,
    waktu: FieldValue.serverTimestamp(),
    os: /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : 'Desktop',
    perangkat: /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Ponsel' : 'Desktop',
    browser: 'Web',
    negara: req.get('x-appengine-country') || 'ID',
    kota: '-',
    bahasa: (req.get('accept-language') || 'id').slice(0, 5),
    referrer: req.get('referer') || 'langsung',
    hashUnik
  });
  batch.set(db.collection('stats').doc(`${kode}_${today}`), {
    kode,
    tanggal: today,
    total: FieldValue.increment(1)
  }, { merge: true });

  await batch.commit();
  return res.redirect(302, target);
});
