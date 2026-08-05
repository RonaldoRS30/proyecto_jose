/**
 * pdfChartsLayout.js — Gráficos nativos con PDFKit
 * Incluye todos los gráficos del dashboard del cliente:
 *  1. Consumo por Módulo (barras verticales)
 *  2. Gasto por Módulo (barras verticales)
 *  3. Resumen de Gastos Diario / Mensual / Anual
 *  4. Gasto por Equipo (barras horizontales)
 *  5. Consumo por Equipo (barras horizontales)
 *  6. Distribución por Categoría (barras horizontales + leyenda)
 */

const MARGIN = 42;
const PAGE_WIDTH = 595.28;
const CONTENT_W = PAGE_WIDTH - MARGIN * 2;

const C = {
  primary:    '#1A4AB0',
  green:      '#10b981',
  amber:      '#f59e0b',
  red:        '#ef4444',
  purple:     '#8b5cf6',
  cyan:       '#06b6d4',
  pink:       '#ec4899',
  lime:       '#84cc16',
  orange:     '#f97316',
  indigo:     '#6366f1',
  muted:      '#64748b',
  text:       '#1f2937',
  border:     '#cbd5e1',
  bgLight:    '#f8fafc',
  bgAlt:      '#f1f5f9',
  white:      '#ffffff',
};

const PALETTE = [
  C.primary, C.green, C.amber, C.red, C.purple,
  C.cyan, C.pink, C.lime, C.orange, C.indigo,
];

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - MARGIN) {
    doc.addPage();
    doc.y = MARGIN;
  }
}

/* ─── TÍTULO DE SECCIÓN ──────────────────────────────────────────── */
function sectionTitle(doc, text, sub = '') {
  ensureSpace(doc, 36);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.primary)
    .text(text, MARGIN, doc.y);
  if (sub) {
    doc.moveDown(0.15);
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted).text(sub, MARGIN, doc.y);
  }
  doc.moveDown(0.6);
}

/* ─── SEPARADOR FINO ─────────────────────────────────────────────── */
function divider(doc) {
  ensureSpace(doc, 16);
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y)
    .strokeColor(C.border).lineWidth(0.5).stroke();
  doc.moveDown(0.8);
}

/* ─── LEYENDA ────────────────────────────────────────────────────── */
function drawLegend(doc, items) {
  // items: [{color, label}]
  let x = MARGIN;
  const y = doc.y;
  items.forEach((item) => {
    doc.rect(x, y + 1, 10, 8).fill(item.color);
    doc.font('Helvetica').fontSize(7.5).fillColor(C.text)
      .text(item.label, x + 13, y, { lineBreak: false });
    x += 13 + doc.widthOfString(item.label) + 18;
  });
  doc.moveDown(1.2);
}

/* ─── BARRAS HORIZONTALES ────────────────────────────────────────── */
/**
 * @param {object} opts
 * opts.title    string
 * opts.sub      string
 * opts.items    [{label, value, value2?}]  (value2 opcional = segunda barra)
 * opts.unit     string ('kWh', 'S/')
 * opts.color    string  (color de la barra principal)
 * opts.color2   string? (color segunda barra)
 * opts.legend   [{color,label}]? 
 * opts.maxBars  number
 */
function drawHBars(doc, opts) {
  const { title, sub = '', items = [], unit = '', color = C.primary, color2 = null, legend = null, maxBars = 10 } = opts;

  const data = [...items]
    .filter(d => (d.value || 0) > 0 || (d.value2 || 0) > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, maxBars);

  if (!data.length) return;

  const BAR_H   = color2 ? 8 : 13;   // si hay dos barras, más delgadas
  const BAR_GAP = color2 ? 4 : 0;
  const ROW_H   = color2 ? 28 : 22;
  const LABEL_W = 130;
  const chartH  = data.length * ROW_H + 30;

  ensureSpace(doc, chartH + 50);
  sectionTitle(doc, title, sub);

  if (legend) drawLegend(doc, legend);

  const chartY   = doc.y;
  const barAreaX = MARGIN + LABEL_W + 8;
  const barAreaW = CONTENT_W - LABEL_W - 8;
  const maxVal   = Math.max(...data.map(d => Math.max(d.value || 0, d.value2 || 0)), 1);

  data.forEach((item, i) => {
    const rowY = chartY + i * ROW_H;

    // Fondo alternado
    if (i % 2 === 0) {
      doc.rect(MARGIN, rowY - 2, CONTENT_W, ROW_H).fill(C.bgAlt).fillOpacity(1);
    }

    // Etiqueta — sin truncar, font pequeño
    doc.font('Helvetica').fontSize(7.5).fillColor(C.text)
      .text(String(item.label || ''), MARGIN, rowY + (color2 ? 5 : 6),
        { width: LABEL_W - 4, lineBreak: false });

    // Barra principal
    const w1 = Math.max(4, (item.value / maxVal) * barAreaW);
    doc.roundedRect(barAreaX, rowY + (color2 ? 2 : 4), w1, BAR_H, 2).fill(color);

    // Barra secundaria
    if (color2 && item.value2 > 0) {
      const w2 = Math.max(4, (item.value2 / maxVal) * barAreaW);
      doc.roundedRect(barAreaX, rowY + BAR_H + BAR_GAP + 2, w2, BAR_H, 2).fill(color2);
    }

    // Valor al final de la barra
    const valTxt = `${(item.value || 0).toFixed(2)} ${unit}`;
    doc.font('Helvetica').fontSize(6.5).fillColor(C.muted)
      .text(valTxt, barAreaX + w1 + 4, rowY + (color2 ? 3 : 6), { lineBreak: false });
  });

  // Marco
  doc.roundedRect(MARGIN, chartY - 2, CONTENT_W, data.length * ROW_H + 4, 3)
    .lineWidth(0.5).strokeColor(C.border).stroke();

  doc.y = chartY + data.length * ROW_H + 14;
}

/* ─── BARRAS VERTICALES ──────────────────────────────────────────── */
/**
 * @param {object} opts
 * opts.title    string
 * opts.items    [{label, value, value2?}]
 * opts.unit     string
 * opts.color    string | string[]
 * opts.color2   string?
 * opts.legend   [{color,label}]?
 * opts.chartH   number (height px)
 */
function drawVBars(doc, opts) {
  const {
    title, sub = '', items = [], unit = '', legend = null,
    chartH = 110, originX = MARGIN, originW = CONTENT_W,
  } = opts;

  const data = items.filter(d => d !== null);
  if (!data.length) return;

  ensureSpace(doc, chartH + 80);
  if (title) sectionTitle(doc, title, sub);
  if (legend) drawLegend(doc, legend);

  const startY   = doc.y;
  const innerPad = 10;
  const innerX   = originX + innerPad;
  const innerW   = originW - innerPad * 2;
  const barSlotW = Math.floor(innerW / data.length);
  const BAR_W    = Math.max(20, barSlotW - 16);

  const maxVal = Math.max(...data.map(d => Math.max(d.value || 0, d.value2 || 0)), 1);

  // Líneas de referencia
  [0.25, 0.5, 0.75, 1.0].forEach(pct => {
    const ly = startY + chartH - Math.round(pct * chartH);
    doc.moveTo(innerX, ly).lineTo(innerX + innerW, ly)
      .strokeColor('#e2e8f0').lineWidth(0.4).stroke();
    const refVal = maxVal * pct;
    doc.font('Helvetica').fontSize(6).fillColor(C.muted)
      .text(refVal.toFixed(1), originX, ly - 4,
        { width: innerPad - 2, align: 'right', lineBreak: false });
  });

  data.forEach((item, i) => {
    const slotX   = innerX + i * barSlotW;
    const bx      = slotX + Math.floor((barSlotW - BAR_W) / 2);
    const val     = item.value || 0;
    const barH    = Math.max(4, Math.round((val / maxVal) * chartH));
    const by      = startY + chartH - barH;
    const barColor = Array.isArray(opts.color)
      ? opts.color[i % opts.color.length]
      : (opts.color || PALETTE[i % PALETTE.length]);

    // Barra principal
    doc.roundedRect(bx, by, BAR_W, barH, 3).fill(barColor);

    // Valor encima
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.text)
      .text(val.toFixed(1), bx - 2, by - 12,
        { width: BAR_W + 4, align: 'center', lineBreak: false });

    // Segunda barra (si hay)
    if (opts.color2 && item.value2 != null) {
      const bW2   = Math.max(8, BAR_W / 2 - 2);
      const bx2   = bx + BAR_W / 2;
      const barH2 = Math.max(2, Math.round((item.value2 / maxVal) * chartH));
      const by2   = startY + chartH - barH2;
      doc.roundedRect(bx2 - bW2 / 2, by2, bW2, barH2, 2).fill(opts.color2);
    }

    // Etiqueta debajo (con salto de línea)
    const label = String(item.label || '');
    doc.font('Helvetica').fontSize(7).fillColor(C.text)
      .text(label, bx - 4, startY + chartH + 5,
        { width: BAR_W + 8, align: 'center' });
  });

  // Marco
  doc.rect(innerX, startY, innerW, chartH)
    .lineWidth(0.5).strokeColor(C.border).stroke();

  // Calcular cuánto espacio ocuparon las etiquetas abajo
  const maxLabelLines = Math.max(...data.map(d => {
    const words = String(d.label || '').split(' ');
    return words.length > 1 ? 2 : 1;
  }));
  doc.y = startY + chartH + 10 + maxLabelLines * 10;
}

/* ─── GRÁFICO PIE (simulado con rectángulos + leyenda) ───────────── */
function drawPieSimulated(doc, opts) {
  const { title, sub = '', items = [] } = opts;
  if (!items.length) return;

  const total = items.reduce((s, d) => s + (d.value || 0), 0);
  if (total <= 0) return;

  ensureSpace(doc, 120);
  sectionTitle(doc, title, sub);

  const startY = doc.y;
  const squareSize = 16;
  const barH = 18;
  const barAreaW = CONTENT_W - 200;

  items.forEach((item, i) => {
    const pct = item.value / total;
    const barW = Math.max(4, pct * barAreaW);
    const rowY = startY + i * (barH + 4);
    const color = PALETTE[i % PALETTE.length];

    // Cuadro de color
    doc.rect(MARGIN, rowY + 3, squareSize, squareSize - 4).fill(color);

    // Etiqueta
    doc.font('Helvetica').fontSize(8).fillColor(C.text)
      .text(String(item.label || ''), MARGIN + squareSize + 6, rowY + 4,
        { width: 160 - squareSize - 6, lineBreak: false });

    // Barra de proporción
    doc.roundedRect(MARGIN + 170, rowY + 5, barW, barH - 6, 2).fill(color);

    // Porcentaje y valor
    const pctTxt = `${(pct * 100).toFixed(1)}% · ${item.value.toFixed(2)} kWh`;
    doc.font('Helvetica').fontSize(7).fillColor(C.muted)
      .text(pctTxt, MARGIN + 170 + barW + 6, rowY + 5, { lineBreak: false });
  });

  doc.y = startY + items.length * (barH + 4) + 14;
}

/* ─── SECCIÓN COMPLETA ───────────────────────────────────────────── */
function drawChartsSection(doc, { detalles = [], totalesModulos = [], resumen = {}, formatNum }) {

  // ── NUEVA PÁGINA ──────────────────────────────────────────────────
  doc.addPage();
  doc.y = MARGIN;

  // Encabezado de la sección
  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.primary)
    .text('ANÁLISIS GRÁFICO DE CONSUMO', MARGIN, doc.y, { align: 'center', width: CONTENT_W });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
    .text('Representación visual completa de los datos del cálculo', MARGIN, doc.y, { align: 'center', width: CONTENT_W });
  doc.moveDown(1.5);
  divider(doc);

  // ── 1. CONSUMO Y GASTO POR MÓDULO ─────────────────────────────────
  const moduloItems = totalesModulos.map((m) => ({
    label: m.label,           // "Electrodomésticos", "Consumo Fantasma", "Iluminación"
    value: parseFloat(m.totales?.consumoMes) || 0,
    value2: parseFloat(m.totales?.gastoMensual) || 0,
  }));

  if (moduloItems.some(m => m.value > 0 || m.value2 > 0)) {
    ensureSpace(doc, 200);
    const colW = (CONTENT_W - 14) / 2;

    const savedY = doc.y;

    // Izquierda: Consumo
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.primary)
      .text('CONSUMO POR MÓDULO (kWh/mes)', MARGIN, savedY);
    doc.y = savedY + 18;
    drawVBars(doc, {
      items: moduloItems.map(m => ({ label: m.label, value: m.value })),
      unit: 'kWh',
      color: [C.primary, C.green, C.amber],
      chartH: 100,
      originX: MARGIN,
      originW: colW,
    });

    const afterLeft = doc.y;
    doc.y = savedY;

    // Derecha: Gasto
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.primary)
      .text('GASTO POR MÓDULO (S/mes)', MARGIN + colW + 14, savedY);
    doc.y = savedY + 18;
    drawVBars(doc, {
      items: moduloItems.map(m => ({ label: m.label, value: m.value2 })),
      unit: 'S/',
      color: [C.green, C.amber, C.red],
      chartH: 100,
      originX: MARGIN + colW + 14,
      originW: colW,
    });

    doc.y = Math.max(afterLeft, doc.y) + 10;
    divider(doc);
  }

  // ── 2. RESUMEN DE GASTOS (Diario / Mensual / Anual) ───────────────
  const gastosItems = [
    { label: 'Gasto Diario',   value: parseFloat(resumen.gastoDiario)  || 0 },
    { label: 'Gasto Mensual',  value: parseFloat(resumen.gastoMensual) || 0 },
    { label: 'Gasto Anual',    value: parseFloat(resumen.gastoAnual)   || 0 },
  ].filter(g => g.value > 0);

  if (gastosItems.length > 0) {
    drawVBars(doc, {
      title: 'RESUMEN DE GASTOS (S/)',
      sub: 'Gasto energético estimado por período',
      items: gastosItems,
      unit: 'S/',
      color: [C.cyan, C.primary, C.purple],
      chartH: 110,
      originX: MARGIN,
      originW: CONTENT_W,
    });
    divider(doc);
  }

  // ── 3. GASTO POR EQUIPO ───────────────────────────────────────────
  const gastoEquipoItems = (detalles)
    .filter(d => (parseFloat(d.gasto_mensual) || 0) > 0)
    .map(d => ({ label: d.nombre, value: parseFloat(d.gasto_mensual) || 0 }));

  if (gastoEquipoItems.length > 0) {
    drawHBars(doc, {
      title: 'GASTO POR EQUIPO (S/mes)',
      sub: 'Ordenado de mayor a menor — top 10 equipos',
      items: gastoEquipoItems,
      unit: 'S/',
      color: C.green,
      maxBars: 10,
    });
    divider(doc);
  }

  // ── 4. CONSUMO POR EQUIPO ─────────────────────────────────────────
  const consumoEquipoItems = (detalles)
    .filter(d => (parseFloat(d.consumo_mes) || 0) > 0)
    .map(d => ({ label: d.nombre, value: parseFloat(d.consumo_mes) || 0 }));

  if (consumoEquipoItems.length > 0) {
    drawHBars(doc, {
      title: 'CONSUMO POR EQUIPO (kWh/mes)',
      sub: 'Ordenado de mayor a menor — top 10 equipos',
      items: consumoEquipoItems,
      unit: 'kWh',
      color: C.primary,
      maxBars: 10,
    });
    divider(doc);
  }

  // ── 5. DISTRIBUCIÓN POR CATEGORÍA ─────────────────────────────────
  const catMap = {};
  detalles.forEach(d => {
    const cat = d.categoria || 'Sin categoría';
    catMap[cat] = (catMap[cat] || 0) + (parseFloat(d.consumo_mes) || 0);
  });

  const catItems = Object.entries(catMap)
    .map(([label, value]) => ({ label, value: parseFloat(value.toFixed(3)) }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (catItems.length > 0) {
    drawPieSimulated(doc, {
      title: 'DISTRIBUCIÓN POR CATEGORÍA (kWh/mes)',
      sub: 'Proporción de consumo mensual por tipo de equipo',
      items: catItems,
    });
    divider(doc);
  }

  // ── 6. GASTO ANUAL vs DIARIO por equipo (comparativa) ─────────────
  const comparativaItems = (detalles)
    .filter(d => (parseFloat(d.gasto_anual) || 0) > 0)
    .map(d => ({
      label:  d.nombre,
      value:  parseFloat(d.gasto_anual)   || 0,
      value2: parseFloat(d.gasto_diario)  || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (comparativaItems.length > 0) {
    drawHBars(doc, {
      title: 'GASTO ANUAL Y DIARIO POR EQUIPO (S/)',
      sub: 'Barra superior = Gasto anual  ·  Barra inferior = Gasto diario',
      items: comparativaItems,
      unit: 'S/',
      color: C.purple,
      color2: C.amber,
      legend: [
        { color: C.purple, label: 'Gasto anual (S/)' },
        { color: C.amber,  label: 'Gasto diario (S/)' },
      ],
      maxBars: 8,
    });
  }
}

module.exports = { drawChartsSection };
