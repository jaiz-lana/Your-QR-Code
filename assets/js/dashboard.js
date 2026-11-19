/**
 * Logika Dashboard "QR Saya", Analitik Scan (Chart.js), Folder, Workspace & Backup
 */
import { initShell, openAuthModal } from './nav.js';
import { isFirebaseConfigured } from '../../js/config.js';
import { buildShortUrl } from '../../js/config.js';
import {
  deleteQr,
  getLinkStats,
  listQrs,
  listUserCollection,
  onAuthChanged,
  saveUserCollection,
  updateQrStatus
} from '../../js/api.js';
import { escapeHtml, formatDate, showToast } from './utils.js';

initShell({ active: 'dashboard', basePrefix: '.' });

let allQrs = [];
let allFolders = [];
let chartInstance = null;
let currentStatsRows = [];
let pendingDelete = null;

const analyticsDialog = document.getElementById('analytics-dialog');
const deleteDialog = document.getElementById('delete-dialog');

document.getElementById('gate-login-btn')?.addEventListener('click', () => openAuthModal('login'));
document.getElementById('btn-close-analytics').addEventListener('click', () => analyticsDialog.close());

onAuthChanged(async (user) => {
  const gate = document.getElementById('dash-auth-gate');
  const content = document.getElementById('dash-content');
  const statusLbl = document.getElementById('user-status-lbl');

  if (!user) {
    gate.hidden = false;
    content.hidden = true;
    return;
  }

  gate.hidden = true;
  content.hidden = false;
  statusLbl.textContent = `Masuk sebagai ${user.displayName || user.email} ${!isFirebaseConfigured() ? '(Mode Lokal/Demo)' : ''}`;
  await refreshData();
});

/* =========================================================================
 * TABS DASHBOARD
 * ========================================================================= */
document.querySelectorAll('[data-dash-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-dash-tab]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.dashTab;
    ['list', 'folders', 'workspace', 'backup'].forEach((name) => {
      document.getElementById(`tab-${name}`).hidden = name !== tab;
    });
  });
});

/* =========================================================================
 * MUAT & RENDER DATA QR
 * ========================================================================= */
async function refreshData() {
  allQrs = await listQrs();
  allFolders = await listUserCollection('folders');
  const workspaces = await listUserCollection('workspaces');

  document.getElementById('sum-total-qr').textContent = allQrs.length;
  document.getElementById('sum-total-scan').textContent = allQrs.reduce((s, q) => s + (q.totalScan || 0), 0);
  document.getElementById('sum-active-qr').textContent = allQrs.filter((q) => (q.status || 'active') === 'active').length;

  const fSel = document.getElementById('filter-folder');
  fSel.innerHTML = '<option value="all">Semua Folder</option>' +
    allFolders.map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.nama)}</option>`).join('');

  document.getElementById('folder-list').innerHTML = allFolders.length
    ? allFolders.map((f) => `<div class="card"><strong>${escapeHtml(f.nama)}</strong></div>`).join('')
    : '<p style="color:var(--text-muted);">Belum ada folder.</p>';

  document.getElementById('workspace-list').innerHTML = workspaces.length
    ? workspaces.map((w) => `<div class="card"><strong>${escapeHtml(w.nama)}</strong><div class="badge badge-primary" style="margin-top:0.4rem;">Pemilik</div></div>`).join('')
    : '<p style="color:var(--text-muted);">Belum ada workspace tim.</p>';

  renderQrTable();
}

function renderQrTable() {
  const q = document.getElementById('filter-search').value.trim().toLowerCase();
  const st = document.getElementById('filter-status').value;
  const fld = document.getElementById('filter-folder').value;

  const filtered = allQrs.filter((item) => {
    const matchQ = !q || (item.nama || '').toLowerCase().includes(q) || (item.kode || '').toLowerCase().includes(q);
    const matchSt = st === 'all' || (item.status || 'active') === st;
    const matchFld = fld === 'all' || item.folderId === fld;
    return matchQ && matchSt && matchFld;
  });

  const tbody = document.getElementById('qr-table-body');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">Belum ada QR yang sesuai. <a href="./generator.html">Buat QR pertama Anda</a>.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((item) => {
    const status = item.status || 'active';
    const shortUrl = buildShortUrl(item.kode);
    return `
      <tr>
        <td>
          <strong>${escapeHtml(item.nama)}</strong><br>
          <a href="${shortUrl}" target="_blank" rel="noopener" style="font-size:0.8rem;">/${escapeHtml(item.kode)}</a>
        </td>
        <td><span class="badge badge-neutral">${escapeHtml(item.tipe || 'url')}</span></td>
        <td>
          <span class="badge ${status === 'active' ? 'badge-success' : 'badge-warning'}">
            ${status === 'active' ? 'Aktif' : 'Dijeda'}
          </span>
        </td>
        <td><strong>${item.totalScan || 0}</strong></td>
        <td>${formatDate(item.diubah)}</td>
        <td>
          <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" data-act="stats" data-kode="${escapeHtml(item.kode)}" data-nama="${escapeHtml(item.nama)}">Analitik</button>
            <button type="button" class="btn btn-secondary btn-sm" data-act="toggle" data-id="${escapeHtml(item.id)}" data-kode="${escapeHtml(item.kode)}" data-status="${status}">
              ${status === 'active' ? 'Jeda' : 'Aktifkan'}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" data-act="copy" data-url="${escapeHtml(shortUrl)}">Salin</button>
            <button type="button" class="btn btn-danger btn-sm" data-act="delete" data-id="${escapeHtml(item.id)}" data-kode="${escapeHtml(item.kode)}" data-nama="${escapeHtml(item.nama)}">Hapus</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => handleAction(btn.dataset));
  });
}

async function handleAction(d) {
  if (d.act === 'copy') {
    await navigator.clipboard?.writeText(d.url);
    showToast('Tautan pendek disalin!', 'success');
  } else if (d.act === 'toggle') {
    const next = d.status === 'active' ? 'paused' : 'active';
    await updateQrStatus(d.id, d.kode, next);
    showToast(`Status QR diubah menjadi ${next === 'active' ? 'Aktif' : 'Dijeda'}.`, 'success');
    await refreshData();
  } else if (d.act === 'delete') {
    pendingDelete = { id: d.id, kode: d.kode };
    document.getElementById('del-msg').textContent = `Yakin ingin menghapus "${d.nama}"?`;
    deleteDialog.showModal();
  } else if (d.act === 'stats') {
    await openAnalytics(d.kode, d.nama);
  }
}

deleteDialog.addEventListener('close', async () => {
  const val = deleteDialog.returnValue;
  deleteDialog.returnValue = '';
  if (val === 'confirm' && pendingDelete) {
    await deleteQr(pendingDelete.id, pendingDelete.kode);
    pendingDelete = null;
    showToast('QR berhasil dihapus.', 'success');
    await refreshData();
  }
});

async function openAnalytics(kode, nama) {
  document.getElementById('analytics-title').textContent = `Analitik: ${nama}`;
  analyticsDialog.showModal();

  currentStatsRows = await getLinkStats(kode);
  const total = currentStatsRows.reduce((s, r) => s + (r.total || 0), 0);
  document.getElementById('analytics-summary').textContent = `Total Scan Periode Ini: ${total}`;

  const { Chart } = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.4/auto/+esm');
  const ctx = document.getElementById('analytics-chart');
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: currentStatsRows.length ? currentStatsRows.map((r) => r.tanggal) : ['Belum ada data'],
      datasets: [{
        label: 'Jumlah Scan Harian',
        data: currentStatsRows.length ? currentStatsRows.map((r) => r.total || 0) : [0],
        backgroundColor: '#0067c0',
        borderRadius: 6
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

document.getElementById('btn-export-stats-csv').addEventListener('click', () => {
  const csv = 'tanggal,total_scan\n' + currentStatsRows.map((r) => `${r.tanggal},${r.total || 0}`).join('\n');
  downloadFile(csv, 'analitik-qr.csv', 'text/csv');
});

['filter-search', 'filter-status', 'filter-folder'].forEach((id) => {
  document.getElementById(id).addEventListener('input', renderQrTable);
});

document.getElementById('form-add-folder').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nama = document.getElementById('folder-name-input').value.trim();
  if (!nama) return;
  await saveUserCollection('folders', null, { nama });
  document.getElementById('folder-name-input').value = '';
  await refreshData();
  showToast('Folder ditambahkan!', 'success');
});

document.getElementById('form-add-workspace').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nama = document.getElementById('ws-name-input').value.trim();
  if (!nama) return;
  await saveUserCollection('workspaces', null, { nama });
  document.getElementById('ws-name-input').value = '';
  await refreshData();
  showToast('Workspace dibuat!', 'success');
});

document.getElementById('btn-export-json').addEventListener('click', () => {
  downloadFile(JSON.stringify(allQrs, null, 2), 'backup-your-qr-code.json', 'application/json');
});

document.getElementById('btn-export-csv').addEventListener('click', () => {
  const csv = 'nama,kode,tipe,status,totalScan\n' +
    allQrs.map((q) => `"${(q.nama || '').replace(/"/g, '""')}",${q.kode},${q.tipe},${q.status || 'active'},${q.totalScan || 0}`).join('\n');
  downloadFile(csv, 'daftar-qr.csv', 'text/csv');
});

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
