/**
 * Internasionalisasi ringan (ID / EN) berbasis file JSON.
 */
import { APP_CONFIG } from '../../js/config.js';

const LANG_KEY = 'yourqr_lang';
let dict = {};
let currentLang = APP_CONFIG.defaultLang || 'id';

export function getLang() {
  try {
    return localStorage.getItem(LANG_KEY) || currentLang;
  } catch {
    return currentLang;
  }
}

export async function loadTranslations(lang, basePrefix = '.') {
  currentLang = lang === 'en' ? 'en' : 'id';
  try {
    localStorage.setItem(LANG_KEY, currentLang);
  } catch {
    // Abaikan jika storage diblokir
  }
  document.documentElement.lang = currentLang;

  try {
    const res = await fetch(`${basePrefix}/assets/i18n/${currentLang}.json`);
    if (res.ok) {
      dict = await res.json();
      applyTranslations();
    }
  } catch (err) {
    console.warn('Gagal memuat terjemahan:', err);
  }
}

export function t(key, fallback = '') {
  return dict[key] ?? fallback ?? key;
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });
}
