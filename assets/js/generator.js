/**
 * Logika Halaman Generator QR Code (Statis, Dinamis, Halaman Hosting, Bulk CSV, & Cetak)
 */
import { initShell } from './nav.js';
import { icon } from './icons.js';
import { buildHostedPageUrl, buildShortUrl } from '../../js/config.js';
import {
  checkSlugAvailable,
  listUserCollection,
  saveDynamicQr,
  saveHostedPage,
  saveUserCollection,
  uploadFile
} from '../../js/api.js';
import {
  BUILTIN_LOGOS,
  QR_PRESETS,
  copyQrToClipboard,
  createQrInstance,
  evaluateReadability,
  exportQrFile,
  getQrDataUrl
} from './qr-engine.js';
import { escapeHtml, sanitizeUrl, showToast } from './utils.js';

initShell({ active: 'generator', basePrefix: '.' });

/* =========================================================================
 * DEFINISI TIPE KONTEN QR (STATIS + DINAMIS HOSTED PAGE)
 * ========================================================================= */
const CONTENT_TYPES = [
  // Statis
  { id: 'url', label: 'Website URL', icon: 'globe', group: 'static' },
  { id: 'wa', label: 'WhatsApp', icon: 'messageCircle', group: 'static' },
  { id: 'wifi', label: 'WiFi', icon: 'wifi', group: 'static' },
  { id: 'vcard', label: 'Kontak vCard', icon: 'contact', group: 'static' },
  { id: 'text', label: 'Teks Biasa', icon: 'fileText', group: 'static' },
  { id: 'email', label: 'Email', icon: 'mail', group: 'static' },
  { id: 'tel', label: 'Telepon', icon: 'phone', group: 'static' },
  { id: 'sms', label: 'SMS', icon: 'messageCircle', group: 'static' },
  { id: 'geo', label: 'Lokasi Maps', icon: 'mapPin', group: 'static' },
  { id: 'ical', label: 'Kalender Event', icon: 'calendar', group: 'static' },
  { id: 'social', label: 'Sosial Media', icon: 'share2', group: 'static' },
  { id: 'qris', label: 'QRIS / Bayar', icon: 'creditCard', group: 'static' },
  // Dinamis + Halaman Hosting
  { id: 'page-menu', label: 'Menu Digital', icon: 'utensils', group: 'hosted' },
  { id: 'page-bio', label: 'Link-in-Bio', icon: 'link2', group: 'hosted' },
  { id: 'page-pdf', label: 'PDF / Dokumen', icon: 'fileText', group: 'hosted' },
  { id: 'page-event', label: 'Event & RSVP', icon: 'ticket', group: 'hosted' },
  { id: 'page-coupon', label: 'Kupon Promo', icon: 'tag', group: 'hosted' },
  { id: 'page-catalog', label: 'Katalog Produk', icon: 'shoppingBag', group: 'hosted' }
];

const state = {
  isDynamic: false,
  type: 'url',
  fields: { url: 'https://yourqrcode.pages.dev' },
  design: {
    dotType: 'rounded',
    dotColor: '#0f172a',
    dotColor2: '#4f46e5',
    useGradient: false,
    bgColor: '#ffffff',
    transparentBg: false,
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'dot',
    errorCorrection: 'M',
    image: '',
    imageSize: 0.32,
    imageMargin: 6,
    margin: 12,
    frameText: '',
    size: 260
  },
  activeShortUrl: '',
  bulkRows: []
};

let qrInstance = null;
let renderTimer = null;

/* =========================================================================
 * RENDER TIPE KONTEN & FORM INPUT
 * ========================================================================= */
const typeGridEl = document.getElementById('type-grid');
const fieldsEl = document.getElementById('content-fields');
const toggleDynamicEl = document.getElementById('toggle-dynamic');
const dynamicBadgeEl = document.getElementById('dynamic-badge');
const dynamicOptionsEl = document.getElementById('dynamic-options');

function renderTypeGrid() {
  typeGridEl.innerHTML = CONTENT_TYPES.map((t) => `
    <button type="button" class="type-chip ${state.type === t.id ? 'active' : ''}" data-type="${t.id}">
      <span>${icon(t.icon, 20)}</span>
      <span>${t.label}</span>
    </button>
  `).join('');

  typeGridEl.querySelectorAll('.type-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.type = btn.dataset.type;
      if (state.type.startsWith('page-') && !state.isDynamic) {
        state.isDynamic = true;
        toggleDynamicEl.checked = true;
        syncDynamicUi();
      }
      renderTypeGrid();
      renderContentFields();
      scheduleRender();
    });
  });
}

function syncDynamicUi() {
  dynamicOptionsEl.style.display = state.isDynamic ? 'grid' : 'none';
  dynamicBadgeEl.textContent = state.isDynamic ? 'Dinamis (Dilacak)' : 'Statis (Offline)';
  dynamicBadgeEl.className = `badge ${state.isDynamic ? 'badge-primary' : 'badge-neutral'}`;
}

toggleDynamicEl.addEventListener('change', () => {
  state.isDynamic = toggleDynamicEl.checked;
  syncDynamicUi();
  scheduleRender();
});

function renderContentFields() {
  const f = state.fields;
  let html = '';

  switch (state.type) {
    case 'url':
      html = `
        <div class="field">
          <label for="f-url">Alamat Website (URL)</label>
          <input type="url" id="f-url" class="input" data-field="url" value="${escapeHtml(f.url || 'https://')}" placeholder="https://contoh.sch.id">
        </div>`;
      break;
    case 'wa':
      html = `
        <div class="form-row form-row-2">
          <div class="field">
            <label for="f-wa-num">Nomor WhatsApp (awalan 62)</label>
            <input type="tel" id="f-wa-num" class="input" data-field="waNum" value="${escapeHtml(f.waNum || '')}" placeholder="628123456789">
          </div>
          <div class="field">
            <label for="f-wa-msg">Pesan Otomatis</label>
            <input type="text" id="f-wa-msg" class="input" data-field="waMsg" value="${escapeHtml(f.waMsg || '')}" placeholder="Halo, saya ingin pesan...">
          </div>
        </div>`;
      break;
    case 'wifi':
      html = `
        <div class="form-row form-row-3">
          <div class="field">
            <label for="f-ssid">Nama WiFi (SSID)</label>
            <input type="text" id="f-ssid" class="input" data-field="ssid" value="${escapeHtml(f.ssid || '')}" placeholder="WiFi_Sekolah">
          </div>
          <div class="field">
            <label for="f-wpass">Kata Sandi WiFi</label>
            <input type="text" id="f-wpass" class="input" data-field="wpass" value="${escapeHtml(f.wpass || '')}">
          </div>
          <div class="field">
            <label for="f-wenc">Keamanan</label>
            <select id="f-wenc" class="select" data-field="wenc">
              <option value="WPA" ${f.wenc === 'WPA' ? 'selected' : ''}>WPA/WPA2</option>
              <option value="WEP" ${f.wenc === 'WEP' ? 'selected' : ''}>WEP</option>
              <option value="nopass" ${f.wenc === 'nopass' ? 'selected' : ''}>Tanpa Sandi</option>
            </select>
          </div>
        </div>`;
      break;
    case 'vcard':
      html = `
        <div class="form-row form-row-2">
          <div class="field"><label>Nama Lengkap</label><input class="input" data-field="vcName" value="${escapeHtml(f.vcName || '')}" placeholder="Budi Santoso"></div>
          <div class="field"><label>Nomor HP</label><input class="input" data-field="vcPhone" value="${escapeHtml(f.vcPhone || '')}" placeholder="+62812..."></div>
          <div class="field"><label>Email</label><input class="input" data-field="vcEmail" value="${escapeHtml(f.vcEmail || '')}" placeholder="budi@kampus.ac.id"></div>
          <div class="field"><label>Organisasi / Usaha</label><input class="input" data-field="vcOrg" value="${escapeHtml(f.vcOrg || '')}" placeholder="BEM / Kedai Kopi"></div>
        </div>`;
      break;
    case 'text':
      html = `
        <div class="field">
          <label for="f-text">Isi Teks</label>
          <textarea id="f-text" class="textarea" data-field="text" placeholder="Tulis catatan, kode kupon, atau pengumuman...">${escapeHtml(f.text || '')}</textarea>
        </div>`;
      break;
    case 'email':
      html = `
        <div class="form-row form-row-2">
          <div class="field"><label>Alamat Email Tujuan</label><input type="email" class="input" data-field="emailTo" value="${escapeHtml(f.emailTo || '')}"></div>
          <div class="field"><label>Subjek Email</label><input class="input" data-field="emailSub" value="${escapeHtml(f.emailSub || '')}"></div>
        </div>`;
      break;
    case 'tel':
      html = `<div class="field"><label>Nomor Telepon</label><input type="tel" class="input" data-field="tel" value="${escapeHtml(f.tel || '')}" placeholder="+62812..."></div>`;
      break;
    case 'sms':
      html = `
        <div class="form-row form-row-2">
          <div class="field"><label>Nomor Tujuan</label><input type="tel" class="input" data-field="smsNum" value="${escapeHtml(f.smsNum || '')}"></div>
          <div class="field"><label>Pesan SMS</label><input class="input" data-field="smsMsg" value="${escapeHtml(f.smsMsg || '')}"></div>
        </div>`;
      break;
    case 'geo':
      html = `
        <div class="form-row form-row-2">
          <div class="field"><label>Latitude</label><input class="input" data-field="lat" value="${escapeHtml(f.lat || '-6.200000')}"></div>
          <div class="field"><label>Longitude</label><input class="input" data-field="lng" value="${escapeHtml(f.lng || '106.816666')}"></div>
        </div>`;
      break;
    case 'ical':
      html = `
        <div class="form-row form-row-2">
          <div class="field"><label>Judul Acara</label><input class="input" data-field="evTitle" value="${escapeHtml(f.evTitle || '')}" placeholder="Rapat Kerja Ormawa"></div>
          <div class="field"><label>Lokasi</label><input class="input" data-field="evLoc" value="${escapeHtml(f.evLoc || '')}" placeholder="Aula Kampus"></div>
          <div class="field"><label>Mulai</label><input type="datetime-local" class="input" data-field="evStart" value="${escapeHtml(f.evStart || '')}"></div>
          <div class="field"><label>Selesai</label><input type="datetime-local" class="input" data-field="evEnd" value="${escapeHtml(f.evEnd || '')}"></div>
        </div>`;
      break;
    case 'social':
      html = `
        <div class="form-row form-row-2">
          <div class="field">
            <label>Platform</label>
            <select class="select" data-field="socPlat">
              <option value="https://instagram.com/">Instagram</option>
              <option value="https://tiktok.com/@">TikTok</option>
              <option value="https://youtube.com/@">YouTube</option>
              <option value="https://t.me/">Telegram</option>
              <option value="https://linkedin.com/in/">LinkedIn</option>
            </select>
          </div>
          <div class="field"><label>Username (tanpa @)</label><input class="input" data-field="socUser" value="${escapeHtml(f.socUser || '')}" placeholder="username_anda"></div>
        </div>`;
      break;
    case 'qris':
      html = `
        <div class="field">
          <label>String Payload QRIS atau Tautan Pembayaran</label>
          <textarea class="textarea" data-field="qrisRaw" placeholder="Tempel string QRIS statis/dinamis atau URL halaman bayar...">${escapeHtml(f.qrisRaw || '')}</textarea>
        </div>`;
      break;
    default:
      // Tipe Halaman Hosting Dinamis (page-menu, page-bio, page-pdf, page-event, page-coupon, page-catalog)
      html = `
        <div class="form-row form-row-2">
          <div class="field"><label>Judul Halaman</label><input class="input" data-field="pgTitle" value="${escapeHtml(f.pgTitle || '')}" placeholder="Contoh: Menu Kedai / Profil HIMA"></div>
          <div class="field"><label>Subjudul / Deskripsi Singkat</label><input class="input" data-field="pgDesc" value="${escapeHtml(f.pgDesc || '')}" placeholder="Buka setiap hari 08.00–21.00"></div>
        </div>
        <div class="field">
          <label>${state.type === 'page-pdf' ? 'Unggah PDF/Gambar (maks 10 MB) atau Tempel URL' : 'Daftar Item / Tautan (satu per baris: Nama | Detail/Harga/URL)'}</label>
          ${state.type === 'page-pdf' ? '<input type="file" id="f-pg-upload" class="input" accept="application/pdf,image/*" style="margin-bottom:0.5rem;">' : ''}
          <textarea class="textarea" data-field="pgItems" placeholder="${state.type === 'page-pdf' ? 'https://...' : 'Es Kopi Susu | 15000\nRoti Bakar Coklat | 12000'}">${escapeHtml(f.pgItems || '')}</textarea>
        </div>`;
      break;
  }

  fieldsEl.innerHTML = html;
  fieldsEl.querySelectorAll('[data-field]').forEach((el) => {
    el.addEventListener('input', () => {
      state.fields[el.dataset.field] = el.value;
      scheduleRender();
    });
  });

  document.getElementById('f-pg-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('Mengunggah berkas...', 'success');
      const res = await uploadFile(file, 'hosted');
      state.fields.pgItems = res.url;
      const ta = fieldsEl.querySelector('[data-field="pgItems"]');
      if (ta) ta.value = res.url;
      showToast('Berkas berhasil diunggah!', 'success');
      scheduleRender();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

function buildStaticPayload() {
  const f = state.fields;
  switch (state.type) {
    case 'url': return sanitizeUrl(f.url) || 'https://yourqrcode.pages.dev';
    case 'wa': {
      const num = String(f.waNum || '').replace(/\D/g, '');
      const msg = encodeURIComponent(f.waMsg || '');
      return `https://wa.me/${num}${msg ? `?text=${msg}` : ''}`;
    }
    case 'wifi':
      return `WIFI:T:${f.wenc || 'WPA'};S:${f.ssid || ''};P:${f.wpass || ''};;`;
    case 'vcard':
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${f.vcName || ''}\nORG:${f.vcOrg || ''}\nTEL:${f.vcPhone || ''}\nEMAIL:${f.vcEmail || ''}\nEND:VCARD`;
    case 'text': return f.text || 'Your QR Code';
    case 'email': return `mailto:${f.emailTo || ''}?subject=${encodeURIComponent(f.emailSub || '')}`;
    case 'tel': return `tel:${f.tel || ''}`;
    case 'sms': return `SMSTO:${f.smsNum || ''}:${f.smsMsg || ''}`;
    case 'geo': return `geo:${f.lat || '0'},${f.lng || '0'}`;
    case 'ical': {
      const fmt = (v) => String(v || '').replace(/[-:]/g, '') + '00';
      return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${f.evTitle || 'Acara'}\nLOCATION:${f.evLoc || ''}\nDTSTART:${fmt(f.evStart)}\nDTEND:${fmt(f.evEnd)}\nEND:VEVENT\nEND:VCALENDAR`;
    }
    case 'social': return `${f.socPlat || 'https://instagram.com/'}${f.socUser || ''}`;
    case 'qris': return f.qrisRaw || 'https://yourqrcode.pages.dev';
    default: return state.activeShortUrl || buildHostedPageUrl('pratinjau');
  }
}

function getEffectiveQrData() {
  if (state.isDynamic && state.activeShortUrl) return state.activeShortUrl;
  return buildStaticPayload();
}

/* =========================================================================
 * STEPPER & TAB MODE
 * ========================================================================= */
function setStep(stepNum) {
  document.querySelectorAll('.step-btn').forEach((b) => b.classList.toggle('active', b.dataset.step === String(stepNum)));
  document.querySelectorAll('.step-panel').forEach((p) => {
    p.hidden = p.id !== `step-${stepNum}`;
  });
}

document.querySelectorAll('.step-btn').forEach((b) => b.addEventListener('click', () => setStep(b.dataset.step)));
document.querySelectorAll('[data-go-step]').forEach((b) => b.addEventListener('click', () => setStep(b.dataset.goStep)));

document.querySelectorAll('[data-gen-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-gen-mode]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.genMode;
    document.getElementById('panel-single').hidden = mode !== 'single';
    document.getElementById('panel-bulk').hidden = mode !== 'bulk';
    document.getElementById('panel-print').hidden = mode !== 'print';
    if (mode === 'print') renderPrintTemplate();
  });
});

/* =========================================================================
 * KUSTOMISASI DESAIN, PRESET, & BRAND KIT
 * ========================================================================= */
function renderPresets() {
  const container = document.getElementById('preset-list');
  container.innerHTML = Object.entries(QR_PRESETS).map(([key, p]) => `
    <button type="button" class="btn btn-secondary btn-sm" data-preset="${key}">${p.label}</button>
  `).join('');

  container.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = QR_PRESETS[btn.dataset.preset];
      Object.assign(state.design, {
        dotColor: p.dotColor,
        dotType: p.dotType,
        bgColor: p.bgColor,
        transparentBg: false,
        cornerSquareType: p.cornerSquareType,
        cornerDotType: p.cornerDotType,
        frameText: p.frameText
      });
      syncDesignInputs();
      scheduleRender();
    });
  });
}

function syncDesignInputs() {
  const d = state.design;
  document.getElementById('des-dot-type').value = d.dotType;
  document.getElementById('des-dot-color').value = d.dotColor;
  document.getElementById('des-dot-color2').value = d.dotColor2;
  document.getElementById('des-use-grad').checked = d.useGradient;
  document.getElementById('grad-color-wrap').style.display = d.useGradient ? 'flex' : 'none';
  document.getElementById('des-bg-color').value = d.bgColor;
  document.getElementById('des-bg-trans').checked = d.transparentBg;
  document.getElementById('des-eye-sq').value = d.cornerSquareType;
  document.getElementById('des-eye-dot').value = d.cornerDotType;
  document.getElementById('des-ecc').value = d.errorCorrection;
  document.getElementById('des-frame-text').value = d.frameText || '';
}

function bindDesignEvents() {
  const bind = (id, key, transform = (v) => v) => {
    document.getElementById(id)?.addEventListener('input', (e) => {
      state.design[key] = transform(e.target.type === 'checkbox' ? e.target.checked : e.target.value);
      if (id === 'des-use-grad') {
        document.getElementById('grad-color-wrap').style.display = state.design.useGradient ? 'flex' : 'none';
      }
      if (id === 'des-logo-size') document.getElementById('lbl-logo-size').textContent = e.target.value;
      if (id === 'des-margin') document.getElementById('lbl-margin').textContent = e.target.value;
      scheduleRender();
    });
  };

  bind('des-dot-type', 'dotType');
  bind('des-dot-color', 'dotColor');
  bind('des-dot-color2', 'dotColor2');
  bind('des-use-grad', 'useGradient');
  bind('des-bg-color', 'bgColor');
  bind('des-bg-trans', 'transparentBg');
  bind('des-eye-sq', 'cornerSquareType');
  bind('des-eye-dot', 'cornerDotType');
  bind('des-ecc', 'errorCorrection');
  bind('des-frame-text', 'frameText');
  bind('des-logo-size', 'imageSize', (v) => Number(v) / 100);
  bind('des-margin', 'margin', (v) => Number(v));

  document.getElementById('des-logo-preset').addEventListener('change', (e) => {
    state.design.image = BUILTIN_LOGOS[e.target.value] || '';
    if (state.design.image) state.design.errorCorrection = 'H';
    syncDesignInputs();
    scheduleRender();
  });

  document.getElementById('des-logo-file').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.design.image = reader.result;
      state.design.errorCorrection = 'H';
      syncDesignInputs();
      scheduleRender();
    };
    reader.readAsDataURL(file);
  });
}

/* =========================================================================
 * RENDER PRATINJAU & PENGECEK KETERBACAAN (DEBOUNCE 200 MS)
 * ========================================================================= */
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderQrPreview, 200);
}

function renderQrPreview() {
  const data = getEffectiveQrData();
  const mount = document.getElementById('qr-canvas-mount');
  mount.innerHTML = '';
  qrInstance = createQrInstance(data, state.design);
  qrInstance.append(mount);

  const ctaEl = document.getElementById('qr-frame-cta');
  if (state.design.frameText) {
    ctaEl.style.display = 'block';
    ctaEl.style.color = state.design.dotColor;
    ctaEl.textContent = state.design.frameText;
  } else {
    ctaEl.style.display = 'none';
  }

  // Evaluasi skor keterbacaan
  const report = evaluateReadability(state.design, data.length);
  const badge = document.getElementById('readability-badge');
  badge.textContent = `Skor ${report.score}/100`;
  badge.className = `badge ${report.score >= 80 ? 'badge-success' : report.score >= 60 ? 'badge-warning' : 'badge-danger'}`;
  document.getElementById('mobile-score-lbl').textContent = `${report.score}/100`;
  document.getElementById('lbl-contrast').textContent = `${report.contrast}:1`;
  document.getElementById('lbl-min-print').textContent = `${report.minPrintCm} cm`;

  const issuesEl = document.getElementById('readability-issues');
  issuesEl.innerHTML = report.issues.map((iss) => `
    <li>
      <span>${escapeHtml(iss.text)}</span>
      ${iss.fixLabel ? `<button type="button" class="btn btn-ghost btn-sm" data-fix="${iss.id}" style="padding:0.1rem 0.4rem;color:var(--brand-primary);">${iss.fixLabel}</button>` : ''}
    </li>
  `).join('');

  issuesEl.querySelectorAll('[data-fix]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fix = btn.dataset.fix;
      if (fix === 'contrast') {
        state.design.dotColor = '#0f172a';
        state.design.bgColor = '#ffffff';
        state.design.transparentBg = false;
      } else if (fix === 'logoSize') {
        state.design.imageSize = 0.30;
        document.getElementById('des-logo-size').value = 30;
        document.getElementById('lbl-logo-size').textContent = '30';
      } else if (fix === 'ecc') {
        state.design.errorCorrection = 'H';
      } else if (fix === 'margin') {
        state.design.margin = 16;
        document.getElementById('des-margin').value = 16;
        document.getElementById('lbl-margin').textContent = '16';
      }
      syncDesignInputs();
      renderQrPreview();
    });
  });
}

/* =========================================================================
 * SIMPAN QR DINAMIS, CEK SLUG, BRAND KIT, & UNDUH
 * ========================================================================= */
document.getElementById('btn-check-slug').addEventListener('click', async () => {
  const raw = document.getElementById('dyn-slug').value;
  const statusEl = document.getElementById('slug-status');
  const res = await checkSlugAvailable(raw);
  statusEl.textContent = res.ok ? `Slug "${res.slug}" tersedia!` : res.reason;
  statusEl.style.color = res.ok ? 'var(--status-success)' : 'var(--status-danger)';
});

document.getElementById('btn-save-qr').addEventListener('click', async () => {
  try {
    const nama = document.getElementById('qr-name').value.trim() || `QR ${state.type.toUpperCase()}`;
    const customSlug = document.getElementById('dyn-slug').value.trim();
    let tujuan = buildStaticPayload();

    if (state.type.startsWith('page-')) {
      const pageSlug = customSlug || `p-${Date.now().toString(36)}`;
      await saveHostedPage(pageSlug, state.type, {
        title: state.fields.pgTitle || nama,
        desc: state.fields.pgDesc || '',
        itemsRaw: state.fields.pgItems || ''
      });
      tujuan = buildHostedPageUrl(pageSlug);
    }

    const aturan = {};
    const iosUrl = sanitizeUrl(document.getElementById('rule-ios').value);
    const androidUrl = sanitizeUrl(document.getElementById('rule-android').value);
    const abUrl = sanitizeUrl(document.getElementById('rule-ab').value);
    if (iosUrl) aturan.ios = iosUrl;
    if (androidUrl) aturan.android = androidUrl;
    if (abUrl) aturan.ab = abUrl;

    const saved = await saveDynamicQr({
      nama,
      tipe: state.type,
      kontenJson: state.fields,
      desainJson: state.design,
      tujuan,
      customSlug,
      mulai: document.getElementById('dyn-start').value || null,
      berakhir: document.getElementById('dyn-end').value || null,
      batasScan: document.getElementById('dyn-limit').value,
      password: document.getElementById('dyn-password').value,
      aturan
    });

    state.isDynamic = true;
    state.activeShortUrl = buildShortUrl(saved.kode);
    document.getElementById('saved-short-url-box').style.display = 'block';
    const linkEl = document.getElementById('saved-short-url');
    linkEl.href = state.activeShortUrl;
    linkEl.textContent = state.activeShortUrl;

    renderQrPreview();
    showToast('QR berhasil disimpan ke Dashboard!', 'success');
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan QR.', 'danger');
  }
});

document.getElementById('btn-download-qr').addEventListener('click', async () => {
  const format = document.getElementById('dl-format').value;
  const resolution = Number(document.getElementById('dl-res').value || 1024);
  const filename = (document.getElementById('qr-name').value.trim() || 'your-qr-code').replace(/\s+/g, '-').toLowerCase();
  try {
    await exportQrFile(getEffectiveQrData(), state.design, { format, resolution, filename });
    showToast(`Berhasil mengunduh ${format.toUpperCase()}`, 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

document.getElementById('btn-copy-qr').addEventListener('click', async () => {
  try {
    await copyQrToClipboard(getEffectiveQrData(), state.design);
    showToast('Gambar QR disalin ke clipboard!', 'success');
  } catch (err) {
    showToast(err.message, 'warning');
  }
});

/* Brand Kit */
async function loadBrandKits() {
  const kits = await listUserCollection('brandkits');
  const sel = document.getElementById('select-brandkit');
  sel.innerHTML = '<option value="">Muat Brand Kit...</option>' +
    kits.map((k) => `<option value="${escapeHtml(k.id)}">${escapeHtml(k.nama)}</option>`).join('');
  sel.onchange = () => {
    const found = kits.find((k) => k.id === sel.value);
    if (found?.design) {
      Object.assign(state.design, found.design);
      syncDesignInputs();
      renderQrPreview();
      showToast(`Brand Kit "${found.nama}" diterapkan.`, 'success');
    }
  };
}

document.getElementById('btn-save-brandkit').addEventListener('click', async () => {
  const nama = window.prompt('Nama Brand Kit (mis. Identitas Sekolah / Toko):');
  if (!nama) return;
  await saveUserCollection('brandkits', null, { nama, design: state.design });
  await loadBrandKits();
  showToast('Brand Kit tersimpan!', 'success');
});

/* =========================================================================
 * BULK CSV -> ZIP
 * ========================================================================= */
document.getElementById('btn-download-sample-csv').addEventListener('click', () => {
  const csv = 'nama,konten\nMeja 01,https://contoh.id/menu?meja=1\nMeja 02,https://contoh.id/menu?meja=2\nBrosur Sekolah,https://contoh.id/ppdb';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'contoh-bulk-qr.csv';
  a.click();
});

document.getElementById('bulk-csv-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const Papa = (await import('https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm')).default;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      state.bulkRows = res.data.filter((r) => r.konten || r.url || r.content);
      document.getElementById('bulk-preview-info').textContent = `Terbaca ${state.bulkRows.length} baris siap dibuat menjadi QR.`;
      document.getElementById('btn-run-bulk').disabled = state.bulkRows.length === 0;
    }
  });
});

document.getElementById('btn-run-bulk').addEventListener('click', async () => {
  const btn = document.getElementById('btn-run-bulk');
  btn.disabled = true;
  btn.textContent = 'Memproses ZIP...';
  try {
    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;
    const zip = new JSZip();
    for (let i = 0; i < state.bulkRows.length; i++) {
      const row = state.bulkRows[i];
      const label = (row.nama || row.name || `qr-${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      const content = row.konten || row.url || row.content;
      const dataUrl = await getQrDataUrl(content, state.design, 1024);
      zip.file(`${label}.png`, dataUrl.split(',')[1], { base64: true });
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'your-qr-bulk.zip';
    a.click();
    showToast('ZIP berhasil diunduh!', 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buat & Unduh ZIP';
  }
});

/* =========================================================================
 * TEMPLATE CETAK
 * ========================================================================= */
async function renderPrintTemplate() {
  const sheet = document.getElementById('print-sheet');
  const tpl = document.getElementById('print-template-type').value;
  const title = document.getElementById('print-title').value || 'Scan Saya';
  const imgUrl = await getQrDataUrl(getEffectiveQrData(), state.design, 512);

  if (tpl === 'stickers') {
    sheet.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">` +
      Array.from({ length: 12 }).map(() => `
        <div style="border:1px dashed #cbd5e1;padding:0.75rem;text-align:center;border-radius:8px;">
          <img src="${imgUrl}" alt="QR" style="width:120px;margin:0 auto;">
          <div style="font-weight:700;font-size:0.85rem;margin-top:0.35rem;">${escapeHtml(title)}</div>
        </div>
      `).join('') + `</div>`;
  } else if (tpl === 'tent') {
    sheet.innerHTML = `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;">` +
      Array.from({ length: 6 }).map((_, i) => `
        <div style="border:2px solid #0f172a;padding:1.25rem;text-align:center;border-radius:12px;">
          <div style="font-weight:800;font-size:1.1rem;margin-bottom:0.5rem;">MEJA ${i + 1}</div>
          <img src="${imgUrl}" alt="QR" style="width:150px;margin:0 auto;">
          <div style="font-size:0.85rem;margin-top:0.5rem;">${escapeHtml(title)}</div>
        </div>
      `).join('') + `</div>`;
  } else {
    sheet.innerHTML = `
      <div style="border:3px solid #4f46e5;padding:3rem 2rem;text-align:center;border-radius:18px;max-width:600px;margin:0 auto;">
        <h2 style="font-size:2rem;margin:0 0 1rem;">${escapeHtml(title)}</h2>
        <img src="${imgUrl}" alt="QR" style="width:280px;margin:0 auto;">
        <p style="margin-top:1.25rem;font-size:1.1rem;color:#475569;">Arahkan kamera ponsel Anda ke kode QR di atas</p>
      </div>`;
  }
}

document.getElementById('print-template-type').addEventListener('change', renderPrintTemplate);
document.getElementById('print-title').addEventListener('input', renderPrintTemplate);
document.getElementById('btn-trigger-print').addEventListener('click', () => window.print());
document.getElementById('btn-mobile-scroll-preview').addEventListener('click', () => {
  document.querySelector('.preview-sticky')?.scrollIntoView({ behavior: 'smooth' });
});

/* Inisialisasi */
renderTypeGrid();
renderContentFields();
renderPresets();
bindDesignEvents();
syncDesignInputs();
renderQrPreview();
loadBrandKits();
