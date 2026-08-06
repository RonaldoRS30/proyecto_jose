/**
 * Diseño PDF — Recibo de consumo eléctrico (formal y estructurado)
 */

const fs = require('fs');
const path = require('path');

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

function formatDatePE(date) {
  return new Date(date).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ensureSpace(doc, needed) {
  const bottom = doc.page.height - MARGIN - 55;
  if (doc.y + needed > bottom) {
    doc.addPage();
    doc.y = MARGIN;
  }
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
  drawPanel(doc, 'Datos del titular', (x, w) => {
    let y = doc.y;
    const rows = [
      ['Titular', `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim()],
      ['Documento', cliente.documento || '—'],
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

function drawFacturaRecibo(doc, factura, formatNum) {
  ensureSpace(doc, 220);
  const startY = doc.y;
  const pad = 14;

  doc.save();
  doc.roundedRect(MARGIN, startY, CONTENT_W, 8, 2).fill(COLORS.primary);

  const boxY = startY + 8;
  doc.roundedRect(MARGIN, boxY, CONTENT_W, 200, 4)
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

  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted)
    .text('CONCEPTO', colDesc, boxY + 36)
    .text('IMPORTE', colMonto, boxY + 36, { width: 110, align: 'right' });

  let y = boxY + 50;

  const lineas = [
    { 
      label: `Consumo de energía (${formatNum(factura.consumoEnergiaKwh)} kWh × S/ ${formatNum(factura.precioKwh || 0.613)})`, 
      value: `S/ ${formatNum(factura.gastoEnergiaMensual)}` 
    },
    { label: 'Cargo fijo', value: `S/ ${formatNum(factura.cargoFijo)}` },
    { label: 'Mantenimiento y reposición de conexión', value: `S/ ${formatNum(factura.mantReposicion)}` },
    { label: 'Alumbrado público', value: `S/ ${formatNum(factura.alumbradoPublico)}` },
    { label: 'Interés compensatorio', value: `S/ ${formatNum(factura.interesCompensatorio)}` },
  ];

  lineas.forEach((row) => {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text)
      .text(row.label, colDesc, y, { width: 280 });
    doc.text(row.value, colMonto, y, { width: 110, align: 'right' });
    y += 17;
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
    doc.font(row.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COLORS.text)
      .text(row.label, colDesc, y, { width: 280 });
    doc.text(row.value, colMonto, y, { width: 110, align: 'right' });
    y += 17;
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
      `Referencia tarifaria energía: S/ ${formatNum(factura.gastoEnergiaMensual)} (precio unitario × kWh mensual).`,
      colDesc,
      y,
      { width: rowW, lineGap: 1 }
    );

  doc.restore();
  doc.y = boxY + 210;
}

function drawEquiposTable(doc, title, items, formatNum) {
  if (!items.length) return;

  ensureSpace(doc, 40 + items.length * 14);
  const startY = doc.y;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
    .text(title.toUpperCase(), MARGIN, startY);

  const tableY = startY + 18;
  const cols = {
    nombre: { x: MARGIN + 8, w: 130 },
    potencia: { x: MARGIN + 142, w: 48 },
    consumo: { x: MARGIN + 194, w: 72 },
    gasto: { x: MARGIN + 270, w: 72 },
    anual: { x: MARGIN + 346, w: CONTENT_W - 354 },
  };

  const headerH = 20;
  doc.roundedRect(MARGIN, tableY, CONTENT_W, headerH, 3).fill(COLORS.bgPanel);

  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted)
    .text('EQUIPO', cols.nombre.x, tableY + 6, { width: cols.nombre.w })
    .text('POT.', cols.potencia.x, tableY + 6, { width: cols.potencia.w })
    .text('kWh/MES', cols.consumo.x, tableY + 6, { width: cols.consumo.w })
    .text('S/ MES', cols.gasto.x, tableY + 6, { width: cols.gasto.w })
    .text('S/ AÑO', cols.anual.x, tableY + 6, { width: cols.anual.w, align: 'right' });

  let rowY = tableY + headerH;
  items.forEach((item, i) => {
    const rowH = 18;
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

  drawPanel(doc, 'Datos técnicos y consejos para ahorrar energía', (x, w) => {
    let y = doc.y;

    recomendaciones.forEach((rec, index) => {
      if (index > 0) y += 6;
      doc.y = y;
      ensureSpace(doc, 40);
      y = doc.y;

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.primary)
        .text(rec.nombre.toUpperCase(), x, y, { width: w });
      y = doc.y + 2;

      doc.font('Helvetica').fontSize(8).fillColor(COLORS.text)
        .text(rec.texto, x, y, { width: w, lineGap: 1.5, align: 'justify' });
      y = doc.y + 8;
    });

    return y;
  });
}

function drawFooter(doc) {
  const pages = doc.bufferedPageRange();
  
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.save();

    const bannerH = 44;
    const bannerY = doc.page.height - MARGIN - bannerH;

    // Fondo oscuro elegante para la publicidad/branding
    doc.roundedRect(MARGIN, bannerY, CONTENT_W, bannerH, 6)
       .fill('#0f172a');

    // Tira lateral azul eléctrico de acento
    doc.roundedRect(MARGIN, bannerY, 5, bannerH, 2)
       .fill('#2563eb');

    // Columna Izquierda: Branding & Eslogan
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
       .text('ELECTRIXSTUDIO', MARGIN + 14, bannerY + 8);
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
       .text('Auditoría & Soluciones de Eficiencia Energética', MARGIN + 14, bannerY + 23);

    // Columna Derecha: Datos de Contacto bien estructurados
    const contactX = MARGIN + 210;
    const contactW = CONTENT_W - 220;

    // Fila 1: Web y Correo
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#38bdf8')
       .text('WEB: ', contactX, bannerY + 9, { continued: true, width: contactW, align: 'right' })
       .font('Helvetica').fillColor('#f8fafc')
       .text('electrixstudio.com', { continued: true })
       .font('Helvetica-Bold').fillColor('#38bdf8')
       .text('   |   CORREO: ', { continued: true })
       .font('Helvetica').fillColor('#f8fafc')
       .text('contacto@electrixstudio.com');

    // Fila 2: Teléfono / WhatsApp
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#38bdf8')
       .text('TEL / WHATSAPP: ', contactX, bannerY + 23, { width: contactW, align: 'right', continued: true })
       .font('Helvetica').fillColor('#f8fafc')
       .text('+51 987 654 321  ·  Atención a Nivel Nacional');

    // Pie de página inferior fuera del banner (Número de página)
    doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.muted)
       .text(
         `Página ${i + 1} de ${pages.count}  ·  Documento informativo generado por ElectrixStudio`,
         MARGIN,
         bannerY + bannerH + 3,
         { width: CONTENT_W, align: 'center' }
       );

    doc.restore();
  }
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
  COLORS,
};
