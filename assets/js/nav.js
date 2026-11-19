/**
 * Komponen Navigasi, Modal Autentikasi Elegan, & Footer bersama.
 * - "Buat QR" terbuka untuk semua pengunjung tanpa login.
 * - "QR Saya", "Modul", dan "Scanner & Alat" tampil setelah pengguna masuk/mendaftar.
 */
import { APP_CONFIG } from '../../js/config.js';
import {
  completeMagicLinkIfPresent,
  onAuthChanged,
  registerWithEmail,
  sendMagicLink,
  signInWithEmail,
  signInWithGoogle,
  signOut
} from '../../js/api.js';
import { getLang, loadTranslations } from './i18n.js';
import { icon } from './icons.js';
import { getEffectiveScheme, initThemeSync, toggleColorScheme } from './theme.js';
import { enableDialogLightDismiss, escapeHtml, showToast } from './utils.js';

let authDialogEl = null;

export function openAuthModal(defaultTab = 'login') {
  ensureAuthModal();
  switchAuthTab(defaultTab);
  authDialogEl.showModal();
}

function switchAuthTab(tab) {
  if (!authDialogEl) return;
  authDialogEl.querySelectorAll('.auth-tab-btn').forEach((b) => {
    const active = b.dataset.authTab === tab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  authDialogEl.querySelectorAll('[data-auth-panel]').forEach((p) => {
    p.hidden = p.dataset.authPanel !== tab;
  });
}

function ensureAuthModal() {
  if (authDialogEl) return;
  authDialogEl = document.createElement('dialog');
  authDialogEl.id = 'global-auth-dialog';
  authDialogEl.className = 'app-dialog';
  authDialogEl.setAttribute('aria-labelledby', 'global-auth-title');
  authDialogEl.setAttribute('closedby', 'any');

  authDialogEl.innerHTML = `
    <div class="dialog-header">
      <div style="display:flex;align-items:center;gap:0.6rem;">
        <svg width="28" height="28" viewBox="0 0 128 128" aria-hidden="true">
          <defs>
            <linearGradient id="authLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0078d4"/><stop offset="100%" stop-color="#004e8c"/>
            </linearGradient>
          </defs>
          <rect x="14" y="14" width="38" height="38" rx="8" fill="none" stroke="url(#authLogoGrad)" stroke-width="10"/>
          <rect x="27" y="27" width="12" height="12" rx="3" fill="url(#authLogoGrad)"/>
          <rect x="76" y="14" width="38" height="38" rx="8" fill="none" stroke="url(#authLogoGrad)" stroke-width="10"/>
          <rect x="89" y="27" width="12" height="12" rx="3" fill="url(#authLogoGrad)"/>
          <rect x="14" y="76" width="38" height="38" rx="8" fill="none" stroke="url(#authLogoGrad)" stroke-width="10"/>
          <rect x="27" y="89" width="12" height="12" rx="3" fill="url(#authLogoGrad)"/>
          <rect x="76" y="76" width="16" height="16" rx="4" fill="url(#authLogoGrad)"/>
          <rect x="98" y="98" width="16" height="16" rx="4" fill="url(#authLogoGrad)"/>
        </svg>
        <div>
          <h2 id="global-auth-title" style="margin:0;">Masuk ke Your QR Code</h2>
          <div style="font-size:0.8rem;color:var(--text-secondary);">Akses QR Saya, Modul Khusus & Analitik</div>
        </div>
      </div>
      <button type="button" class="icon-btn" id="global-auth-close" aria-label="Tutup">${icon('x', 18)}</button>
    </div>

    <button type="button" id="global-btn-google" class="btn btn-secondary" style="width:100%;margin-bottom:0.9rem;">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#EA4335" d="M12 5c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.4 1.7 14.9 1 12 1 7.4 1 3.4 3.6 1.4 7.4l3.7 2.9C6 7.3 8.8 5 12 5z"/>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/>
        <path fill="#FBBC05" d="M5.1 14.7c-.2-.8-.4-1.7-.4-2.7s.2-1.9.4-2.7L1.4 6.4C.5 8.1 0 10 0 12s.5 3.9 1.4 5.6l3.7-2.9z"/>
        <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-6-2.2-7-5.2l-3.7 2.9C3.4 20.4 7.4 23 12 23z"/>
      </svg>
      <span>Lanjutkan dengan Google</span>
    </button>

    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.9rem;color:var(--text-muted);font-size:0.78rem;">
      <span style="flex:1;height:1px;background:var(--border-color);"></span>
      <span>atau dengan email</span>
      <span style="flex:1;height:1px;background:var(--border-color);"></span>
    </div>

    <div class="auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected="true" class="auth-tab-btn active" data-auth-tab="login">Masuk</button>
      <button type="button" role="tab" aria-selected="false" class="auth-tab-btn" data-auth-tab="register">Daftar Baru</button>
      <button type="button" role="tab" aria-selected="false" class="auth-tab-btn" data-auth-tab="magic">Magic Link</button>
    </div>

    <form id="global-form-login" class="form-grid" data-auth-panel="login">
      <div class="field">
        <label for="g-login-email">Email</label>
        <div class="input-with-icon">
          ${icon('mail', 16, 'field-icon')}
          <input type="email" id="g-login-email" class="input" required placeholder="nama@email.com" autofocus>
        </div>
      </div>
      <div class="field">
        <label for="g-login-pass">Kata Sandi</label>
        <div class="input-with-icon">
          ${icon('lock', 16, 'field-icon')}
          <input type="password" id="g-login-pass" class="input" required placeholder="••••••••">
        </div>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;">${icon('logIn', 17)} Masuk Sekarang</button>
    </form>

    <form id="global-form-register" class="form-grid" data-auth-panel="register" hidden>
      <div class="field">
        <label for="g-reg-name">Nama Lengkap</label>
        <div class="input-with-icon">
          ${icon('user', 16, 'field-icon')}
          <input type="text" id="g-reg-name" class="input" required placeholder="Contoh: Budi Santoso">
        </div>
      </div>
      <div class="field">
        <label for="g-reg-email">Email</label>
        <div class="input-with-icon">
          ${icon('mail', 16, 'field-icon')}
          <input type="email" id="g-reg-email" class="input" required placeholder="nama@email.com">
        </div>
      </div>
      <div class="field">
        <label for="g-reg-pass">Kata Sandi (min. 6 karakter)</label>
        <div class="input-with-icon">
          ${icon('lock', 16, 'field-icon')}
          <input type="password" id="g-reg-pass" class="input" required minlength="6" placeholder="Buat kata sandi">
        </div>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;">Buat Akun Gratis</button>
    </form>

    <form id="global-form-magic" class="form-grid" data-auth-panel="magic" hidden>
      <div class="field">
        <label for="g-magic-email">Email untuk Tautan Masuk Sekali Klik</label>
        <div class="input-with-icon">
          ${icon('mail', 16, 'field-icon')}
          <input type="email" id="g-magic-email" class="input" required placeholder="nama@email.com">
        </div>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;">Kirim Magic Link ke Email</button>
    </form>
  `;

  document.body.appendChild(authDialogEl);
  enableDialogLightDismiss();

  authDialogEl.querySelector('#global-auth-close').addEventListener('click', () => authDialogEl.close());
  authDialogEl.querySelectorAll('.auth-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.authTab));
  });

  authDialogEl.querySelector('#global-btn-google').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
      authDialogEl.close();
      showToast('Berhasil masuk dengan Google!', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  authDialogEl.querySelector('#global-form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await signInWithEmail(
        authDialogEl.querySelector('#g-login-email').value,
        authDialogEl.querySelector('#g-login-pass').value
      );
      authDialogEl.close();
      showToast('Selamat datang kembali!', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  authDialogEl.querySelector('#global-form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await registerWithEmail(
        authDialogEl.querySelector('#g-reg-name').value.trim(),
        authDialogEl.querySelector('#g-reg-email').value.trim(),
        authDialogEl.querySelector('#g-reg-pass').value
      );
      authDialogEl.close();
      showToast('Akun berhasil didaftarkan!', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  authDialogEl.querySelector('#global-form-magic').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await sendMagicLink(authDialogEl.querySelector('#g-magic-email').value.trim());
      showToast('Magic link dikirim ke email Anda!', 'success');
    } catch (err) {
      showToast(err.message, 'warning');
    }
  });
}

export function initShell({ active = 'home', basePrefix = '.' } = {}) {
  initThemeSync();
  enableDialogLightDismiss();
  completeMagicLinkIfPresent().catch(() => {});
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${basePrefix}/sw.js`).catch(() => {});
  }

  const header = document.getElementById('app-navbar');
  const renderNavbar = (user) => {
    if (!header) return;
    header.className = 'navbar no-print';
    const loggedIn = Boolean(user);
    const isDark = getEffectiveScheme() === 'dark';

    header.innerHTML = `
      <div class="container navbar-inner">
        <a href="${basePrefix}/index.html" class="brand-logo">
          <span class="brand-mark" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 128 128">
              <defs>
                <linearGradient id="navWinBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#0078d4"/>
                  <stop offset="60%" stop-color="#0067c0"/>
                  <stop offset="100%" stop-color="#004e8c"/>
                </linearGradient>
              </defs>
              <rect x="14" y="14" width="38" height="38" rx="8" fill="none" stroke="url(#navWinBlue)" stroke-width="10"/>
              <rect x="27" y="27" width="12" height="12" rx="3" fill="url(#navWinBlue)"/>
              <rect x="76" y="14" width="38" height="38" rx="8" fill="none" stroke="url(#navWinBlue)" stroke-width="10"/>
              <rect x="89" y="27" width="12" height="12" rx="3" fill="url(#navWinBlue)"/>
              <rect x="14" y="76" width="38" height="38" rx="8" fill="none" stroke="url(#navWinBlue)" stroke-width="10"/>
              <rect x="27" y="89" width="12" height="12" rx="3" fill="url(#navWinBlue)"/>
              <rect x="76" y="76" width="16" height="16" rx="4" fill="url(#navWinBlue)"/>
              <rect x="98" y="98" width="16" height="16" rx="4" fill="url(#navWinBlue)"/>
              <rect x="76" y="100" width="14" height="12" rx="3" fill="url(#navWinBlue)"/>
              <rect x="100" y="76" width="12" height="14" rx="3" fill="url(#navWinBlue)"/>
            </svg>
          </span>
          <span>Your QR Code</span>
        </a>

        <nav class="nav-links" aria-label="Navigasi utama">
          <a href="${basePrefix}/index.html" class="nav-link ${active === 'home' ? 'active' : ''}">${icon('home', 16)} <span data-i18n="nav.home">Beranda</span></a>
          <a href="${basePrefix}/generator.html" class="nav-link ${active === 'generator' ? 'active' : ''}">${icon('plusSquare', 16)} <span data-i18n="nav.generator">Buat QR</span></a>
          <a href="${basePrefix}/tentang.html" class="nav-link ${active === 'about' ? 'active' : ''}">Tentang</a>
          ${loggedIn ? `
            <a href="${basePrefix}/dashboard.html" class="nav-link ${active === 'dashboard' ? 'active' : ''}">${icon('layoutGrid', 16)} <span data-i18n="nav.dashboard">QR Saya</span></a>
            <a href="${basePrefix}/modul/index.html" class="nav-link ${active === 'modul' ? 'active' : ''}">${icon('layers', 16)} <span data-i18n="nav.modules">Modul</span></a>
            ${APP_CONFIG.modules.toolkit ? `<a href="${basePrefix}/scan.html" class="nav-link ${active === 'scan' ? 'active' : ''}">${icon('scanLine', 16)} <span data-i18n="nav.toolkit">Scanner & Alat</span></a>` : ''}
          ` : ''}
        </nav>

        <div class="nav-actions">
          <button type="button" id="theme-toggle-btn" class="icon-btn" title="Ganti Tema Terang/Gelap" aria-label="Ganti Tema Terang atau Gelap">
            ${icon(isDark ? 'sun' : 'moon', 17)}
          </button>
          <button type="button" id="lang-toggle-btn" class="btn btn-ghost btn-sm" title="Ganti Bahasa / Switch Language">
            ${getLang().toUpperCase()}
          </button>
          ${loggedIn ? `
            <span class="badge badge-primary" title="${escapeHtml(user.email || '')}">${icon('user', 13)} ${escapeHtml(user.displayName || 'Akun')}</span>
            <button type="button" id="nav-logout-btn" class="btn btn-secondary btn-sm">${icon('logOut', 15)} Keluar</button>
          ` : `
            <button type="button" id="nav-login-btn" class="btn btn-secondary btn-sm">${icon('logIn', 15)} Masuk / Daftar</button>
            <a href="${basePrefix}/generator.html" class="btn btn-primary btn-sm" data-i18n="nav.generator">Buat QR</a>
          `}
          <button type="button" id="mobile-nav-btn" popovertarget="mobile-nav-drawer" class="icon-btn mobile-menu-btn" aria-label="Buka menu" aria-expanded="false">${icon('menu', 18)}</button>
        </div>
      </div>
    `;

    document.getElementById('theme-toggle-btn')?.addEventListener('click', (e) => {
      toggleColorScheme();
      const darkNow = getEffectiveScheme() === 'dark';
      e.currentTarget.innerHTML = icon(darkNow ? 'sun' : 'moon', 17);
    });

    document.getElementById('lang-toggle-btn')?.addEventListener('click', async (e) => {
      const next = getLang() === 'id' ? 'en' : 'id';
      e.currentTarget.textContent = next.toUpperCase();
      await loadTranslations(next, basePrefix);
    });

    document.getElementById('nav-login-btn')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
      await signOut();
      showToast('Anda telah keluar.', 'success');
    });

    let drawer = document.getElementById('mobile-nav-drawer');
    if (drawer) drawer.remove();
    drawer = document.createElement('nav');
    drawer.id = 'mobile-nav-drawer';
    drawer.setAttribute('popover', 'auto');
    drawer.setAttribute('aria-label', 'Menu seluler');
    drawer.className = 'card';
    drawer.style.cssText = 'position:fixed;inset:70px 1rem auto 1rem;margin:0;width:auto;max-width:calc(100vw - 2rem);z-index:50;';
    drawer.innerHTML = `
      <a href="${basePrefix}/index.html" class="nav-link ${active === 'home' ? 'active' : ''}">${icon('home', 16)} Beranda</a>
      <a href="${basePrefix}/generator.html" class="nav-link ${active === 'generator' ? 'active' : ''}">${icon('plusSquare', 16)} Buat QR</a>
      <a href="${basePrefix}/tentang.html" class="nav-link ${active === 'about' ? 'active' : ''}">Tentang</a>
      ${loggedIn ? `
        <a href="${basePrefix}/dashboard.html" class="nav-link ${active === 'dashboard' ? 'active' : ''}">${icon('layoutGrid', 16)} QR Saya</a>
        <a href="${basePrefix}/modul/index.html" class="nav-link ${active === 'modul' ? 'active' : ''}">${icon('layers', 16)} Modul Khusus</a>
        ${APP_CONFIG.modules.toolkit ? `<a href="${basePrefix}/scan.html" class="nav-link ${active === 'scan' ? 'active' : ''}">${icon('scanLine', 16)} Scanner & Alat</a>` : ''}
      ` : `<button type="button" id="drawer-login-btn" class="btn btn-primary btn-sm">${icon('logIn', 15)} Masuk / Daftar</button>`}
    `;
    document.body.appendChild(drawer);
    drawer.querySelector('#drawer-login-btn')?.addEventListener('click', () => {
      drawer.hidePopover?.();
      openAuthModal('login');
    });
    const mobileBtn = document.getElementById('mobile-nav-btn');
    drawer.addEventListener('toggle', (e) => {
      mobileBtn?.setAttribute('aria-expanded', e.newState === 'open' ? 'true' : 'false');
    });
    loadTranslations(getLang(), basePrefix);
  };

  onAuthChanged((user) => renderNavbar(user));

  const footer = document.getElementById('app-footer');
  if (footer) {
    footer.className = 'footer no-print';
    footer.innerHTML = `
      <div class="container" style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:1.25rem;align-items:center;">
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <strong style="color:var(--text-primary)">Your QR Code</strong>
          <span>• Lisensi MIT • Dikembangkan oleh</span>
          <a href="${escapeHtml(APP_CONFIG.developerGithub)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:0.35rem;font-weight:600;">
            ${icon('github', 15)} ${escapeHtml(APP_CONFIG.developerName)}
          </a>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center;">
          ${APP_CONFIG.supportUrl ? `<a href="${escapeHtml(APP_CONFIG.supportUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">Dukung Pengembang (Saweria)</a>` : ''}
          <a href="${basePrefix}/tentang.html">Tentang & Privasi</a>
          <a href="${APP_CONFIG.bugReportUrl}" target="_blank" rel="noopener noreferrer">Laporkan Bug</a>
        </div>
      </div>
    `;
  }
}
