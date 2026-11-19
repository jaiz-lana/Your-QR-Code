/**
 * Lapisan Abstraksi Backend (Firebase v10 Modular + Fallback Lokal/Offline)
 * UI tidak perlu peduli apakah deployMode = "pages" atau "firebase",
 * atau apakah Firebase belum dikonfigurasi (otomatis memakai localStorage).
 */
import { APP_CONFIG, isFirebaseConfigured } from './config.js';
import { generateShortCode, sha256Hex, validateSlug } from '../assets/js/utils.js';

const LOCAL_PREFIX = 'yourqr_db_';
let fb = null; // Cache modul Firebase setelah diinisialisasi

/**
 * Muat Firebase SDK v10 dari gstatic hanya jika konfigurasi tersedia.
 */
async function ensureFirebase() {
  if (!isFirebaseConfigured()) return null;
  if (fb) return fb;

  const v = APP_CONFIG.firebaseSdkVersion || '10.14.1';
  const base = `https://www.gstatic.com/firebasejs/${v}`;

  const [appMod, authMod, fsMod, stMod] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
    import(`${base}/firebase-storage.js`)
  ]);

  const app = appMod.getApps().length
    ? appMod.getApp()
    : appMod.initializeApp(APP_CONFIG.firebaseConfig);

  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);
  const storage = stMod.getStorage(app);

  fb = { app, auth, db, storage, authMod, fsMod, stMod };
  return fb;
}

/* =========================================================================
 * HELPER PENYIMPANAN LOKAL (Mode Demo / Offline tanpa Firebase)
 * ========================================================================= */
function readLocal(col) {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PREFIX + col) || '{}');
  } catch {
    return {};
  }
}

function writeLocal(col, obj) {
  localStorage.setItem(LOCAL_PREFIX + col, JSON.stringify(obj));
}

function getLocalUser() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PREFIX + 'user') || 'null');
  } catch {
    return null;
  }
}

/* =========================================================================
 * AUTENTIKASI
 * ========================================================================= */
export async function getCurrentUser() {
  const ctx = await ensureFirebase();
  if (!ctx) return getLocalUser();
  return ctx.auth.currentUser;
}

export async function onAuthChanged(callback) {
  const ctx = await ensureFirebase();
  if (!ctx) {
    callback(getLocalUser());
    window.addEventListener('yourqr-auth-change', () => callback(getLocalUser()));
    return () => {};
  }
  return ctx.authMod.onAuthStateChanged(ctx.auth, callback);
}

export async function signInDemoLocal(nama = 'Pengguna Lokal', email = 'lokal@yourqr.id') {
  const user = { uid: 'local-user', displayName: nama, email, isLocal: true };
  localStorage.setItem(LOCAL_PREFIX + 'user', JSON.stringify(user));
  window.dispatchEvent(new Event('yourqr-auth-change'));
  return user;
}

export async function signInWithGoogle() {
  const ctx = await ensureFirebase();
  if (!ctx) return signInDemoLocal('Pengguna Google (Demo)', 'demo@yourqr.id');
  const provider = new ctx.authMod.GoogleAuthProvider();
  const res = await ctx.authMod.signInWithPopup(ctx.auth, provider);
  await ensureUserProfile(res.user);
  return res.user;
}

export async function signInWithEmail(email, password) {
  const ctx = await ensureFirebase();
  if (!ctx) return signInDemoLocal(email.split('@')[0], email);
  const res = await ctx.authMod.signInWithEmailAndPassword(ctx.auth, email, password);
  return res.user;
}

export async function registerWithEmail(nama, email, password) {
  const ctx = await ensureFirebase();
  if (!ctx) return signInDemoLocal(nama, email);
  const res = await ctx.authMod.createUserWithEmailAndPassword(ctx.auth, email, password);
  await ctx.authMod.updateProfile(res.user, { displayName: nama });
  await ensureUserProfile(res.user, nama);
  return res.user;
}

export async function sendMagicLink(email) {
  const ctx = await ensureFirebase();
  if (!ctx) {
    throw new Error('Magic link membutuhkan konfigurasi Firebase Authentication.');
  }
  const actionCodeSettings = {
    url: window.location.href,
    handleCodeInApp: true
  };
  await ctx.authMod.sendSignInLinkToEmail(ctx.auth, email, actionCodeSettings);
  localStorage.setItem('yourqr_magic_email', email);
}

export async function completeMagicLinkIfPresent() {
  const ctx = await ensureFirebase();
  if (!ctx) return null;
  if (ctx.authMod.isSignInWithEmailLink(ctx.auth, window.location.href)) {
    let email = localStorage.getItem('yourqr_magic_email');
    if (!email) {
      email = window.prompt('Masukkan email Anda untuk menyelesaikan login:') || '';
    }
    if (email) {
      const res = await ctx.authMod.signInWithEmailLink(ctx.auth, email, window.location.href);
      localStorage.removeItem('yourqr_magic_email');
      await ensureUserProfile(res.user);
      return res.user;
    }
  }
  return null;
}

export async function signOut() {
  const ctx = await ensureFirebase();
  if (!ctx) {
    localStorage.removeItem(LOCAL_PREFIX + 'user');
    window.dispatchEvent(new Event('yourqr-auth-change'));
    return;
  }
  await ctx.authMod.signOut(ctx.auth);
}

async function ensureUserProfile(user, namaOverride) {
  const ctx = await ensureFirebase();
  if (!ctx || !user) return;
  const { doc, getDoc, setDoc, serverTimestamp } = ctx.fsMod;
  const ref = doc(ctx.db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      nama: namaOverride || user.displayName || 'Pengguna',
      email: user.email || '',
      dibuat: serverTimestamp(),
      workspaceDefault: ''
    });
  }
}

/* =========================================================================
 * UPLOAD FILE KE FIREBASE STORAGE (Batas 10 MB + Validasi MIME)
 * ========================================================================= */
export async function uploadFile(file, folder = 'uploads') {
  if (!file) throw new Error('Berkas tidak ditemukan.');
  if (file.size > APP_CONFIG.limits.maxUploadBytes) {
    throw new Error('Ukuran berkas melebihi batas maksimal 10 MB.');
  }
  if (!APP_CONFIG.limits.allowedUploadMime.includes(file.type)) {
    throw new Error('Format berkas tidak diizinkan (gunakan PDF, PNG, JPG, WEBP, atau SVG).');
  }

  const ctx = await ensureFirebase();
  if (!ctx) {
    // Fallback lokal menggunakan Data URL (hanya untuk file kecil < 1 MB di mode demo)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result, path: 'local' });
      reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
      reader.readAsDataURL(file);
    });
  }

  const user = ctx.auth.currentUser;
  if (!user) throw new Error('Silakan masuk terlebih dahulu untuk mengunggah berkas.');

  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `${folder}/${user.uid}/${safeName}`;
  const storageRef = ctx.stMod.ref(ctx.storage, path);
  await ctx.stMod.uploadBytes(storageRef, file, { contentType: file.type });
  const url = await ctx.stMod.getDownloadURL(storageRef);
  return { url, path };
}

/* =========================================================================
 * QR DINAMIS & SLUG VALIDATION
 * ========================================================================= */
export async function checkSlugAvailable(rawSlug) {
  const check = validateSlug(rawSlug);
  if (!check.ok) return check;

  const ctx = await ensureFirebase();
  if (!ctx) {
    const links = readLocal('links');
    return {
      ok: !links[check.slug],
      slug: check.slug,
      reason: links[check.slug] ? 'Slug sudah dipakai. Pilih nama lain.' : ''
    };
  }

  const { doc, getDoc } = ctx.fsMod;
  const snap = await getDoc(doc(ctx.db, 'links', check.slug));
  return {
    ok: !snap.exists(),
    slug: check.slug,
    reason: snap.exists() ? 'Slug sudah dipakai. Pilih nama lain.' : ''
  };
}

export async function saveDynamicQr({
  id = null,
  nama,
  tipe,
  kontenJson,
  desainJson,
  tujuan,
  customSlug = '',
  status = 'active',
  mulai = null,
  berakhir = null,
  batasScan = 0,
  password = '',
  aturan = {},
  pesanDijeda = 'Maaf, QR Code ini sedang dijeda atau telah kedaluwarsa.',
  folderId = '',
  tags = [],
  wid = ''
}) {
  const ctx = await ensureFirebase();
  const user = await getCurrentUser();
  const ownerUid = user?.uid || 'local-user';

  let kode = customSlug ? customSlug.trim().toLowerCase() : '';
  if (kode) {
    const valid = validateSlug(kode);
    if (!valid.ok) throw new Error(valid.reason);
    kode = valid.slug;
  } else {
    kode = generateShortCode(7);
  }

  // Gunakan salt berbasis kode agar passwordHash tahan terhadap rainbow table
  const passwordHash = password ? await sha256Hex(`${kode}:${password}`) : '';

  if (!ctx) {
    const qrs = readLocal('qrcodes');
    const links = readLocal('links');
    const qrId = id || `qr_${Date.now()}`;
    const existing = qrs[qrId];
    const finalKode = existing?.kode || kode;

    if (!existing && links[finalKode]) {
      throw new Error('Kode/slug sudah dipakai.');
    }

    const nowIso = new Date().toISOString();
    qrs[qrId] = {
      id: qrId,
      ownerUid,
      wid,
      nama,
      tipe,
      kode: finalKode,
      kontenJson,
      desainJson,
      folderId,
      tags,
      status,
      totalScan: existing?.totalScan || 0,
      dibuat: existing?.dibuat || nowIso,
      diubah: nowIso
    };
    links[finalKode] = {
      qrId,
      ownerUid,
      wid,
      tujuan,
      status,
      mulai,
      berakhir,
      batasScan: Number(batasScan) || 0,
      aturan,
      pesanDijeda,
      passwordHash: password ? passwordHash : (links[finalKode]?.passwordHash || '')
    };
    writeLocal('qrcodes', qrs);
    writeLocal('links', links);
    return { qrId, kode: finalKode };
  }

  if (!user) throw new Error('Silakan masuk untuk menyimpan QR Dinamis.');
  const { doc, getDoc, writeBatch, serverTimestamp } = ctx.fsMod;

  const qrId = id || doc(ctx.fsMod.collection(ctx.db, 'qrcodes')).id;
  const qrRef = doc(ctx.db, 'qrcodes', qrId);
  const existingSnap = id ? await getDoc(qrRef) : null;
  const finalKode = existingSnap?.exists() ? existingSnap.data().kode : kode;

  if (!existingSnap?.exists()) {
    const linkSnap = await getDoc(doc(ctx.db, 'links', finalKode));
    if (linkSnap.exists()) {
      throw new Error('Slug sudah dipakai. Gunakan slug lain.');
    }
  }

  const batch = writeBatch(ctx.db);
  batch.set(qrRef, {
    ownerUid,
    wid,
    nama,
    tipe,
    kode: finalKode,
    kontenJson,
    desainJson,
    folderId,
    tags,
    status,
    dibuat: existingSnap?.exists() ? existingSnap.data().dibuat : serverTimestamp(),
    diubah: serverTimestamp()
  }, { merge: true });

  const linkPayload = {
    qrId,
    ownerUid,
    wid,
    tujuan,
    status,
    mulai: mulai || null,
    berakhir: berakhir || null,
    batasScan: Number(batasScan) || 0,
    aturan: aturan || {},
    pesanDijeda
  };
  if (password) {
    linkPayload.passwordHash = passwordHash;
  }
  batch.set(doc(ctx.db, 'links', finalKode), linkPayload, { merge: true });

  await batch.commit();
  return { qrId, kode: finalKode };
}

export async function listQrs({ limitCount = 50 } = {}) {
  const ctx = await ensureFirebase();
  const user = await getCurrentUser();
  if (!ctx) {
    const qrs = Object.values(readLocal('qrcodes'));
    return qrs.sort((a, b) => String(b.diubah).localeCompare(String(a.diubah)));
  }
  if (!user) return [];
  const { collection, query, where, orderBy, limit, getDocs } = ctx.fsMod;
  const q = query(
    collection(ctx.db, 'qrcodes'),
    where('ownerUid', '==', user.uid),
    orderBy('diubah', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getQrById(qrId) {
  if (!qrId) return null;
  const ctx = await ensureFirebase();
  if (!ctx) {
    const qrs = readLocal('qrcodes');
    const links = readLocal('links');
    const qr = qrs[qrId];
    if (!qr) return null;
    return { ...qr, link: links[qr.kode] || null };
  }
  const { doc, getDoc } = ctx.fsMod;
  const qrSnap = await getDoc(doc(ctx.db, 'qrcodes', qrId));
  if (!qrSnap.exists()) return null;
  const qr = { id: qrSnap.id, ...qrSnap.data() };
  const linkSnap = qr.kode ? await getDoc(doc(ctx.db, 'links', qr.kode)) : null;
  return { ...qr, link: linkSnap?.exists() ? linkSnap.data() : null };
}

export async function updateQrStatus(qrId, kode, newStatus) {
  const ctx = await ensureFirebase();
  if (!ctx) {
    const qrs = readLocal('qrcodes');
    const links = readLocal('links');
    if (qrs[qrId]) qrs[qrId].status = newStatus;
    if (links[kode]) links[kode].status = newStatus;
    writeLocal('qrcodes', qrs);
    writeLocal('links', links);
    return;
  }
  const { doc, writeBatch, serverTimestamp } = ctx.fsMod;
  const batch = writeBatch(ctx.db);
  batch.update(doc(ctx.db, 'qrcodes', qrId), { status: newStatus, diubah: serverTimestamp() });
  batch.update(doc(ctx.db, 'links', kode), { status: newStatus });
  await batch.commit();
}

export async function deleteQr(qrId, kode) {
  const ctx = await ensureFirebase();
  if (!ctx) {
    const qrs = readLocal('qrcodes');
    const links = readLocal('links');
    delete qrs[qrId];
    delete links[kode];
    writeLocal('qrcodes', qrs);
    writeLocal('links', links);
    return;
  }
  const { doc, writeBatch } = ctx.fsMod;
  const batch = writeBatch(ctx.db);
  batch.delete(doc(ctx.db, 'qrcodes', qrId));
  if (kode) batch.delete(doc(ctx.db, 'links', kode));
  await batch.commit();
}

/* =========================================================================
 * REDIRECT & PENCATATAN SCAN HEMAT KUOTA (Batched Write: scans + stats)
 * ========================================================================= */
export async function resolveLink(kode) {
  const ctx = await ensureFirebase();
  if (!ctx) {
    const links = readLocal('links');
    return links[kode] || null;
  }
  const { doc, getDoc } = ctx.fsMod;
  const snap = await getDoc(doc(ctx.db, 'links', kode));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function recordScan(kode, meta) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const statId = `${kode}_${today}`;
  const hashUnik = await sha256Hex(`${kode}_${today}_${navigator.userAgent}_${screen.width}`);

  const ctx = await ensureFirebase();
  if (!ctx) {
    const scans = readLocal('scans');
    const stats = readLocal('stats');
    const qrs = readLocal('qrcodes');
    const links = readLocal('links');
    const scanId = `sc_${Date.now()}`;
    scans[scanId] = { kode, waktu: new Date().toISOString(), ...meta, hashUnik };
    const st = stats[statId] || { kode, tanggal: today, total: 0, unik: 0, perangkat: {}, os: {} };
    st.total += 1;
    st.perangkat[meta.perangkat] = (st.perangkat[meta.perangkat] || 0) + 1;
    st.os[meta.os] = (st.os[meta.os] || 0) + 1;
    stats[statId] = st;
    if (links[kode]) {
      links[kode].totalScan = (links[kode].totalScan || 0) + 1;
    }
    Object.values(qrs).forEach((qr) => {
      if (qr.kode === kode) qr.totalScan = (qr.totalScan || 0) + 1;
    });
    writeLocal('scans', scans);
    writeLocal('stats', stats);
    writeLocal('links', links);
    writeLocal('qrcodes', qrs);
    return;
  }

  const { doc, collection, writeBatch, increment, serverTimestamp } = ctx.fsMod;
  const batch = writeBatch(ctx.db);
  const scanRef = doc(collection(ctx.db, 'scans'));
  batch.set(scanRef, {
    kode,
    waktu: serverTimestamp(),
    os: meta.os || 'Lainnya',
    perangkat: meta.perangkat || 'Desktop',
    browser: meta.browser || 'Lainnya',
    negara: 'ID',
    kota: '-',
    bahasa: meta.bahasa || 'id',
    referrer: meta.referrer || 'langsung',
    hashUnik
  });

  const statRef = doc(ctx.db, 'stats', statId);
  batch.set(statRef, {
    kode,
    tanggal: today,
    total: increment(1),
    [`perangkat.${meta.perangkat || 'Desktop'}`]: increment(1)
  }, { merge: true });

  await batch.commit();
}

export async function getLinkStats(kode) {
  const ctx = await ensureFirebase();
  if (!ctx) {
    const stats = Object.values(readLocal('stats')).filter((s) => s.kode === kode);
    return stats.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }
  const { collection, query, where, orderBy, limit, getDocs } = ctx.fsMod;
  const q = query(
    collection(ctx.db, 'stats'),
    where('kode', '==', kode),
    orderBy('tanggal', 'asc'),
    limit(60)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

const GLOBAL_STATS_CACHE_KEY = 'yourqr_stats_total_cache';
const GLOBAL_STATS_TTL_MS = 10 * 60 * 1000;

export async function getGlobalTotalScans() {
  try {
    const cached = JSON.parse(localStorage.getItem(GLOBAL_STATS_CACHE_KEY) || 'null');
    if (cached && typeof cached.total === 'number' && (Date.now() - cached.ts) < GLOBAL_STATS_TTL_MS) {
      return cached.total;
    }
  } catch {
    // Abaikan cache rusak
  }

  let total = 0;
  try {
    const ctx = await ensureFirebase();
    if (!ctx) {
      total = Object.values(readLocal('stats')).reduce((s, r) => s + (Number(r.total) || 0), 0);
    } else {
      const { collection, query, limit, getDocs } = ctx.fsMod;
      const snap = await getDocs(query(collection(ctx.db, 'stats'), limit(500)));
      snap.forEach((d) => {
        total += Number(d.data()?.total) || 0;
      });
    }
  } catch {
    total = 0;
  }

  try {
    localStorage.setItem(GLOBAL_STATS_CACHE_KEY, JSON.stringify({ total, ts: Date.now() }));
  } catch {
    // Abaikan jika storage diblokir
  }
  return total;
}

/* =========================================================================
 * HALAMAN HOSTING (pages/{slug})
 * ========================================================================= */
export async function saveHostedPage(slug, jenis, kontenJson) {
  const valid = validateSlug(slug);
  if (!valid.ok) throw new Error(valid.reason);
  const user = await getCurrentUser();
  const ownerUid = user?.uid || 'local-user';

  const ctx = await ensureFirebase();
  if (!ctx) {
    const pages = readLocal('pages');
    pages[valid.slug] = { slug: valid.slug, jenis, kontenJson, ownerUid, diubah: new Date().toISOString() };
    writeLocal('pages', pages);
    return valid.slug;
  }
  const { doc, setDoc, serverTimestamp } = ctx.fsMod;
  await setDoc(doc(ctx.db, 'pages', valid.slug), {
    jenis,
    kontenJson,
    ownerUid,
    diubah: serverTimestamp()
  }, { merge: true });
  return valid.slug;
}

export async function getHostedPage(slug) {
  const ctx = await ensureFirebase();
  if (!ctx) {
    const pages = readLocal('pages');
    return pages[slug] || null;
  }
  const { doc, getDoc } = ctx.fsMod;
  const snap = await getDoc(doc(ctx.db, 'pages', slug));
  return snap.exists() ? { slug: snap.id, ...snap.data() } : null;
}

/* =========================================================================
 * FOLDER, BRAND KIT, & WORKSPACE
 * ========================================================================= */
export async function listUserCollection(colName) {
  const ctx = await ensureFirebase();
  const user = await getCurrentUser();
  if (!ctx) return Object.values(readLocal(colName));
  if (!user) return [];
  const { collection, query, where, getDocs } = ctx.fsMod;
  const q = query(collection(ctx.db, colName), where('ownerUid', '==', user.uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveUserCollection(colName, id, payload) {
  const user = await getCurrentUser();
  const ownerUid = user?.uid || 'local-user';
  const ctx = await ensureFirebase();
  if (!ctx) {
    const data = readLocal(colName);
    const docId = id || `${colName}_${Date.now()}`;
    data[docId] = { id: docId, ownerUid, ...payload };
    writeLocal(colName, data);
    return docId;
  }
  const { doc, collection, setDoc, serverTimestamp } = ctx.fsMod;
  const ref = id ? doc(ctx.db, colName, id) : doc(collection(ctx.db, colName));
  const payloadWithTs = { ownerUid, ...payload, diubah: serverTimestamp() };
  if (!id) payloadWithTs.dibuat = serverTimestamp();
  await setDoc(ref, payloadWithTs, { merge: true });
  return ref.id;
}

/* =========================================================================
 * HELPER MODUL KHUSUS (Presensi, Form, Tiket, Sertifikat, Polling, UMKM)
 * ========================================================================= */
export async function saveModuleDoc(colName, docId, payload) {
  const user = await getCurrentUser();
  const ownerUid = user?.uid || 'local-user';
  const ctx = await ensureFirebase();
  if (!ctx) {
    const data = readLocal(colName);
    const id = docId || `${colName}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    data[id] = { id, ownerUid, ...payload, dibuat: data[id]?.dibuat || new Date().toISOString() };
    writeLocal(colName, data);
    return id;
  }
  const { doc, collection, setDoc, serverTimestamp } = ctx.fsMod;
  const ref = docId ? doc(ctx.db, colName, docId) : doc(collection(ctx.db, colName));
  await setDoc(ref, { ownerUid, ...payload, dibuat: serverTimestamp() }, { merge: true });
  return ref.id;
}

export async function getModuleDoc(colName, docId) {
  const ctx = await ensureFirebase();
  if (!ctx) {
    return readLocal(colName)[docId] || null;
  }
  const { doc, getDoc } = ctx.fsMod;
  const snap = await getDoc(doc(ctx.db, colName, docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function queryModuleDocs(colName, field, value) {
  const ctx = await ensureFirebase();
  if (!ctx) {
    return Object.values(readLocal(colName)).filter((item) => item[field] === value);
  }
  const { collection, query, where, limit, getDocs } = ctx.fsMod;
  const q = query(collection(ctx.db, colName), where(field, '==', value), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
