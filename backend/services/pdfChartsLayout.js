/**
 * pdfChartsLayout.js — Gráficos horizontales estilo dashboard (PDFKit)
 * Layout: [Nombre completo] [████████ barra] [valor alineado]
 */

const {
  MARGIN,
  PDF_BOTTOM_MARGIN,
  applyPdfPageMargins,
} = require('./pdfReciboLayout');

const PAGE_WIDTH = 595.28;
const CONTENT_W = PAGE_WIDTH - MARGIN * 2;

const C = {
  primary: '#1A4AB0',
  primaryLight: '#2563d4',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  muted: '#64748b',
  text: '#1f2937',
  border: '#cbd5e1',
  bgLight: '#f8fafc',
  bgAlt: '#eef2f7',
  white: '#ffffff',
};

const PALETTE = [C.primary, C.primaryLight, C.green, C.amber, C.purple, C.cyan];

const LABEL_W = 132;
const VALUE_W = 64;
const BAR_H = 14;
const ROW_H = 28;
const ROW_PAD = 14;

function getMaxContentY(doc) {
  const bottom = doc.page?.margins?.bottom ?? PDF_BOTTOM_MARGIN;
  return doc.page.height - bottom;
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > getMaxContentY(doc)) {
    doc.addPage();
    applyPdfPageMargins(doc);
    doc.y = MARGIN;
  }
}

function formatValue(value, unit = '') {
  const n = Number(value) || 0;
  const num = n.toFixed(2);
  if (unit === 'S/') return `${num} S/`;
  if (unit === 'kWh') return `${num} kWh`;
  return unit ? `${num} ${unit}` : num;
}

function sectionTitle(doc, text, sub = '') {
  ensureSpace(doc, 38);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.primary)
    .text(text, MARGIN, doc.y, { width: CONTENT_W, lineGap: 0 });
  if (sub) {
    const titleH = doc.heightOfString(text, { width: CONTENT_W, lineGap: 0 });
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
      .text(sub, MARGIN, doc.y + titleH + 4, { width: CONTENT_W, lineGap: 0 });
    doc.y += titleH + doc.heightOfString(sub, { width: CONTENT_W, lineGap: 0 }) + 10;
  } else {
    doc.y += doc.heightOfString(text, { width: CONTENT_W, lineGap: 0 }) + 8;
  }
}

function divider(doc) {
  ensureSpace(doc, 12);
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y)
    .strokeColor(C.border).lineWidth(0.5).stroke();
  doc.moveDown(0.65);
}

function drawChartFrame(doc, x, y, w, h) {
  doc.save();
  doc.roundedRect(x, y, w, h, 6).fill(C.bgLight);
  doc.roundedRect(x, y, w, h, 6).lineWidth(0.6).strokeColor(C.border).stroke();
  doc.restore();
}

function drawChartHeader(doc, { title, sub, legend, originX, originW }) {
  let y = doc.y;

  if (title) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.primary)
      .text(title, originX, y, { width: originW, lineGap: 0 });
    y += doc.heightOfString(title, { width: originW, lineGap: 0 }) + 5;
  }

  if (sub) {
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
      .text(sub, originX, y, { width: originW, lineGap: 0 });
    y += doc.heightOfString(sub, { width: originW, lineGap: 0 }) + 8;
  }

  if (legend && legend.length) {
    y = drawLegend(doc, legend, originX, y, originW) + 6;
  }

  doc.y = y;
  return y;
}

function drawLegend(doc, items, x, y, maxWidth) {
  let cx = x;
  let cy = y;
  const rowH = 15;
  const gap = 28;

  items.forEach((item, index) => {
    doc.font('Helvetica').fontSize(7.5).fillColor(C.text);
    const itemW = 14 + doc.widthOfString(item.label);

    if (index > 0 && cx + itemW > x + maxWidth) {
      cx = x;
      cy += rowH;
    }

    doc.roundedRect(cx, cy + 3, 12, 9, 2).fill(item.color);
    doc.text(item.label, cx + 16, cy + 1, { lineBreak: false });
    cx += itemW + gap;
  });

  return cy + rowH;
}

/**
 * Barras horizontales limpias — estilo referencia del usuario.
 */
function drawCleanHBarsAt(doc, opts) {
  const {
    items = [],
    originX,
    originY,
    originW,
    color = C.green,
    color2 = null,
    unit = '',
    labelW = LABEL_W,
    valueW = VALUE_W,
    showValues = true,
  } = opts;

  const data = items.filter((d) => (d.value || 0) > 0 || (d.value2 || 0) > 0);
  if (!data.length) return originY;

  const barAreaX = originX + labelW + 6;
  const barAreaW = originW - labelW - valueW - 14;
  const maxVal = Math.max(...data.map((d) => Math.max(d.value || 0, d.value2 || 0)), 1);
  const dual = Boolean(color2);
  const rowH = dual ? 36 : ROW_H;

  data.forEach((item, i) => {
    const rowY = originY + i * rowH;

    if (i % 2 === 0) {
      doc.rect(originX + 4, rowY, originW - 8, rowH - 2).fill(C.bgAlt);
    }

    doc.font('Helvetica').fontSize(7.5).fillColor(C.text)
      .text(String(item.label || ''), originX + 10, rowY + (dual ? 10 : 8), {
        width: labelW - 12,
        lineGap: 0,
      });

    const w1 = Math.max(8, ((item.value || 0) / maxVal) * barAreaW);
    const barY = rowY + (dual ? 6 : 7);
    const barColor = Array.isArray(color) ? color[i % color.length] : color;

    doc.roundedRect(barAreaX, barY, w1, dual ? 10 : BAR_H, 4).fill(barColor);

    if (dual && (item.value2 || 0) > 0) {
      const w2 = Math.max(8, (item.value2 / maxVal) * barAreaW);
      doc.roundedRect(barAreaX, barY + 12, w2, 10, 4).fill(color2);
    }

    if (showValues) {
      if (dual) {
        doc.font('Helvetica').fontSize(7).fillColor(C.muted)
          .text(formatValue(item.value, unit), originX + originW - valueW - 6, rowY + 4, {
            width: valueW,
            align: 'right',
            lineBreak: false,
          });
        if ((item.value2 || 0) > 0) {
          doc.font('Helvetica').fontSize(6.5).fillColor(C.muted)
            .text(formatValue(item.value2, unit), originX + originW - valueW - 6, rowY + 16, {
              width: valueW,
              align: 'right',
              lineBreak: false,
            });
        }
      } else {
        const valTxt = formatValue(item.value, unit);
        doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
          .text(valTxt, originX + originW - valueW - 6, rowY + 9, {
            width: valueW,
            align: 'right',
            lineBreak: false,
          });
      }
    }
  });

  return originY + data.length * rowH + ROW_PAD;
}

function drawCleanHBars(doc, opts) {
  const {
    title,
    sub = '',
    items = [],
    color = C.green,
    color2 = null,
    unit = '',
    legend = null,
    maxBars = 10,
    originX = MARGIN,
    originW = CONTENT_W,
  } = opts;

  const data = [...items]
    .filter((d) => (d.value || 0) > 0 || (d.value2 || 0) > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, maxBars);

  if (!data.length) return;

  const dual = Boolean(color2);
  const rowH = dual ? 38 : ROW_H;
  const valueW = dual ? 72 : VALUE_W;
  const chartH = data.length * rowH + ROW_PAD + 12;
  const estimatedHeaderH = (title ? 18 : 0) + (sub ? 16 : 0) + (legend ? 24 : 0) + 10;

  ensureSpace(doc, estimatedHeaderH + chartH + 14);

  const headerEndY = drawChartHeader(doc, {
    title,
    sub,
    legend,
    originX,
    originW,
  });

  const frameY = headerEndY + 6;
  drawChartFrame(doc, originX, frameY, originW, chartH);

  const bottomY = drawCleanHBarsAt(doc, {
    items: data,
    originX: originX + 6,
    originY: frameY + 10,
    originW: originW - 12,
    color,
    color2,
    unit,
    valueW,
  });

  doc.y = Math.max(bottomY + 8, frameY + chartH + 10);
}

function drawPieChartAt(doc, items, cx, cy, radius) {
  const total = items.reduce((s, d) => s + (d.value || 0), 0);
  if (total <= 0) return;

  let angle = -Math.PI / 2;

  items.forEach((item, i) => {
    const slice = ((item.value || 0) / total) * Math.PI * 2;
    if (slice <= 0) return;

    const end = angle + slice;
    const color = PALETTE[i % PALETTE.length];

    doc.save();
    doc.fillColor(color);
    doc.moveTo(cx, cy);
    doc.arc(cx, cy, radius, angle, end);
    doc.lineTo(cx, cy);
    doc.fill();
    doc.restore();

    angle = end;
  });

  doc.circle(cx, cy, radius).lineWidth(0.6).strokeColor(C.white).stroke();
}

function drawVerticalLegend(doc, items, x, y, maxWidth) {
  let cy = y;
  const rowH = 13;

  items.forEach((item) => {
    doc.roundedRect(x, cy + 1, 10, 10, 2).fill(item.color);
    doc.font('Helvetica').fontSize(7).fillColor(C.text)
      .text(item.label, x + 14, cy, {
        width: maxWidth - 18,
        lineBreak: false,
      });
    cy += rowH;
  });

  return cy;
}

function computeCategoryPanelHeight(items) {
  const count = items.filter((d) => d.value > 0).length;
  if (!count) return 170;

  const titleH = 30;
  const legendH = count * 13 + 12;
  const pieMin = 86;
  return titleH + pieMin + legendH + 14;
}

function drawCategoryPiePanel(doc, items, originX, originY, panelW, panelH) {
  const sorted = [...items].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  if (!sorted.length) return;

  drawChartFrame(doc, originX, originY, panelW, panelH);

  const titleH = 30;
  const legendRowH = 13;
  const legendPad = 12;
  const legendH = sorted.length * legendRowH + legendPad;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.primary)
    .text('Distribución por Categoría', originX + 8, originY + 10, {
      width: panelW - 16,
      align: 'center',
      lineGap: 0,
    });

  const pieTop = originY + titleH;
  const pieBottom = originY + panelH - legendH - 6;
  const pieAreaH = Math.max(60, pieBottom - pieTop);
  const cx = originX + panelW / 2;
  const cy = pieTop + pieAreaH / 2;
  const radius = Math.min(44, pieAreaH / 2 - 4, panelW / 2 - 20);

  drawPieChartAt(doc, sorted, cx, cy, radius);

  const total = sorted.reduce((s, d) => s + d.value, 0);
  const legendItems = sorted.map((item, i) => ({
    color: PALETTE[i % PALETTE.length],
    label: `${item.label}: ${formatValue(item.value, 'kWh')} (${((item.value / total) * 100).toFixed(1)}%)`,
  }));

  const legendY = originY + panelH - legendH + 4;
  drawVerticalLegend(doc, legendItems, originX + 10, legendY, panelW - 20);
}

function drawConsumoCategoryRow(doc, consumoItems, catItems) {
  const halfW = (CONTENT_W - 14) / 2;
  const barData = consumoItems.slice(0, 6);
  const rowCount = Math.max(barData.length, 3);
  const leftPanelH = Math.max(170, rowCount * ROW_H + ROW_PAD + 44);
  const catPanelH = computeCategoryPanelHeight(catItems);
  const panelH = Math.max(leftPanelH, catPanelH);

  ensureSpace(doc, panelH + 20);

  const topY = doc.y;

  drawChartFrame(doc, MARGIN, topY, halfW, panelH);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.primary)
    .text('Consumo por Equipo (kWh)', MARGIN + 10, topY + 10, { width: halfW - 20 });

  drawCleanHBarsAt(doc, {
    items: barData,
    originX: MARGIN + 6,
    originY: topY + 30,
    originW: halfW - 12,
    color: C.primary,
    unit: 'kWh',
    labelW: 88,
    valueW: 52,
  });

  drawCategoryPiePanel(doc, catItems, MARGIN + halfW + 14, topY, halfW, panelH);

  doc.y = topY + panelH + 12;
}

function drawModuloCharts(doc, moduloItems) {
  const active = moduloItems.filter((m) => m.value > 0 || m.value2 > 0);
  if (!active.length) return;

  drawCleanHBars(doc, {
    title: 'CONSUMO POR MÓDULO (kWh/mes)',
    sub: 'Consumo mensual por área del hogar',
    items: active.map((m) => ({ label: m.label, value: m.value })),
    color: C.primary,
    unit: 'kWh',
    maxBars: 5,
  });
  divider(doc);

  drawCleanHBars(doc, {
    title: 'GASTO POR MÓDULO (S/mes)',
    sub: 'Gasto mensual por área del hogar',
    items: active.map((m) => ({ label: m.label, value: m.value2 })),
    color: C.green,
    unit: 'S/',
    maxBars: 5,
  });
}

function drawChartsSection(doc, { detalles = [], totalesModulos = [], resumen = {} }) {
  doc.addPage();
  applyPdfPageMargins(doc);
  doc.y = MARGIN;

  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.primary)
    .text('ANÁLISIS GRÁFICO DE CONSUMO', MARGIN, doc.y, {
      align: 'center',
      width: CONTENT_W,
    });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
    .text('Representación visual de los datos del cálculo', MARGIN, doc.y, {
      align: 'center',
      width: CONTENT_W,
    });
  doc.moveDown(1.1);
  divider(doc);

  const moduloItems = totalesModulos.map((m) => ({
    label: m.label,
    value: parseFloat(m.totales?.consumoMes) || 0,
    value2: parseFloat(m.totales?.gastoMensual) || 0,
  }));

  if (moduloItems.some((m) => m.value > 0 || m.value2 > 0)) {
    drawModuloCharts(doc, moduloItems);
    divider(doc);
  }

  const gastosItems = [
    { label: 'Gasto Diario', value: parseFloat(resumen.gastoDiario) || 0 },
    { label: 'Gasto Mensual', value: parseFloat(resumen.gastoMensual) || 0 },
    { label: 'Gasto Anual', value: parseFloat(resumen.gastoAnual) || 0 },
  ].filter((g) => g.value > 0);

  if (gastosItems.length > 0) {
    drawCleanHBars(doc, {
      title: 'RESUMEN DE GASTOS (S/)',
      sub: 'Gasto energético estimado por período',
      items: gastosItems,
      color: [C.cyan, C.primary, C.purple],
      unit: 'S/',
      maxBars: 5,
    });
    divider(doc);
  }

  const consumoEquipoItems = detalles
    .filter((d) => (parseFloat(d.consumo_mes) || 0) > 0)
    .map((d) => ({ label: d.nombre, value: parseFloat(d.consumo_mes) || 0 }))
    .sort((a, b) => b.value - a.value);

  const catMap = {};
  detalles.forEach((d) => {
    const cat = d.categoria || 'Sin categoría';
    catMap[cat] = (catMap[cat] || 0) + (parseFloat(d.consumo_mes) || 0);
  });

  const catItems = Object.entries(catMap)
    .map(([label, value]) => ({ label, value: parseFloat(value.toFixed(3)) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (consumoEquipoItems.length > 0 && catItems.length > 0) {
    drawConsumoCategoryRow(doc, consumoEquipoItems, catItems);
    divider(doc);
  } else if (consumoEquipoItems.length > 0) {
    drawCleanHBars(doc, {
      title: 'CONSUMO POR EQUIPO (kWh/mes)',
      sub: 'Top 10 equipos con mayor consumo mensual',
      items: consumoEquipoItems,
      color: C.primary,
      unit: 'kWh',
      maxBars: 10,
    });
    divider(doc);
  } else if (catItems.length > 0) {
    const panelH = computeCategoryPanelHeight(catItems);
    ensureSpace(doc, panelH + 20);
    const topY = doc.y;
    drawCategoryPiePanel(doc, catItems, MARGIN, topY, CONTENT_W, panelH);
    doc.y = topY + panelH + 12;
    divider(doc);
  }

  const gastoEquipoItems = detalles
    .filter((d) => (parseFloat(d.gasto_mensual) || 0) > 0)
    .map((d) => ({ label: d.nombre, value: parseFloat(d.gasto_mensual) || 0 }));

  if (gastoEquipoItems.length > 0) {
    drawCleanHBars(doc, {
      title: 'GASTO POR EQUIPO (S/mes)',
      sub: 'Top 10 equipos con mayor gasto mensual',
      items: gastoEquipoItems,
      color: C.green,
      unit: 'S/',
      maxBars: 10,
    });
    divider(doc);
  }

  const comparativaItems = detalles
    .filter((d) => (parseFloat(d.gasto_anual) || 0) > 0)
    .map((d) => ({
      label: d.nombre,
      value: parseFloat(d.gasto_anual) || 0,
      value2: parseFloat(d.gasto_diario) || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (comparativaItems.length > 0) {
    drawCleanHBars(doc, {
      title: 'GASTO ANUAL Y DIARIO POR EQUIPO (S/)',
      sub: 'Barra superior = anual · Barra inferior = diario',
      items: comparativaItems,
      unit: 'S/',
      color: C.purple,
      color2: C.amber,
      legend: [
        { color: C.purple, label: 'Gasto anual' },
        { color: C.amber, label: 'Gasto diario' },
      ],
      maxBars: 8,
    });
  }
}

module.exports = { drawChartsSection };
