/** Extrae tarifa, potencia contratada, alumbrado público y empresa distribuidora de recibos de luz peruanos. */

const { extractEmpresaDistribuidoraFromText } = require('./reciboDistribuidoraExtractor');

const TARIFA_PATTERNS = [
  {
    id: 'precio_unit_kw_h',
    re: /PRECIO\s+UNIT\.?\s*S\/\.?\s*\/?\s*kW\.?\s*h\s*:?\s*([\d.,]+)/gi,
  },
  {
    id: 'luz_del_sur_formula',
    re: /[\d.,]+\s*-\s*[\d.,]+\s*=\s*[\d.,]+\s*[xX×]\s*[\d.,]+\s*=\s*[\d.,]+\s*[xX×]\s*([\d.,]+)/gi,
  },
  {
    id: 'precio_kwh_soles_paren',
    re: /Precio\s+kWh\s*\(\s*S\/\.?\s*\)\s*:?\s*([\d.,]+)/gi,
  },
  {
    id: 'ene_activa',
    re: /Ene\.?\s*Activa\s*\(\s*S\/\s*([\d.,]+)\s*x/gi,
  },
  {
    id: 'precio_unitario_label',
    re: /Precio\s+unitario\s+S\/\.?\/?\s*kWh?\s*([\d.,]+)/gi,
  },
  {
    id: 'precio_unitario_value_first',
    re: /([\d.,]{4,7})\s*Precio\s+unitario\s+S\/\.?\/?\s*kWh?/gi,
  },
  {
    id: 'al_precio_de',
    re: /al\s+precio\s+de\s+S\/\s*([\d.,]+)/gi,
  },
  {
    id: 'precio_kwh_paren',
    re: /precio\s+KWH\s*\(\s*S\/\.?\s*\)\s*:?\s*([\d.,]+)/gi,
  },
  {
    id: 'precio_kwh',
    re: /precio\s+KWH\s*\(?\s*S\/\.?\s*\)?\s*([\d.,]+)/gi,
  },
];

const MIN_TARIFA = 0.05;
const MAX_TARIFA = 3.5;
const MIN_ALUMBRADO = 0.01;
const MAX_ALUMBRADO = 500;
const MIN_POTENCIA_KW = 0.1;
const MAX_POTENCIA_KW = 100;

const POTENCIA_PATTERNS = [
  {
    id: 'potencia_contratada_kw',
    re: /Potencia\s+Contratada\s*:?\s*([\d.,]+)\s*kW?/gi,
  },
  {
    id: 'potencia_contratada',
    re: /Potencia\s+Contratada\s*:?\s*([\d.,]+)/gi,
  },
  {
    id: 'potencia_suministro',
    re: /\bPotencia\s+(?!Contratada\b)([\d.,]+)\s*kW?/gi,
  },
];

const ALUMBRADO_PATTERNS = [
  {
    id: 'alumbrado_publico_camel',
    re: /AlumbradoPublico(?:\s*\([^)]*\))?\s*:?\s*([\d.,]+)/gi,
  },
  {
    id: 'alumbrado_publico',
    re: /Alumbrado\s+P[úu]blico\s*:?\s*([\d.,]+)/gi,
  },
  {
    id: 'alumbrado_publico_espaciado',
    re: /Alumbrado\s+P[úu]blico[^\d]{0,24}([\d.,]+)/gi,
  },
];

function parseDecimalNumber(raw, { min, max, decimals = 4 } = {}) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/\s/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  if (min != null && n < min) return null;
  if (max != null && n > max) return null;
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function parseTarifaNumber(raw) {
  return parseDecimalNumber(raw, { min: MIN_TARIFA, max: MAX_TARIFA, decimals: 4 });
}

function parseAlumbradoNumber(raw) {
  return parseDecimalNumber(raw, { min: MIN_ALUMBRADO, max: MAX_ALUMBRADO, decimals: 2 });
}

function parsePotenciaKw(raw) {
  return parseDecimalNumber(raw, { min: MIN_POTENCIA_KW, max: MAX_POTENCIA_KW, decimals: 2 });
}

function formatPotenciaContratada(kw) {
  if (kw == null) return null;
  return `${Number(kw).toFixed(2)} KW`;
}

function matchFirstPattern(source, patterns, parser) {
  for (const { id, re } of patterns) {
    re.lastIndex = 0;
    const match = re.exec(source);
    if (match) {
      const value = parser(match[1]);
      if (value != null) return { value, metodo: id };
    }
  }
  return { value: null, metodo: null };
}

function extractPotenciaContratadaInverted(source) {
  const markerRes = [
    /Potencia\s+Contratada/i,
    /\bPotencia\b(?!\s+Contratada)/i,
  ];

  for (const markerRe of markerRes) {
    const marker = markerRe.exec(source);
    if (!marker) continue;

    const after = source.slice(marker.index, marker.index + 60);
    const directAfter = /\bPotencia(?:\s+Contratada)?\s*:?\s*([\d.,]+)\s*kW?/i.exec(after);
    if (directAfter) {
      const val = parsePotenciaKw(directAfter[1]);
      if (val != null) return val;
    }

    const before = source.slice(Math.max(0, marker.index - 400), marker.index);
    const re = /([\d.,]+)\s*kW/gi;
    let match;
    let last = null;
    while ((match = re.exec(before)) !== null) {
      const val = parsePotenciaKw(match[1]);
      if (val != null) last = val;
    }
    if (last != null) return last;
  }

  return null;
}

function extractPotenciaContratadaFromText(source) {
  const direct = matchFirstPattern(source, POTENCIA_PATTERNS, parsePotenciaKw);
  if (direct.value != null) {
    return {
      potencia_contratada: formatPotenciaContratada(direct.value),
      metodo: direct.metodo,
    };
  }

  const inverted = extractPotenciaContratadaInverted(source);
  if (inverted != null) {
    return {
      potencia_contratada: formatPotenciaContratada(inverted),
      metodo: 'potencia_columna_invertida',
    };
  }

  return { potencia_contratada: null, metodo: null };
}

function collectDecimalAmounts(text) {
  return [...String(text).matchAll(/(\d{1,4}[.,]\d{2})/g)]
    .map((m) => parseAlumbradoNumber(m[1]))
    .filter((n) => n != null);
}

/** Luz del Sur: etiquetas primero y bloque numérico después del SUBTOTAL. */
function extractAlumbradoLabelsThenValues(source) {
  const cargoIdx = source.search(/Cargo\s+Fijo/i);
  const alumbradoIdx = source.search(/Alumbrado\s*P[úu]blico|AlumbradoPublico/i);
  const subtotalIdx = source.search(/SUB\s*TOTAL|SUBTOTAL/i);
  if (cargoIdx < 0 || alumbradoIdx < 0 || subtotalIdx < 0) return null;

  const labelsChunk = source.slice(cargoIdx, subtotalIdx + 12);
  const labelOrder = [];
  const checks = [
    [/Cargo\s+Fijo/i, 'cargo_fijo'],
    [/Mant\.?\s*y\s+Reposici[oó]n/i, 'mant'],
    [/Alumbrado\s*P[úu]blico|AlumbradoPublico/i, 'alumbrado'],
    [/Inter[eé]s\s+Compensatorio/i, 'interes'],
  ];
  for (const [re, key] of checks) {
    if (re.test(labelsChunk)) labelOrder.push(key);
  }

  const alumbradoLabelIdx = labelOrder.indexOf('alumbrado');
  if (alumbradoLabelIdx < 0) return null;

  const afterSubtotal = source.slice(subtotalIdx, subtotalIdx + 450);
  const numbers = collectDecimalAmounts(afterSubtotal).filter((n) => n <= 500);
  const slice = numbers.slice(0, labelOrder.length);
  return slice[alumbradoLabelIdx] ?? null;
}

/** PLUZ: importes en columna antes de «SUBTOTAL Mes Actual». */
function extractAlumbradoFromPluzLayout(source) {
  const endIdx = source.search(/SUBTOTAL\s+Mes\s+Actual/i);
  if (endIdx < 0) return null;

  const window = source.slice(Math.max(0, endIdx - 450), endIdx);
  const numbers = collectDecimalAmounts(window);

  for (let i = numbers.length - 1; i >= 0; i -= 1) {
    if (numbers[i] < 300) continue;

    const block = numbers.slice(Math.max(0, i - 5), i);
    const energyIdx = block.findIndex((n) => n >= 100 && n <= 500);
    if (energyIdx >= 0 && energyIdx + 2 < block.length) {
      const candidate = block[energyIdx + 2];
      if (candidate >= 5 && candidate <= 200) return candidate;
    }

    const lastCharge = block[block.length - 1];
    if (lastCharge >= 5 && lastCharge <= 200) return lastCharge;
  }

  return null;
}

function extractAlumbradoPublicoFromText(source) {
  const direct = matchFirstPattern(source, ALUMBRADO_PATTERNS, parseAlumbradoNumber);
  if (direct.value != null) {
    return { alumbrado_publico: direct.value, metodo: direct.metodo };
  }

  const fromPluz = extractAlumbradoFromPluzLayout(source);
  if (fromPluz != null) {
    return { alumbrado_publico: fromPluz, metodo: 'alumbrado_columna_pluz' };
  }

  const fromLabelsThenValues = extractAlumbradoLabelsThenValues(source);
  if (fromLabelsThenValues != null) {
    return { alumbrado_publico: fromLabelsThenValues, metodo: 'alumbrado_columna_luz_sur' };
  }

  return { alumbrado_publico: null, metodo: null };
}

const MIN_TOTAL_PAGAR = 10;
const MAX_TOTAL_PAGAR = 50000;
const MIN_CONSUMO_KWH = 1;
const MAX_CONSUMO_KWH = 50000;

function parseConsumoKwh(raw) {
  return parseDecimalNumber(raw, { min: MIN_CONSUMO_KWH, max: MAX_CONSUMO_KWH, decimals: 2 });
}

function parseTotalAPagar(raw) {
  return parseDecimalNumber(raw, { min: MIN_TOTAL_PAGAR, max: MAX_TOTAL_PAGAR, decimals: 2 });
}

function extractPeriodoFacturacionFromText(source) {
  const nearTotal = source.match(
    /TOTAL\s+A\s+PAGAR[\s\S]{0,160}?\((\d{2})\/(\d{2})\/(\d{4})\)/i
  );
  if (nearTotal) {
    return `${nearTotal[3]}-${nearTotal[2]}-01`;
  }

  const lectura = source.match(/Lectura\s+Actual[\s\S]{0,80}?\((\d{2})\/(\d{2})\/(\d{4})\)/i);
  if (lectura) {
    return `${lectura[3]}-${lectura[2]}-01`;
  }

  const periodo = source.match(/Periodo\s+(?:de\s+)?(?:Facturaci[oó]n\s+)?(\d{2})\/(\d{4})/i);
  if (periodo) {
    return `${periodo[2]}-${periodo[1]}-01`;
  }

  const emision = source.match(/Fecha\s+de\s+Emisi[oó]n\s*:?\s*(\d{1,2})[-/](\w{3}|\d{2})[-/](\d{4})/i);
  if (emision) {
    const monthMap = {
      ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
      jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
    };
    const monthToken = emision[2].toLowerCase().slice(0, 3);
    const month = monthMap[monthToken] || String(emision[2]).padStart(2, '0');
    return `${emision[3]}-${month}-01`;
  }

  return null;
}

function extractTotalAPagarFromText(source) {
  const normalized = String(source || '').replace(/\s+/g, ' ');

  const masked = normalized.match(/S\/[\s*]{2,}([\d.,]+)/i);
  if (masked) {
    const value = parseTotalAPagar(masked[1]);
    if (value != null) {
      return { total_a_pagar: value, metodo: 'total_enmascarado' };
    }
  }

  const bannerRe = /TOTAL\s+A\s+PAGAR\s+S\/\s*([\d.,]+)/gi;
  const banner = bannerRe.exec(normalized);
  if (banner) {
    const value = parseTotalAPagar(banner[1]);
    if (value != null) {
      return { total_a_pagar: value, metodo: 'total_banner' };
    }
  }

  const beforeEmision = normalized.match(/([\d.,]+)\s+Fecha\s+de\s+Emisi[oó]n/i);
  if (beforeEmision) {
    const value = parseTotalAPagar(beforeEmision[1]);
    if (value != null) {
      return { total_a_pagar: value, metodo: 'total_antes_emision' };
    }
  }

  const totalDelMes = normalized.match(/TOTAL\s+DEL\s+MES\s+([\d.,]+)/i);
  if (totalDelMes) {
    const value = parseTotalAPagar(totalDelMes[1]);
    if (value != null) {
      return { total_a_pagar: value, metodo: 'total_del_mes' };
    }
  }

  const totalMesActual = normalized.match(/TOTAL\s+Mes\s+Actual\s+([\d.,]+)/i);
  if (totalMesActual) {
    const value = parseTotalAPagar(totalMesActual[1]);
    if (value != null) {
      return { total_a_pagar: value, metodo: 'total_mes_actual' };
    }
  }

  return { total_a_pagar: null, metodo: null };
}

/**
 * Consumo mensual de energía (kWh) del recibo — informativo para historial.
 * PLUZ: «Consumo kWh (Factor 1) 663» o «663kWh al precio de».
 * Luz del Sur: «Energía a facturar (kWh) … = 455.50 X …» o «MES FACTURADO … 455.50 kWh».
 */
function extractConsumoKwhFromText(source) {
  const normalized = String(source || '').replace(/\s+/g, ' ');

  const pluzPrecio = normalized.match(/(\d+(?:[.,]\d+)?)\s*kWh\s+al\s+precio\s+de/i);
  if (pluzPrecio) {
    const value = parseConsumoKwh(pluzPrecio[1]);
    if (value != null) {
      return { consumo_kwh: value, metodo: 'pluz_kwh_al_precio' };
    }
  }

  const pluzDetalle = normalized.match(
    /Consumo\s+kWh\s*(?:\(?\s*Factor\s*)?\(?\s*[\d.,]+\s*\)?\s*(\d+(?:[.,]\d+)?)/i,
  );
  if (pluzDetalle) {
    const value = parseConsumoKwh(pluzDetalle[1]);
    if (value != null) {
      return { consumo_kwh: value, metodo: 'pluz_consumo_kwh_factor' };
    }
  }

  const ldsFormula = normalized.match(
    /[\d.,]+\s*-\s*[\d.,]+\s*=\s*([\d.,]+)\s*[xX×]\s*[\d.,]+\s*=\s*([\d.,]+)\s*[xX×]/i,
  );
  if (ldsFormula) {
    const value = parseConsumoKwh(ldsFormula[1]);
    const confirm = parseConsumoKwh(ldsFormula[2]);
    if (value != null && (confirm == null || Math.abs(value - confirm) < 0.05)) {
      return { consumo_kwh: value, metodo: 'luz_del_sur_formula_lecturas' };
    }
  }

  const ldsEnergia = normalized.match(
    /Energ[ií]a\s+a\s+facturar\s*\(?\s*kWh\s*\)?[\s\S]{0,180}?=\s*([\d.,]+)\s*[xX×]/i,
  );
  if (ldsEnergia) {
    const value = parseConsumoKwh(ldsEnergia[1]);
    if (value != null) {
      return { consumo_kwh: value, metodo: 'luz_del_sur_energia_facturar' };
    }
  }

  const mesFacturado = normalized.match(
    /MES\s+FACTURADO\s+[A-ZÁÉÍÓÚÑ]+\s+\d{4}\s+([\d.,]+)\s*kWh/i,
  );
  if (mesFacturado) {
    const value = parseConsumoKwh(mesFacturado[1]);
    if (value != null) {
      return { consumo_kwh: value, metodo: 'luz_del_sur_mes_facturado' };
    }
  }

  return { consumo_kwh: null, metodo: null };
}

function buildReciboMessage({
  tarifa_kwh,
  potencia_contratada,
  alumbrado_publico,
  empresa_distribuidora,
  total_a_pagar,
  consumo_kwh,
}) {
  const parts = [];
  if (empresa_distribuidora) parts.push(`Distribuidora: ${empresa_distribuidora}`);
  if (consumo_kwh != null) parts.push(`Consumo: ${consumo_kwh} kWh/mes`);
  if (tarifa_kwh != null) parts.push(`Tarifa: S/ ${tarifa_kwh.toFixed(4)}/kWh`);
  if (potencia_contratada) parts.push(`Potencia: ${potencia_contratada}`);
  if (alumbrado_publico != null) parts.push(`Alumbrado público: S/ ${alumbrado_publico.toFixed(2)}`);
  if (total_a_pagar != null) parts.push(`Total a pagar: S/ ${total_a_pagar.toFixed(2)}`);
  if (!parts.length) {
    return 'No se encontraron datos del recibo. Verifique que sea un PDF con texto o una foto nítida.';
  }
  return `Datos detectados: ${parts.join(' · ')}`;
}

/** Luz del Sur: etiqueta "Precio kWh (S/.)" — valor en columna o en "… = kWh X factor = kWh X tarifa". */
function extractLuzDelSurTarifa(source) {
  const marker = /Precio\s+kWh\s*\(\s*S\/\.?\s*\)/i.exec(source);
  if (!marker) return null;

  const formulaRe = /[\d.,]+\s*-\s*[\d.,]+\s*=\s*[\d.,]+\s*[xX×]\s*[\d.,]+\s*=\s*[\d.,]+\s*[xX×]\s*([\d.,]+)/gi;
  let formulaMatch;
  while ((formulaMatch = formulaRe.exec(source)) !== null) {
    const val = parseTarifaNumber(formulaMatch[1]);
    if (val != null) return val;
  }

  const direct = /Precio\s+kWh\s*\(\s*S\/\.?\s*\)\s*:?\s*([\d.,]+)/i.exec(source);
  if (direct) {
    const val = parseTarifaNumber(direct[1]);
    if (val != null) return val;
  }

  const searchWindows = [
    source.slice(Math.max(0, marker.index - 500), marker.index + 500),
    source,
  ];

  for (const chunk of searchWindows) {
    const multiplyRe = /\b[xX×]\s*([\d.,]+)/gi;
    let multiplyMatch;
    let lastTarifa = null;
    while ((multiplyMatch = multiplyRe.exec(chunk)) !== null) {
      const val = parseTarifaNumber(multiplyMatch[1]);
      if (val != null && val !== 1) lastTarifa = val;
    }
    if (lastTarifa != null) return lastTarifa;
  }

  const afterMarker = source.slice(marker.index, marker.index + 350);
  const numberRe = /([\d.,]+)/g;
  let numberMatch;
  const tarifaCandidates = [];
  while ((numberMatch = numberRe.exec(afterMarker)) !== null) {
    const val = parseTarifaNumber(numberMatch[1]);
    if (val != null && val !== 1) tarifaCandidates.push(val);
  }
  if (tarifaCandidates.length) {
    return tarifaCandidates[tarifaCandidates.length - 1];
  }

  return null;
}

function extractTarifaFromText(text) {
  return extractDatosReciboFromText(text);
}

function extractDatosReciboFromText(text) {
  const source = String(text || '').replace(/\s+/g, ' ');
  if (!source.trim()) {
    return {
      tarifa_kwh: null,
      potencia_contratada: null,
      alumbrado_publico: null,
      empresa_distribuidora: null,
      total_a_pagar: null,
      periodo_facturacion: null,
      consumo_kwh: null,
      metodo: null,
      message: 'No se pudo leer texto del archivo',
    };
  }

  let tarifa_kwh = null;
  let tarifaMetodo = null;

  for (const { id, re } of TARIFA_PATTERNS) {
    re.lastIndex = 0;
    const match = re.exec(source);
    if (match) {
      const val = parseTarifaNumber(match[1]);
      if (val != null) {
        tarifa_kwh = val;
        tarifaMetodo = id;
        break;
      }
    }
  }

  if (tarifa_kwh == null) {
    const luzDelSur = extractLuzDelSurTarifa(source);
    if (luzDelSur != null) {
      tarifa_kwh = luzDelSur;
      tarifaMetodo = 'precio_kwh_luz_sur';
    }
  }

  const { potencia_contratada, metodo: potenciaMetodo } = extractPotenciaContratadaFromText(source);
  const { alumbrado_publico, metodo: alumbradoMetodo } = extractAlumbradoPublicoFromText(source);
  const { empresa_distribuidora, metodo: distribuidoraMetodo } = extractEmpresaDistribuidoraFromText(source);
  const { total_a_pagar, metodo: totalMetodo } = extractTotalAPagarFromText(source);
  const periodo_facturacion = extractPeriodoFacturacionFromText(source);
  const { consumo_kwh, metodo: consumoMetodo } = extractConsumoKwhFromText(source);

  const message = buildReciboMessage({
    tarifa_kwh,
    potencia_contratada,
    alumbrado_publico,
    empresa_distribuidora,
    total_a_pagar,
    consumo_kwh,
  });

  if (tarifa_kwh == null) {
    const hasPartial = potencia_contratada || alumbrado_publico != null || empresa_distribuidora
      || total_a_pagar != null || consumo_kwh != null;
    return {
      tarifa_kwh: null,
      potencia_contratada,
      alumbrado_publico,
      empresa_distribuidora,
      total_a_pagar,
      periodo_facturacion,
      consumo_kwh,
      metodo: null,
      metodos: {
        tarifa: null,
        potencia: potenciaMetodo,
        alumbrado: alumbradoMetodo,
        distribuidora: distribuidoraMetodo,
        total: totalMetodo,
        consumo: consumoMetodo,
      },
      message: hasPartial
        ? `${message}. No se encontró la tarifa en el recibo.`
        : 'No se encontró la tarifa en el recibo. Verifique que sea un PDF con texto o una foto nítida.',
    };
  }

  return {
    tarifa_kwh,
    potencia_contratada,
    alumbrado_publico,
    empresa_distribuidora,
    total_a_pagar,
    periodo_facturacion,
    consumo_kwh,
    metodo: tarifaMetodo,
    metodos: {
      tarifa: tarifaMetodo,
      potencia: potenciaMetodo,
      alumbrado: alumbradoMetodo,
      distribuidora: distribuidoraMetodo,
      total: totalMetodo,
      consumo: consumoMetodo,
    },
    message,
  };
}

module.exports = {
  extractTarifaFromText,
  extractDatosReciboFromText,
  extractTotalAPagarFromText,
  extractPeriodoFacturacionFromText,
  extractConsumoKwhFromText,
  parseTarifaNumber,
  parseAlumbradoNumber,
  parsePotenciaKw,
  parseTotalAPagar,
  parseConsumoKwh,
  formatPotenciaContratada,
  TARIFA_PATTERNS,
  POTENCIA_PATTERNS,
  ALUMBRADO_PATTERNS,
};
