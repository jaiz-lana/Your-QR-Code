/**
 * Pengelola Tema Terang/Gelap (mengikuti preferensi sistem secara default,
 * dengan override manual tersimpan di localStorage).
 */
const STORAGE_KEY = 'color-scheme';

function getSystemScheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredScheme() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === 'light' || val === 'dark' ? val : null;
  } catch {
    return null;
  }
}

export function applyColorScheme(scheme) {
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.content = scheme ?? 'light dark';
  }
}

export function toggleColorScheme() {
  const stored = getStoredScheme();
  const sys = getSystemScheme();
  const currentRendered = stored ?? sys;
  const target = currentRendered === 'dark' ? 'light' : 'dark';

  try {
    if (target === sys) {
      // Kembali ke default sistem agar tidak mengunci permanen
      localStorage.removeItem(STORAGE_KEY);
      applyColorScheme(null);
    } else {
      localStorage.setItem(STORAGE_KEY, target);
      applyColorScheme(target);
    }
  } catch {
    applyColorScheme(target);
  }
}

export function initThemeSync() {
  applyColorScheme(getStoredScheme());
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      applyColorScheme(getStoredScheme());
    }
  });
}
