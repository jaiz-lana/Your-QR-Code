/**
 * Mesin Render QR Kustom, Pengecek Keterbacaan, & Ekspor Multi-Format
 * Menggunakan qr-code-styling@1.8.4 dan jspdf@2.5.2 via CDN.
 */
import QRCodeStyling from 'https://cdn.jsdelivr.net/npm/qr-code-styling@1.8.4/+esm';

export const QR_PRESETS = {
  minimalis: {
    label: 'Minimalis',
    dotColor: '#0f172a',
    dotType: 'rounded',
    bgColor: '#ffffff',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'dot',
    frameText: ''
  },
  sekolah: {
    label: 'Sekolah / Madrasah',
    dotColor: '#1e3a8a',
    dotType: 'classy-rounded',
    bgColor: '#ffffff',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'dot',
    frameText: 'SCAN INFO SEKOLAH'
  },
  ormawa: {
    label: 'Ormawa / Kampus',
    dotColor: '#4f46e5',
    dotType: 'dots',
    bgColor: '#ffffff',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'square',
    frameText: 'DAFTAR DI SINI'
  },
  umkm: {
    label: 'UMKM / Kuliner',
    dotColor: '#0f766e',
    dotType: 'rounded',
    bgColor: '#ffffff',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'dot',
    frameText: 'SCAN MENU'
  },
  event: {
    label: 'Event / Tiket',
    dotColor: '#7c3aed',
    dotType: 'classy',
    bgColor: '#ffffff',
    cornerSquareType: 'square',
    cornerDotType: 'square',
    frameText: 'TIKET MASUK'
  },
  gelap: {
    label: 'Mode Gelap',
    dotColor: '#38bdf8',
    dotType: 'rounded',
    bgColor: '#0f172a',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'dot',
    frameText: 'SCAN SAYA'
  }
};

/**
 * Logo SVG bawaan (ringan, tanpa request eksternal)
 */
export const BUILTIN_LOGOS = {
  none: '',
  wa: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#25D366"/><path fill="#fff" d="M45 38.6c-.7-.3-4.1-2-4.7-2.2-.6-.2-1.1-.3-1.5.3-.5.7-1.8 2.2-2.2 2.7-.4.5-.8.5-1.5.2-4.1-2-6.8-3.6-9.5-8.2-.7-1.2.7-1.1 2-3.8.2-.5.1-.9-.1-1.2-.2-.3-1.5-3.7-2.1-5-.5-1.3-1.1-1.1-1.5-1.1h-1.3c-.5 0-1.2.2-1.8.9-.6.7-2.4 2.3-2.4 5.7s2.5 6.6 2.8 7.1c.3.5 4.9 7.5 11.9 10.5 4.4 1.9 6.1 2.1 8.3 1.7 1.3-.2 4.1-1.7 4.7-3.3.6-1.6.6-3 .4-3.3-.2-.3-.6-.5-1.3-.8z"/></svg>'),
  ig: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#E1306C"/><rect x="16" y="16" width="32" height="32" rx="9" fill="none" stroke="#fff" stroke-width="4"/><circle cx="32" cy="32" r="8" fill="none" stroke="#fff" stroke-width="4"/><circle cx="43" cy="21" r="2.5" fill="#fff"/></svg>'),
  youtube: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="12" width="56" height="40" rx="12" fill="#FF0000"/><polygon points="26,22 44,32 26,42" fill="#fff"/></svg>'),
  tiktok: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#111827"/><path fill="#25F4EE" d="M35 16h5c.8 4.4 3.6 7.4 8 8v5c-3-.1-5.7-1-8-2.6V39a10 10 0 1 1-10-10c.7 0 1.4.1 2 .2v5.3a4.8 4.8 0 1 0 3 4.5V16z"/><path fill="#FE2C55" d="M37 18h5c.7 4 3.3 6.8 7 7.4v4.6c-2.6-.1-5-.9-7-2.3V40a10 10 0 1 1-10-10c.5 0 1 0 1.5.1v5a5 5 0 1 0 3.5 4.9V18z" opacity=".85"/></svg>'),
  telegram: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#229ED9"/><path fill="#fff" d="M47 19L16 31c-2.1.8-2.1 2-.4 2.5l7.9 2.5 18.4-11.6c.9-.5 1.7-.2 1 .4L28 38.2l-.6 8.3c.9 0 1.3-.4 1.8-.9l4.3-4.2 8.9 6.6c1.6.9 2.8.4 3.2-1.5L49 21.8c.5-2.3-.9-3.3-2-2.8z"/></svg>'),
  facebook: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#1877F2"/><path fill="#fff" d="M36 52V35h5.7l.9-6.6H36v-4.2c0-1.9.5-3.2 3.3-3.2h3.5v-5.9c-.6-.1-2.7-.3-5.1-.3-5 0-8.5 3.1-8.5 8.7v4.9h-5.7V35h5.7v17H36z"/></svg>'),
  x: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#0F172A"/><path fill="#fff" d="M35.5 29.6L46.8 16h-2.7l-9.8 11.8L26.5 16H17l11.9 17.8L17 48h2.7l10.4-12.5L38.4 48H48L35.5 29.6zm-3.7 4.4l-1.2-1.8-9.7-14h4.2l7.8 11.4 1.2 1.8 10.2 14.8h-4.2l-8.3-12.2z"/></svg>'),
  linkedin: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0A66C2"/><circle cx="20" cy="21" r="4" fill="#fff"/><rect x="16.5" y="28" width="7" height="20" rx="1.5" fill="#fff"/><path fill="#fff" d="M29 28h6.7v2.8h.1c.9-1.8 3.2-3.5 6.6-3.5 7 0 8.3 4.6 8.3 10.6V48h-7v-8.8c0-2.1 0-4.8-2.9-4.8s-3.4 2.3-3.4 4.6V48H29V28z"/></svg>'),
  maps: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#EA4335"/><path fill="#fff" d="M32 14c-7.7 0-14 6.1-14 13.7 0 9.8 14 23.3 14 23.3s14-13.5 14-23.3C46 20.1 39.7 14 32 14zm0 19a5.3 5.3 0 1 1 0-10.6 5.3 5.3 0 0 1 0 10.6z"/></svg>'),
  qris: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#00529B"/><rect x="12" y="14" width="40" height="36" rx="6" fill="#fff"/><text x="32" y="38" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="14" fill="#DC2626">QRIS</text></svg>'),
  link: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#4F46E5"/><path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" d="M26 38l12-12M22 30l-4 4a7 7 0 0010 10l4-4M42 34l4-4a7 7 0 00-10-10l-4 4"/></svg>'),
  store: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#0D9488"/><path fill="#fff" d="M18 22h28l3 9H15l3-9zm-1 12h30v14H17V34zm10 4v10h10V38H27z"/></svg>')
};

/**
 * Hitung luminansi relatif untuk cek kontras WCAG antara warna modul & latar.
 */
function hexToRgb(hex) {
  const clean = String(hex || '#000000').replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(fgHex, bgHex) {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Pengecek Keterbacaan Otomatis (Skor 0 - 100) + saran perbaikan 1 klik.
 */
export function evaluateReadability(design, payloadLength = 0, printSizeCm = 2.5) {
  let score = 100;
  const issues = [];
  const bg = design.transparentBg ? '#ffffff' : (design.bgColor || '#ffffff');
  const fg = design.dotColor || '#000000';
  let contrast = getContrastRatio(fg, bg);
  if (design.useGradient && design.dotColor2) {
    contrast = Math.min(contrast, getContrastRatio(design.dotColor2, bg));
  }

  if (contrast < 3.0) {
    score -= 40;
    issues.push({ id: 'contrast', text: 'Kontras warna modul/gradasi & latar terlalu rendah (< 3:1).', fixLabel: 'Tingkatkan kontras' });
  } else if (contrast < 4.5) {
    score -= 15;
    issues.push({ id: 'contrast', text: 'Kontras cukup, namun lebih aman jika ≥ 4.5:1.', fixLabel: 'Optimalkan kontras' });
  }

  const logoPct = Number(design.imageSize ?? 0.20);
  if (design.image && logoPct > 0.25) {
    score -= 25;
    issues.push({ id: 'logoSize', text: 'Ukuran logo melebihi batas aman 25%, berisiko gagal dipindai.', fixLabel: 'Set logo 20%' });
  } else if (design.image && logoPct > 0.22) {
    score -= 8;
    issues.push({ id: 'logoSize', text: 'Logo cukup besar (>22%); pastikan pencahayaan cetak baik.', fixLabel: 'Set logo 20%' });
  }

  if (design.image && (design.errorCorrection || 'M') !== 'H') {
    score -= 20;
    issues.push({ id: 'ecc', text: 'Ada logo tengah tetapi Error Correction belum H.', fixLabel: 'Naikkan ke Level H' });
  }

  if ((design.margin ?? 12) < 8) {
    score -= 15;
    issues.push({ id: 'margin', text: 'Quiet zone (margin) terlalu sempit (< 8px).', fixLabel: 'Atur margin 16px' });
  }

  if (payloadLength > 300) {
    score -= 20;
    issues.push({ id: 'density', text: 'Data sangat padat (>300 karakter). Gunakan QR Dinamis agar lebih renggang.', fixLabel: '' });
  } else if (payloadLength > 180) {
    score -= 10;
    issues.push({ id: 'density', text: 'Data cukup padat (>180 karakter). Pertimbangkan QR Dinamis.', fixLabel: '' });
  }

  const minPrintCm = payloadLength > 180 ? 3.5 : payloadLength > 80 ? 2.5 : 2.0;
  const targetCm = Number(printSizeCm || 2.5);
  if (targetCm < minPrintCm) {
    score -= 15;
    issues.push({ id: 'printSize', text: `Ukuran cetak (${targetCm} cm) lebih kecil dari rekomendasi minimal (${minPrintCm} cm).`, fixLabel: '' });
  }

  score = Math.max(0, Math.min(100, score));
  return { score, contrast: Number(contrast.toFixed(1)), minPrintCm, issues };
}

/**
 * Konversi objek desain internal ke opsi QRCodeStyling.
 */
export function buildQrOptions(data, design, sizeOverride = null) {
  const size = sizeOverride || design.size || 280;
  const dotsOptions = {
    type: design.dotType || 'rounded'
  };

  if (design.useGradient && design.dotColor2) {
    dotsOptions.gradient = {
      type: design.gradientType || 'linear',
      rotation: 0.78,
      colorStops: [
        { offset: 0, color: design.dotColor || '#0f172a' },
        { offset: 1, color: design.dotColor2 }
      ]
    };
  } else {
    dotsOptions.color = design.dotColor || '#0f172a';
  }

  const ecc = design.image ? 'H' : (design.errorCorrection || 'M');
  const clampedLogoSize = Math.min(0.25, Math.max(0.10, Number(design.imageSize ?? 0.20)));

  return {
    width: size,
    height: size,
    type: 'canvas',
    data: data || 'https://your-qr-code-web.web.app/',
    margin: Number(design.margin ?? 12),
    qrOptions: {
      errorCorrectionLevel: ecc
    },
    image: design.image || undefined,
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: Number(design.imageMargin ?? 6),
      imageSize: clampedLogoSize,
      hideBackgroundDots: true
    },
    dotsOptions,
    backgroundOptions: {
      color: design.transparentBg ? 'transparent' : (design.bgColor || '#ffffff')
    },
    cornersSquareOptions: {
      type: design.cornerSquareType || 'extra-rounded',
      color: design.cornerSquareColor || design.dotColor || '#0f172a'
    },
    cornersDotOptions: {
      type: design.cornerDotType || 'dot',
      color: design.cornerDotColor || design.dotColor || '#0f172a'
    }
  };
}

export function createQrInstance(data, design) {
  return new QRCodeStyling(buildQrOptions(data, design));
}

/**
 * Ekspor PNG/JPG/WEBP/SVG atau PDF (A4/A5/Kartu) dengan resolusi pilihan.
 */
export async function exportQrFile(data, design, { format = 'png', resolution = 1024, filename = 'your-qr-code' } = {}) {
  const opts = buildQrOptions(data, design, format === 'svg' ? 512 : resolution);
  if (format === 'svg') {
    opts.type = 'svg';
    const svgQr = new QRCodeStyling(opts);
    await svgQr.download({ name: filename, extension: 'svg' });
    return;
  }

  if (format === 'pdf-a4' || format === 'pdf-a5' || format === 'pdf-card') {
    const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm');
    const qr = new QRCodeStyling(buildQrOptions(data, design, 1024));
    const blob = await qr.getRawData('png');
    const dataUrl = await blobToDataUrl(blob);

    const fmt = format === 'pdf-a5' ? 'a5' : format === 'pdf-card' ? [90, 55] : 'a4';
    const doc = new jsPDF({ orientation: format === 'pdf-card' ? 'landscape' : 'portrait', unit: 'mm', format: fmt });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const qrMm = format === 'pdf-card' ? 36 : Math.min(pageW, pageH) * 0.55;
    const x = (pageW - qrMm) / 2;
    const y = (pageH - qrMm) / 2 - 4;

    doc.addImage(dataUrl, 'PNG', x, y, qrMm, qrMm);
    if (design.frameText) {
      doc.setFontSize(format === 'pdf-card' ? 10 : 16);
      doc.text(design.frameText, pageW / 2, y + qrMm + 10, { align: 'center' });
    }
    doc.save(`${filename}.pdf`);
    return;
  }

  const dlQr = new QRCodeStyling(opts);
  const ext = format === 'jpg' ? 'jpeg' : format;
  await dlQr.download({ name: filename, extension: ext });
}

export async function copyQrToClipboard(data, design) {
  const qr = new QRCodeStyling(buildQrOptions(data, design, 1024));
  const blob = await qr.getRawData('png');
  if (!navigator.clipboard?.write) {
    throw new Error('Browser tidak mendukung salin gambar ke clipboard.');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export async function getQrDataUrl(data, design, size = 512) {
  const qr = new QRCodeStyling(buildQrOptions(data, design, size));
  const blob = await qr.getRawData('png');
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
