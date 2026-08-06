/**
 * Diseño PDF — Recibo de consumo eléctrico (formal y estructurado)
 */

const fs = require('fs');
const path = require('path');
const { buildSocialLinks, buildContactInfoItems } = require('../helpers/contactLinks');
const { drawContactIcon } = require('../helpers/contactInfoIcons');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo-electrixstudio.png');

const COLORS = {
  primary: '#1A4AB0',
  primaryDark: '#12357a',
  dark: '#080810',
  text: '#1f2937',
  muted: '#64748b',
  border: '#cbd5e1',
  bgHeader: '#1A4AB0',
  bgPanel: '#f8fafc',
  bgTotal: '#eef3fc',
  white: '#ffffff',
};

const MARGIN = 42;
const PAGE_WIDTH = 595.28;
const CONTENT_W = PAGE_WIDTH - MARGIN * 2;

/** Pie de página fijo — compacto, anclado al borde inferior */
const FOOTER_FROM_BOTTOM = 14;
const FOOTER_HEIGHT = 76;
const FOOTER_CONTENT_GAP = 8;
const PDF_BOTTOM_MARGIN = FOOTER_FROM_BOTTOM + FOOTER_HEIGHT + FOOTER_CONTENT_GAP;
const FOOTER_RESERVE = PDF_BOTTOM_MARGIN - MARGIN;

function applyPdfPageMargins(doc) {
  if (!doc.page) return;
  doc.page.margins = {
    top: MARGIN,
    bottom: PDF_BOTTOM_MARGIN,
    left: MARGIN,
    right: MARGIN,
  };
}

function getMaxContentY(doc) {
  const bottom = doc.page?.margins?.bottom ?? PDF_BOTTOM_MARGIN;
  return doc.page.height - bottom;
}

const SOCIAL_PLATFORM_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
};

function drawFooterBar(doc, x, y, w, h, radius, fillColor) {
  doc.save();
  doc.moveTo(x, y + h)
    .lineTo(x, y + radius)
    .quadraticCurveTo(x, y, x + radius, y)
    .lineTo(x + w - radius, y)
    .quadraticCurveTo(x + w, y, x + w, y + radius)
    .lineTo(x + w, y + h)
    .closePath()
    .fill(fillColor);
  doc.restore();
}

function formatDatePE(date) {
  return new Date(date).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ensureSpace(doc, needed) {
  const bottom = getMaxContentY(doc);
  if (doc.y + needed > bottom) {
    doc.addPage();
    applyPdfPageMargins(doc);
    doc.y = MARGIN;
  }
}

function drawFixedText(doc, text, x, y, opts = {}) {
  const {
    font = 'Helvetica',
    size = 8,
    color = '#ffffff',
    width,
    align,
    ellipsis = false,
  } = opts;

  doc.font(font).fontSize(size).fillColor(color);
  const options = { lineBreak: false, ellipsis };
  if (width != null) options.width = width;
  if (align) options.align = align;
  doc.text(String(text || ''), x, y, options);
}

function wrapTextLines(doc, text, maxWidth) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (doc.widthOfString(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

/** Escribe texto multilínea sin provocar saltos automáticos de PDFKit */
function drawTextBlock(doc, text, x, w, opts = {}) {
  const {
    font = 'Helvetica',
    size = 8,
    color = COLORS.text,
    lineGap = 1.5,
  } = opts;

  doc.font(font).fontSize(size).fillColor(color);
  const lineStep = size + lineGap;
  const lines = wrapTextLines(doc, text, w);

  lines.forEach((line) => {
    if (doc.y + lineStep > getMaxContentY(doc)) {
      doc.addPage();
      applyPdfPageMargins(doc);
      doc.y = MARGIN;
    }
    doc.text(line, x, doc.y, { lineBreak: false, width: w });
    doc.y += lineStep;
  });

  return doc.y;
}

function drawHeaderBand(doc, { calculoId, fecha, precioKwh }) {
  const y = MARGIN;
  const h = 86;
  const pad = 14;
  const metaW = 168;
  const metaX = MARGIN + CONTENT_W - metaW - pad;

  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 6).fill(COLORS.dark);

  const logoHeight = 40;
  const logoY = y + (h - logoHeight) / 2;

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, MARGIN + pad, logoY, { height: logoHeight });
  } else {
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(16)
      .text('ELECTRIXSTUDIO', MARGIN + pad, logoY + 12);
  }

  doc.font('Helvetica').fontSize(9).fillColor('#c8d9f5')
    .text('Recibo de Consumo Eléctrico — Estimación Mensual', MARGIN + pad, y + h - 20, {
      width: CONTENT_W - pad * 2,
    });

  doc.fontSize(8.5).fillColor('#d1d5db')
    .text(`N° ${String(calculoId).padStart(6, '0')}`, metaX, y + 18, { width: metaW, align: 'right' })
    .text(formatDatePE(fecha), metaX, y + 32, { width: metaW, align: 'right' })
    .text(`Tarifa: S/ ${precioKwh} / kWh`, metaX, y + 46, { width: metaW, align: 'right' });

  doc.restore();
  doc.y = y + h + 18;
}

function drawPanel(doc, title, drawContent) {
  ensureSpace(doc, 60);
  const startY = doc.y;
  const padding = 12;

  doc.save();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
    .text(title.toUpperCase(), MARGIN + padding, startY + 10);

  const contentY = startY + 28;
  doc.y = contentY;
  const endContentY = drawContent(MARGIN + padding, CONTENT_W - padding * 2);

  const panelH = (endContentY - startY) + padding;
  doc.roundedRect(MARGIN, startY, CONTENT_W, panelH, 4)
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .stroke();

  doc.restore();
  doc.y = startY + panelH + 14;
}

function drawKeyValueRow(doc, x, y, w, label, value, opts = {}) {
  const labelW = w * 0.58;
  const valueW = w * 0.42;

  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size || 9)
    .fillColor(opts.muted ? COLORS.muted : COLORS.text)
    .text(label, x, y, { width: labelW, lineGap: 2 });

  doc.fillColor(opts.valueColor || COLORS.text)
    .text(value, x + labelW, y, { width: valueW, align: 'right' });

  return y + (opts.height || 16);
}

function drawClientePanel(doc, cliente) {
  const esEmpresa = cliente.tipo_cliente === 'empresa'
    || (!cliente.apellido && cliente.tipo_cliente !== 'natural');
  const titular = esEmpresa
    ? (cliente.nombre || '').trim()
    : `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();

  drawPanel(doc, 'Datos del titular', (x, w) => {
    let y = doc.y;
    const rows = [
      [esEmpresa ? 'Razón social' : 'Titular', titular || '—'],
      [esEmpresa ? 'RUC' : 'Documento (DNI)', cliente.documento || '—'],
      ['Empresa distribuidora', cliente.empresa_distribuidora || '—'],
      ['Tipo de tarifa', cliente.tarifa || '—'],
      ['Potencia contratada', cliente.potencia_contratada || '—'],
    ];
    rows.forEach(([label, value]) => {
      y = drawKeyValueRow(doc, x, y, w, label, value);
    });
    return y + 4;
  });
}

function drawResumenPanel(doc, resumen, formatNum) {
  drawPanel(doc, 'Resumen de consumo', (x, w) => {
    let y = doc.y;
    const half = w / 2 - 6;

    doc.save();
    doc.roundedRect(x, y, half, 52, 3).fill(COLORS.bgPanel);
    doc.roundedRect(x + half + 12, y, half, 52, 3).fill(COLORS.bgPanel);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary)
      .text('CONSUMO (kWh)', x + 8, y + 8, { width: half - 16 });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.text)
      .text(`Diario: ${formatNum(resumen.consumoDia)}`, x + 8, y + 22, { width: half - 16 })
      .text(`Mensual: ${formatNum(resumen.consumoMes)}`, x + 8, y + 34, { width: half - 16 })
      .text(`Anual: ${formatNum(resumen.consumoAnio)}`, x + 8, y + 46, { width: half - 16 });

    const rx = x + half + 12;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary)
      .text('GASTO ENERGÍA (S/)', rx + 8, y + 8, { width: half - 16 });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.text)
      .text(`Diario: ${formatNum(resumen.gastoDiario)}`, rx + 8, y + 22, { width: half - 16 })
      .text(`Mensual: ${formatNum(resumen.gastoMensual)}`, rx + 8, y + 34, { width: half - 16 })
      .text(`Anual: ${formatNum(resumen.gastoAnual)}`, rx + 8, y + 46, { width: half - 16 });

    doc.restore();
    y += 60;
    y = drawKeyValueRow(doc, x, y, w, 'Demanda contratada', `${formatNum(resumen.demandaTotal)} kW`);
    return y + 4;
  });
}

function drawFacturaLineRow(doc, opts) {
  const {
    label,
    sublabel = '',
    value,
    y,
    colDesc,
    colMonto,
    descW,
    bold = false,
  } = opts;

  const valueY = sublabel ? y + 2 : y;
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COLORS.text)
    .text(label, colDesc, y, { width: descW, lineBreak: false });

  if (sublabel) {
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted)
      .text(sublabel, colDesc, y + 12, { width: descW, lineBreak: false });
  }

  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COLORS.text)
    .text(value, colMonto, valueY, { width: 110, align: 'right', lineBreak: false });

  return y + (sublabel ? 28 : 17);
}

function drawFacturaRecibo(doc, factura, formatNum) {
  const boxContentH = 228;
  ensureSpace(doc, boxContentH + 8);
  const startY = doc.y;
  const pad = 14;

  doc.save();
  doc.roundedRect(MARGIN, startY, CONTENT_W, 8, 2).fill(COLORS.primary);

  const boxY = startY + 8;
  doc.roundedRect(MARGIN, boxY, CONTENT_W, 218, 4)
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .stroke();

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primaryDark)
    .text('DETALLE DE FACTURACIÓN', MARGIN + pad, boxY + 12);

  doc.moveTo(MARGIN + pad, boxY + 30)
    .lineTo(MARGIN + CONTENT_W - pad, boxY + 30)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  const colDesc = MARGIN + pad;
  const colMonto = MARGIN + CONTENT_W - pad - 110;
  const rowW = CONTENT_W - pad * 2;
  const descW = colMonto - colDesc - 12;

  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted)
    .text('CONCEPTO', colDesc, boxY + 36)
    .text('IMPORTE', colMonto, boxY + 36, { width: 110, align: 'right' });

  let y = boxY + 50;

  const kwh = factura.consumoEnergiaKwh ?? factura.consumoEnergiaLinea ?? 0;
  const precio = factura.precioKwh ?? 0.613;
  const importeEnergia = factura.consumoEnergiaLinea ?? kwh;

  y = drawFacturaLineRow(doc, {
    label: 'Consumo de energía',
    sublabel: `${formatNum(kwh)} kWh`,
    value: `S/ ${formatNum(importeEnergia)}`,
    y,
    colDesc,
    colMonto,
    descW,
  });

  const lineas = [
    { label: 'Cargo fijo', value: `S/ ${formatNum(factura.cargoFijo)}` },
    { label: 'Mantenimiento y reposición de conexión', value: `S/ ${formatNum(factura.mantReposicion)}` },
    { label: 'Alumbrado público', value: `S/ ${formatNum(factura.alumbradoPublico)}` },
    { label: 'Interés compensatorio', value: `S/ ${formatNum(factura.interesCompensatorio)}` },
  ];

  lineas.forEach((row) => {
    y = drawFacturaLineRow(doc, {
      label: row.label,
      value: row.value,
      y,
      colDesc,
      colMonto,
      descW,
    });
  });

  y += 4;
  doc.moveTo(colDesc, y).lineTo(colDesc + rowW, y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  y += 10;

  const subtotalRows = [
    { label: 'Subtotal', value: `S/ ${formatNum(factura.subtotal)}`, bold: true },
    { label: 'IGV (18%)', value: `S/ ${formatNum(factura.igv)}` },
    { label: 'Electrificación rural', value: `S/ ${formatNum(factura.electrificacionRural)}` },
  ];

  subtotalRows.forEach((row) => {
    y = drawFacturaLineRow(doc, {
      label: row.label,
      value: row.value,
      y,
      colDesc,
      colMonto,
      descW,
      bold: row.bold,
    });
  });

  y += 6;
  const totalY = y;
  doc.roundedRect(colDesc, totalY, rowW, 28, 4).fill(COLORS.bgTotal);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primaryDark)
    .text('TOTAL DEL MES', colDesc + 10, totalY + 8);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary)
    .text(`S/ ${formatNum(factura.totalMes)}`, colMonto, totalY + 7, { width: 110, align: 'right' });

  y = totalY + 36;
  doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted)
    .text(
      `Referencia tarifaria energía: S/ ${formatNum(factura.gastoEnergiaMensual)} (${formatNum(kwh)} kWh × S/ ${formatNum(precio)}).`,
      colDesc,
      y,
      { width: rowW, lineGap: 1 },
    );

  doc.restore();
  doc.y = boxY + boxContentH;
}

function drawEquiposTable(doc, title, items, formatNum) {
  if (!items.length) return;

  const cols = {
    nombre: { x: MARGIN + 8, w: 130 },
    potencia: { x: MARGIN + 142, w: 48 },
    consumo: { x: MARGIN + 194, w: 72 },
    gasto: { x: MARGIN + 270, w: 72 },
    anual: { x: MARGIN + 346, w: CONTENT_W - 354 },
  };

  const headerH = 20;
  const rowH = 18;

  const drawTableHeader = (tableY) => {
    doc.roundedRect(MARGIN, tableY, CONTENT_W, headerH, 3).fill(COLORS.bgPanel);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted)
      .text('EQUIPO', cols.nombre.x, tableY + 6, { width: cols.nombre.w })
      .text('POT.', cols.potencia.x, tableY + 6, { width: cols.potencia.w })
      .text('kWh/MES', cols.consumo.x, tableY + 6, { width: cols.consumo.w })
      .text('S/ MES', cols.gasto.x, tableY + 6, { width: cols.gasto.w })
      .text('S/ AÑO', cols.anual.x, tableY + 6, { width: cols.anual.w, align: 'right' });
    return tableY + headerH;
  };

  ensureSpace(doc, 36 + headerH + rowH);
  let startY = doc.y;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
    .text(title.toUpperCase(), MARGIN, startY);

  let tableY = startY + 18;
  let tableStartY = tableY;
  let rowY = drawTableHeader(tableY);

  items.forEach((item, i) => {
    if (rowY + rowH > getMaxContentY(doc)) {
      doc.roundedRect(MARGIN, tableStartY, CONTENT_W, rowY - tableStartY, 3)
        .lineWidth(0.75)
        .strokeColor(COLORS.border)
        .stroke();

      doc.addPage();
      applyPdfPageMargins(doc);
      doc.y = MARGIN;
      startY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
        .text(title.toUpperCase(), MARGIN, startY);
      tableY = startY + 18;
      tableStartY = tableY;
      rowY = drawTableHeader(tableY);
    }

    if (i % 2 === 0) {
      doc.rect(MARGIN, rowY, CONTENT_W, rowH).fill('#fafbfc');
    }
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.text)
      .text(String(item.nombre).substring(0, 28), cols.nombre.x, rowY + 5, { width: cols.nombre.w })
      .text(`${item.potencia_w}W`, cols.potencia.x, rowY + 5, { width: cols.potencia.w })
      .text(formatNum(item.consumo_mes), cols.consumo.x, rowY + 5, { width: cols.consumo.w })
      .text(formatNum(item.gasto_mensual), cols.gasto.x, rowY + 5, { width: cols.gasto.w })
      .text(formatNum(item.gasto_anual), cols.anual.x, rowY + 5, { width: cols.anual.w, align: 'right' });
    rowY += rowH;
  });

  doc.roundedRect(MARGIN, tableY, CONTENT_W, rowY - tableY, 3)
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .stroke();

  doc.y = rowY + 16;
}

function drawModuloResumen(doc, totalesModulos, formatNum) {
  if (!totalesModulos.length) return;

  drawPanel(doc, 'Resumen por categoría', (x, w) => {
    let y = doc.y;
    totalesModulos.forEach(({ label, totales: t }) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary).text(label, x, y, { width: w });
      y += 14;
      y = drawKeyValueRow(
        doc, x, y, w,
        'Consumo mensual / Gasto mensual',
        `${formatNum(t.consumoMes)} kWh  ·  S/ ${formatNum(t.gastoMensual)}`,
        { size: 8 }
      );
      y += 4;
    });
    return y;
  });
}

function drawRecomendacionesPanel(doc, recomendaciones) {
  if (!recomendaciones?.length) return;

  ensureSpace(doc, 44);
  const pad = 12;
  const textW = CONTENT_W - pad * 2;
  let y = doc.y;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
    .text('DATOS TÉCNICOS Y CONSEJOS PARA AHORRAR ENERGÍA', MARGIN + pad, y + 4, {
      width: textW,
      lineBreak: false,
    });
  y = doc.y + 10;

  recomendaciones.forEach((rec, index) => {
    if (index > 0) y += 4;

    doc.font('Helvetica-Bold').fontSize(8.5);
    const titleH = doc.heightOfString(rec.nombre.toUpperCase(), { width: textW });
    doc.font('Helvetica').fontSize(8);
    const lines = wrapTextLines(doc, rec.texto, textW);
    const lineStep = 8 + 1.5;
    const blockH = titleH + lines.length * lineStep + 12;

    ensureSpace(doc, blockH);
    y = doc.y;

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.primary)
      .text(rec.nombre.toUpperCase(), MARGIN + pad, y, { width: textW, lineBreak: false, ellipsis: true });
    doc.y = doc.y + 2;

    drawTextBlock(doc, rec.texto, MARGIN + pad, textW, {
      size: 8,
      lineGap: 1.5,
    });
    y = doc.y + 6;
    doc.y = y;
  });

  doc.y = y + 8;
}

const FOOTER_HEIGHT_BASE = FOOTER_HEIGHT;

const FOOTER_SOCIAL_ORDER = ['instagram', 'facebook', 'tiktok', 'whatsapp'];

function drawFooter(doc, contacto = {}) {
  const empresaNombre = contacto.empresaNombre || 'ELECTRIXSTUDIO';
  const empresaTagline = contacto.empresaTagline || 'Auditoría & Soluciones de Eficiencia Energética';
  const socialLinks = buildSocialLinks(contacto);
  const socialById = Object.fromEntries(socialLinks.map((link) => [link.id, link]));
  const contactInfo = buildContactInfoItems(contacto);

  const pages = doc.bufferedPageRange();
  const padX = 10;
  const innerLeft = MARGIN + padX;
  const innerW = CONTENT_W - padX * 2;
  const footerHeight = FOOTER_HEIGHT_BASE;
  const footerBottom = (pageH) => pageH - FOOTER_FROM_BOTTOM;
  const bannerY = (pageH) => footerBottom(pageH) - footerHeight;

  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);

    const savedMargins = { ...doc.page.margins };
    const savedY = doc.y;
    const pageH = doc.page.height;
    const footY = bannerY(pageH);

    doc.page.margins.bottom = FOOTER_FROM_BOTTOM;

    doc.save();

    drawFooterBar(doc, MARGIN, footY, CONTENT_W, footerHeight, 7, '#0f172a');

    doc.save();
    doc.moveTo(MARGIN, footY + footerHeight)
      .lineTo(MARGIN, footY + 7)
      .quadraticCurveTo(MARGIN, footY, MARGIN + 7, footY)
      .lineTo(MARGIN + 3, footY)
      .lineTo(MARGIN + 3, footY + footerHeight)
      .closePath()
      .fill('#2563eb');
    doc.restore();

    doc.moveTo(MARGIN, footY)
      .lineTo(MARGIN + CONTENT_W, footY)
      .lineWidth(0.6)
      .strokeColor('#334155')
      .stroke();

    drawFixedText(doc, empresaNombre, innerLeft, footY + 7, {
      font: 'Helvetica-Bold',
      size: 8.5,
      color: '#ffffff',
      width: innerW,
    });

    drawFixedText(doc, empresaTagline, innerLeft, footY + 17, {
      size: 6.5,
      color: '#94a3b8',
      width: innerW,
    });

    let contactX = innerLeft;
    const contactY = footY + 28;
    contactInfo.forEach((item, idx) => {
      if (idx > 0) {
        drawFixedText(doc, '·', contactX, contactY, { size: 6, color: '#475569' });
        contactX += 8;
      }
      drawContactIcon(doc, item.id, contactX, contactY + 1, 6);
      contactX += 9;
      drawFixedText(doc, item.value, contactX, contactY, {
        size: 6.2,
        color: '#e2e8f0',
      });
      contactX += doc.widthOfString(item.value) + 8;
    });

    const dividerY = footY + 40;
    doc.moveTo(innerLeft, dividerY)
      .lineTo(innerLeft + innerW, dividerY)
      .lineWidth(0.4)
      .strokeColor('#334155')
      .stroke();

    drawFixedText(doc, 'REDES SOCIALES', innerLeft, dividerY + 4, {
      font: 'Helvetica-Bold',
      size: 6,
      color: '#64748b',
    });

    const socialY = dividerY + 9;
    const socialH = 24;
    const colCount = FOOTER_SOCIAL_ORDER.length;
    const colGap = 4;
    const colW = (innerW - colGap * (colCount - 1)) / colCount;
    const iconSize = 11;

    FOOTER_SOCIAL_ORDER.forEach((id, index) => {
      const link = socialById[id] || {
        id,
        nombre: SOCIAL_PLATFORM_LABELS[id],
        hasLogo: false,
      };
      const colX = innerLeft + index * (colW + colGap);
      const textX = colX + iconSize + 6;
      const textW = colW - iconSize - 9;

      doc.roundedRect(colX, socialY, colW, socialH, 3).fill('#1e293b');
      doc.roundedRect(colX, socialY, colW, socialH, 3)
        .lineWidth(0.35)
        .strokeColor('#475569')
        .stroke();

      if (link.hasLogo) {
        doc.image(link.logoPath, colX + 4, socialY + 6, { width: iconSize, height: iconSize });
      }

      drawFixedText(doc, link.nombre, textX, socialY + 5, {
        font: 'Helvetica-Bold',
        size: 6,
        color: '#f8fafc',
        width: textW,
        ellipsis: true,
      });

      drawFixedText(doc, SOCIAL_PLATFORM_LABELS[id], textX, socialY + 14, {
        size: 5.6,
        color: '#94a3b8',
        width: textW,
        ellipsis: true,
      });
    });

    doc.restore();

    doc.page.margins.bottom = savedMargins.bottom;
    doc.y = savedY;
  }

  doc.switchToPage(pages.start + pages.count - 1);
}

module.exports = {
  drawHeaderBand,
  drawClientePanel,
  drawResumenPanel,
  drawModuloResumen,
  drawEquiposTable,
  drawRecomendacionesPanel,
  drawFacturaRecibo,
  drawFooter,
  applyPdfPageMargins,
  PDF_BOTTOM_MARGIN,
  MARGIN,
  COLORS,
};
