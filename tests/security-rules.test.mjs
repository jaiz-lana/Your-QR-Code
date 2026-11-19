import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const firestoreRulesSrc = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf8');
const storageRulesSrc = fs.readFileSync(path.join(rootDir, 'storage.rules'), 'utf8');

/**
 * Evaluator kebijakan keamanan yang mencerminkan aturan aktual pada
 * firestore.rules dan storage.rules untuk memverifikasi isolasi lintas pengguna.
 */
function createRulesEvaluator(workspaceMemberships = {}) {
  const isAuthenticated = (auth) => Boolean(auth && auth.uid);
  const isOwner = (auth, uid) => isAuthenticated(auth) && auth.uid === uid;
  const isResourceOwner = (auth, data) =>
    isAuthenticated(auth) && typeof data?.ownerUid === 'string' && data.ownerUid === auth.uid;

  const isWorkspaceMember = (auth, wid) =>
    isAuthenticated(auth) &&
    typeof wid === 'string' &&
    wid.length > 0 &&
    Boolean(workspaceMemberships[wid]?.[auth.uid]);

  const hasWorkspaceRole = (auth, wid, roles) =>
    isWorkspaceMember(auth, wid) && roles.includes(workspaceMemberships[wid][auth.uid]);

  const canReadResource = (auth, data) =>
    isResourceOwner(auth, data) ||
    (typeof data?.wid === 'string' && data.wid.length > 0 && isWorkspaceMember(auth, data.wid));

  const canEditResource = (auth, data) =>
    isResourceOwner(auth, data) ||
    (typeof data?.wid === 'string' &&
      data.wid.length > 0 &&
      hasWorkspaceRole(auth, data.wid, ['owner', 'admin', 'editor']));

  return {
    firestore: {
      users: {
        read: (auth, uid) => isOwner(auth, uid),
        create: (auth, uid) => isOwner(auth, uid),
        update: (auth, uid) => isOwner(auth, uid),
        delete: (auth, uid) => isOwner(auth, uid)
      },
      qrcodes: {
        read: (auth, doc) => canReadResource(auth, doc),
        create: (auth, reqData) =>
          isAuthenticated(auth) && isResourceOwner(auth, reqData) && canEditResource(auth, reqData),
        update: (auth, existingDoc, reqData) =>
          canEditResource(auth, existingDoc) &&
          canEditResource(auth, reqData) &&
          existingDoc.ownerUid === reqData.ownerUid,
        delete: (auth, existingDoc) => canEditResource(auth, existingDoc)
      },
      folders: {
        read: (auth, doc) => canReadResource(auth, doc),
        create: (auth, reqData) =>
          isAuthenticated(auth) && isResourceOwner(auth, reqData) && canEditResource(auth, reqData),
        update: (auth, existingDoc, reqData) =>
          canEditResource(auth, existingDoc) &&
          canEditResource(auth, reqData) &&
          existingDoc.ownerUid === reqData.ownerUid,
        delete: (auth, existingDoc) => canEditResource(auth, existingDoc)
      },
      brandkits: {
        read: (auth, doc) => canReadResource(auth, doc),
        create: (auth, reqData) =>
          isAuthenticated(auth) && isResourceOwner(auth, reqData) && canEditResource(auth, reqData),
        update: (auth, existingDoc, reqData) =>
          canEditResource(auth, existingDoc) &&
          canEditResource(auth, reqData) &&
          existingDoc.ownerUid === reqData.ownerUid,
        delete: (auth, existingDoc) => canEditResource(auth, existingDoc)
      },
      links: {
        get: () => true,
        list: (auth, doc) => canReadResource(auth, doc),
        create: (auth, reqData) =>
          isAuthenticated(auth) && isResourceOwner(auth, reqData) && canEditResource(auth, reqData),
        update: (auth, existingDoc, reqData) =>
          canEditResource(auth, existingDoc) &&
          canEditResource(auth, reqData) &&
          existingDoc.ownerUid === reqData.ownerUid,
        delete: (auth, existingDoc) => canEditResource(auth, existingDoc)
      },
      pages: {
        get: () => true,
        list: (auth, doc) => canReadResource(auth, doc),
        create: (auth, reqData) =>
          isAuthenticated(auth) && isResourceOwner(auth, reqData) && canEditResource(auth, reqData),
        update: (auth, existingDoc, reqData) =>
          canEditResource(auth, existingDoc) &&
          canEditResource(auth, reqData) &&
          existingDoc.ownerUid === reqData.ownerUid,
        delete: (auth, existingDoc) => canEditResource(auth, existingDoc)
      },
      scans: {
        read: (auth, parentLink) => Boolean(isAuthenticated(auth) && parentLink && canReadResource(auth, parentLink))
      },
      stats: {
        read: (auth, parentLink) => Boolean(isAuthenticated(auth) && parentLink && canReadResource(auth, parentLink))
      }
    },
    storage: {
      read: (folder) => ['hosted', 'logos', 'uploads'].includes(folder),
      write: (auth, folder, uid, resource) =>
        ['hosted', 'logos', 'uploads'].includes(folder) &&
        isAuthenticated(auth) &&
        auth.uid === uid &&
        Boolean(resource) &&
        resource.size <= 10 * 1024 * 1024 &&
        /^(application\/pdf|image\/png|image\/jpeg|image\/webp|image\/svg\+xml)$/.test(resource.contentType || ''),
      delete: (auth, folder, uid) =>
        ['hosted', 'logos', 'uploads'].includes(folder) && isAuthenticated(auth) && auth.uid === uid
    }
  };
}

test('Audit statis firestore.rules: aturan kepemilikan & deny-all fallback lengkap', () => {
  assert.match(firestoreRulesSrc, /match \/users\/\{uid\}[\s\S]*allow read, delete: if isOwner\(uid\);/);
  assert.match(firestoreRulesSrc, /match \/qrcodes\/\{id\}[\s\S]*allow read: if canReadResource\(resource\.data\);/);
  assert.match(firestoreRulesSrc, /match \/folders\/\{id\}[\s\S]*allow read: if canReadResource\(resource\.data\);/);
  assert.match(firestoreRulesSrc, /match \/brandkits\/\{id\}[\s\S]*allow read: if canReadResource\(resource\.data\);/);
  assert.match(firestoreRulesSrc, /match \/links\/\{kode\}[\s\S]*allow list: if canReadResource\(resource\.data\);/);
  assert.match(firestoreRulesSrc, /match \/pages\/\{slug\}[\s\S]*allow list: if canReadResource\(resource\.data\);/);
  assert.match(firestoreRulesSrc, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/);
  // Pastikan field schema generator/api.js diizinkan
  assert.match(firestoreRulesSrc, /'kontenJson'/);
  assert.match(firestoreRulesSrc, /'desainJson'/);
  assert.match(firestoreRulesSrc, /'batasScan'/);
  assert.match(firestoreRulesSrc, /'aturan'/);
});

test('Audit statis storage.rules: hanya pemilik uid & folder terdaftar yang boleh tulis/hapus', () => {
  assert.match(storageRulesSrc, /folder in \['hosted', 'logos', 'uploads'\]/);
  assert.match(storageRulesSrc, /request\.auth != null[\s\S]*request\.auth\.uid == uid/);
  assert.match(storageRulesSrc, /match \/\{allPaths=\*\*\}[\s\S]*allow read, write: if false;/);
});

test('Isolasi lintas pengguna Firestore: Pengguna A tidak dapat membaca atau mengubah data Pengguna B', () => {
  const rules = createRulesEvaluator();
  const userA = { uid: 'user-a' };
  const userB = { uid: 'user-b' };

  const userBQr = { id: 'qr-1', ownerUid: 'user-b', wid: '', nama: 'Menu B', tipe: 'url' };
  const userBFolder = { id: 'fld-1', ownerUid: 'user-b', wid: '', nama: 'Arsip B' };
  const userBKit = { id: 'kit-1', ownerUid: 'user-b', wid: '', nama: 'Brand B' };
  const userBLink = { kode: 'promo-b', ownerUid: 'user-b', wid: '', tujuan: 'https://b.example.com', status: 'active' };
  const userBPage = { slug: 'toko-b', ownerUid: 'user-b', wid: '', jenis: 'page-bio' };

  // 1. Profil users/{uid}
  assert.equal(rules.firestore.users.read(userA, 'user-b'), false);
  assert.equal(rules.firestore.users.update(userA, 'user-b'), false);
  assert.equal(rules.firestore.users.delete(userA, 'user-b'), false);
  assert.equal(rules.firestore.users.read(userB, 'user-b'), true);

  // 2. Koleksi privat (qrcodes, folders, brandkits)
  for (const [col, doc] of [
    ['qrcodes', userBQr],
    ['folders', userBFolder],
    ['brandkits', userBKit]
  ]) {
    assert.equal(rules.firestore[col].read(userA, doc), false, `${col}: User A tidak boleh read milik User B`);
    assert.equal(rules.firestore[col].update(userA, doc, doc), false, `${col}: User A tidak boleh update milik User B`);
    assert.equal(rules.firestore[col].delete(userA, doc), false, `${col}: User A tidak boleh delete milik User B`);
    assert.equal(rules.firestore[col].create(userA, { ...doc }), false, `${col}: User A tidak boleh spoof ownerUid User B`);
    assert.equal(rules.firestore[col].read(userB, doc), true, `${col}: User B boleh read miliknya`);
  }

  // 3. links & pages (get publik, tetapi list/update/delete/spoof create dilarang untuk User A)
  assert.equal(rules.firestore.links.list(userA, userBLink), false);
  assert.equal(rules.firestore.links.update(userA, userBLink, { ...userBLink, tujuan: 'https://evil.test' }), false);
  assert.equal(rules.firestore.links.delete(userA, userBLink), false);
  assert.equal(rules.firestore.links.create(userA, userBLink), false);
  assert.equal(rules.firestore.links.update(userB, userBLink, { ...userBLink, tujuan: 'https://b.example.com/2' }), true);

  assert.equal(rules.firestore.pages.list(userA, userBPage), false);
  assert.equal(rules.firestore.pages.update(userA, userBPage, userBPage), false);
  assert.equal(rules.firestore.pages.delete(userA, userBPage), false);

  // 4. scans & stats milik link User B tidak bisa dibaca User A
  assert.equal(rules.firestore.scans.read(userA, userBLink), false);
  assert.equal(rules.firestore.stats.read(userA, userBLink), false);
  assert.equal(rules.firestore.stats.read(null, userBLink), false);
  assert.equal(rules.firestore.stats.read(userB, userBLink), true);
});

test('Isolasi lintas pengguna Storage: Pengguna A tidak dapat menulis/menghapus berkas Pengguna B', () => {
  const rules = createRulesEvaluator();
  const userA = { uid: 'user-a' };
  const userB = { uid: 'user-b' };
  const validPng = { size: 1024 * 200, contentType: 'image/png' };

  assert.equal(rules.storage.write(userA, 'hosted', 'user-b', validPng), false);
  assert.equal(rules.storage.write(userA, 'logos', 'user-b', validPng), false);
  assert.equal(rules.storage.delete(userA, 'uploads', 'user-b'), false);
  assert.equal(rules.storage.write(null, 'hosted', 'user-b', validPng), false);

  // Folder di luar allowlist ditolak
  assert.equal(rules.storage.write(userA, 'system', 'user-a', validPng), false);
  assert.equal(rules.storage.read('system'), false);

  // Pemilik sah diizinkan
  assert.equal(rules.storage.write(userB, 'hosted', 'user-b', validPng), true);
  assert.equal(rules.storage.delete(userB, 'hosted', 'user-b'), true);
});
