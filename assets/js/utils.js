/**
 * Utilitas keamanan, sanitasi, validasi URL/slug, toast, dan helper DOM.
 */
import { APP_CONFIG } from '../../js/config.js';

let domPurifyPromise = null;

function loadDOMPurify() {
  domPurifyPromise ??= import('https://cdn.jsdelivr.net/npm/dompurify@3.2.4/dist/purify.es.mjs')
    .then((mod) => mod.default ?? mod);
  return domPurifyPromise;
}

/**
 * Sanitasi HTML aman menggunakan Sanitizer API bawaan browser
 * dengan fallback DOMPurify untuk browser yang belum mendukung.
 */
export async function safeSetHTML(el, html) {
  if (!el) return;
  const elements = ['p', 'b', 'i', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'span'];
  const attributes = ['class'];

  if ('setHTML' in Element.prototype) {
    el.setHTML(String(html ?? ''), { sanitizer: { elements, attributes } });
  } else {
    try {
      const DOMPurify = await loadDOMPurify();
      el.innerHTML = DOMPurify.sanitize(String(html ?? ''), {
        ALLOWED_TAGS: [...elements, '#text'],
        ALLOWED_ATTR: attributes,
        ALLOW_ARIA_ATTR: false,
        ALLOW_DATA_ATTR: false,
        KEEP_CONTENT: false
      });
    } catch {
      el.textContent = String(html ?? '');
    }
  }
}

/**
 * Escape teks biasa agar aman saat disisipkan ke template string.
 */
export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validasi URL aman: hanya izinkan http:, https:, mailto:, tel:.
 * Blokir javascript:, data:, vbscript:, dll.
 */
export function sanitizeUrl(rawUrl) {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) return '';

  // Tambahkan https:// jika pengguna mengetik domain tanpa protokol
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    const allowed = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowed.includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

/**
 * Cek apakah URL eksternal terlihat mencurigakan (IP mentah, punycode, dll.).
 */
export function isSuspiciousUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const isPunycode = host.includes('xn--');
    return isIp || isPunycode;
  } catch {
    return true;
  }
}

/**
 * Generator kode pendek unik 7 karakter (tanpa karakter membingungkan 0/O, l/I).
 */
export function generateShortCode(length = 7) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Validasi format slug kustom (huruf, angka, tanda hubung/garis bawah, 3-40 karakter).
 */
export function validateSlug(rawSlug) {
  const slug = String(rawSlug ?? '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,40}$/.test(slug)) {
    return { ok: false, reason: 'Slug harus 3-40 karakter (huruf kecil, angka, - atau _).' };
  }
  if (APP_CONFIG.limits.forbiddenSlugs.includes(slug)) {
    return { ok: false, reason: 'Slug tersebut dicadangkan oleh sistem.' };
  }
  return { ok: true, slug };
}

/**
 * Hash SHA-256 hex untuk kata sandi atau hashUnik analitik.
 */
export async function sha256Hex(text) {
  const buf = new TextEncoder().encode(String(text));
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Tampilkan notifikasi toast ringan.
 */
export function showToast(message, type = 'success', durationMs = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), durationMs);
}

/**
 * Fallback light-dismiss untuk <dialog closedby="any"> pada browser yang belum mendukung.
 */
export function enableDialogLightDismiss() {
  if ('closedBy' in HTMLDialogElement.prototype) return;
  const outside = (e, dialog) => {
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  document.querySelectorAll('dialog[closedby="any"]').forEach((dialog) => {
    if (dialog.dataset.lightDismissBound) return;
    dialog.dataset.lightDismissBound = '1';
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = outside(e, dialog);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && outside(e, dialog)) dialog.close();
    });
  });
}

/**
 * Format tanggal lokal Indonesia yang ringkas.
 */
export function formatDate(input) {
  if (!input) return '-';
  const d = input?.toDate ? input.toDate() : new Date(input);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Deteksi OS, browser, dan kategori perangkat secara ringan tanpa IP mentah.
 */
export function getDeviceMeta() {
  const ua = navigator.userAgent || '';
  let os = 'Lainnya';
  if (/android/i.test(ua)) os = 'Android';
  else if (/iPad|iPhone|iPod/.test(ua)) os = 'iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Lainnya';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  const perangkat = /Mobi|Android|iPhone|iPad/i.test(ua)
    ? (/iPad|Tablet/i.test(ua) ? 'Tablet' : 'Ponsel')
    : 'Desktop';

  return {
    os,
    browser,
    perangkat,
    bahasa: (navigator.language || 'id').slice(0, 5),
    referrer: document.referrer ? new URL(document.referrer).hostname : 'langsung'
  };
}
