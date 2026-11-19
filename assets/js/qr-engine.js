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
export function evaluateReadability(design, payloadLength = 0) {
  let score = 100;
  const issues = [];
  const bg = design.transparentBg ? '#ffffff' : (design.bgColor || '#ffffff');
  const fg = design.dotColor || '#000000';
  const contrast = getContrastRatio(fg, bg);

  if (contrast < 3.0) {
    score -= 40;
    issues.push({ id: 'contrast', text: 'Kontras warna modul & latar terlalu rendah (< 3:1).', fixLabel: 'Tingkatkan kontras' });
  } else if (contrast < 4.5) {
    score -= 15;
    issues.push({ id: 'contrast', text: 'Kontras cukup, namun lebih aman jika ≥ 4.5:1.', fixLabel: 'Optimalkan kontras' });
  }

  if (design.image && (design.imageSize || 0.35) > 0.42) {
    score -= 20;
    issues.push({ id: 'logoSize', text: 'Logo tengah terlalu besar (>42%), berisiko gagal dipindai.', fixLabel: 'Kecilkan logo ke 30%' });
  }

  if (design.image && (design.errorCorrection || 'M') === 'L') {
    score -= 20;
    issues.push({ id: 'ecc', text: 'Ada logo tengah tetapi Error Correction masih L.', fixLabel: 'Naikkan ke Level H' });
  }

  if ((design.margin ?? 12) < 8) {
    score -= 15;
    issues.push({ id: 'margin', text: 'Quiet zone (margin) terlalu sempit (< 8px).', fixLabel: 'Atur margin 16px' });
  }

  if (payloadLength > 250) {
    score -= 10;
    issues.push({ id: 'density', text: 'Data sangat padat (>250 karakter). Gunakan QR Dinamis agar lebih renggang.', fixLabel: '' });
  }

  score = Math.max(0, Math.min(100, score));
  const minPrintCm = payloadLength > 180 ? 3.5 : payloadLength > 80 ? 2.5 : 2.0;

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

  const ecc = design.image && (design.errorCorrection === 'L' || design.errorCorrection === 'M')
    ? 'H'
    : (design.errorCorrection || 'M');

  return {
    width: size,
    height: size,
    type: 'canvas',
    data: data || 'https://yourqrcode.pages.dev',
    margin: Number(design.margin ?? 12),
    qrOptions: {
      errorCorrectionLevel: ecc
    },
    image: design.image || undefined,
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: Number(design.imageMargin ?? 6),
      imageSize: Number(design.imageSize ?? 0.32),
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
