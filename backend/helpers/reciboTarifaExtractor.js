/** Extrae precio S/ por kWh de texto de recibos de luz (varios formatos peruanos). */

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

function parseTarifaNumber(raw) {
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
  if (n < MIN_TARIFA || n > MAX_TARIFA) return null;
  return Math.round(n * 10000) / 10000;
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
  const source = String(text || '').replace(/\s+/g, ' ');
  if (!source.trim()) {
    return { tarifa_kwh: null, metodo: null, message: 'No se pudo leer texto del archivo' };
  }

  for (const { id, re } of TARIFA_PATTERNS) {
    re.lastIndex = 0;
    const match = re.exec(source);
    if (match) {
      const tarifa_kwh = parseTarifaNumber(match[1]);
      if (tarifa_kwh != null) {
        return {
          tarifa_kwh,
          metodo: id,
          message: `Tarifa detectada: S/ ${tarifa_kwh.toFixed(4)} por kWh`,
        };
      }
    }
  }

  const luzDelSur = extractLuzDelSurTarifa(source);
  if (luzDelSur != null) {
    return {
      tarifa_kwh: luzDelSur,
      metodo: 'precio_kwh_luz_sur',
      message: `Tarifa detectada: S/ ${luzDelSur.toFixed(4)} por kWh`,
    };
  }

  return {
    tarifa_kwh: null,
    metodo: null,
    message: 'No se encontró la tarifa en el recibo. Verifique que sea un PDF con texto o una foto nítida.',
  };
}

module.exports = {
  extractTarifaFromText,
  parseTarifaNumber,
  TARIFA_PATTERNS,
};
