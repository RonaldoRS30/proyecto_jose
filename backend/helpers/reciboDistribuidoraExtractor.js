/** Identifica la empresa distribuidora en recibos de luz peruanos (texto OCR/PDF). */

const DISTRIBUIDORAS = [
  {
    empresa: 'PLUZ PERU',
    ruc: '20269985900',
    keywords: ['PLUZ ENERGIA PERU SAA', 'PLUZ ENERGIA PERU', 'PLUZ PERU', 'PLUZ ENERGIA', ' PLUZ '],
    addresses: ['PASEO DEL BOSQUE', 'CHACARILLA DEL ESTANQUE', 'CHACARILLA', 'SAN BORJA'],
  },
  {
    empresa: 'Luz del Sur',
    ruc: '20331898008',
    keywords: ['LUZ DEL SUR SAA', 'LUZ DEL SUR SA', 'LUZ DEL SUR'],
    addresses: ['CANAVAL Y MOREYRA', 'SAN ISIDRO'],
  },
  {
    empresa: 'ELECTROCENTRO',
    ruc: '20129646082',
    keywords: ['ELECTROCENTRO SAA', 'ELECTROCENTRO'],
    addresses: ['AVENIDA MARISCAL CASTILLA', 'WANCHAQ', 'CUSCO'],
  },
  {
    empresa: 'HIDRANDINA',
    ruc: '20103194541',
    keywords: ['HIDRANDINA SAA', 'HIDRANDINA'],
    addresses: ['AV. CHINCHA ALTA', 'CHIMBOTE'],
  },
  {
    empresa: 'ENOSA',
    keywords: ['ENOSA SAA', 'ENOSA', 'EMPRESA DE SERVICIOS ELECTRICOS DEL NORTE ORIENTE'],
    addresses: ['MOYOBAMBA', 'SAN MARTIN'],
  },
  {
    empresa: 'ENSA',
    keywords: ['ENSA SAA', 'ELECTRONOROESTE', ' EMPRESA DE DISTRIBUCION ELECTRICA DEL NORTE '],
    addresses: ['SULLANA', 'PIURA'],
  },
  {
    empresa: 'ELECTRO DUNAS',
    keywords: ['ELECTRODUNAS', 'ELECTRO DUNAS'],
    addresses: ['ICA', 'NAZCA'],
  },
  {
    empresa: 'SEAL',
    keywords: ['SEAL SAA', ' SOCIEDAD ELECTRICA DEL SUR '],
    addresses: ['TACNA'],
  },
  {
    empresa: 'ELECTROORIENTE',
    keywords: ['ELECTRO ORIENTE', 'ELECTROORIENTE'],
    addresses: ['PUCALLPA', 'UCAYALI'],
  },
  {
    empresa: 'ELECTRO UCAYALI',
    keywords: ['ELECTRO UCAYALI', 'ELECTROUCAYALI'],
    addresses: ['PUCALLPA'],
  },
  {
    empresa: 'ELECTRO SUR ESTE',
    keywords: ['ELECTRO SUR ESTE', 'ELECTROSURESTE'],
    addresses: ['CUSCO', 'QUILLABAMBA'],
  },
  {
    empresa: 'ELECTROSUR',
    keywords: ['ELECTROSUR SAA', 'ELECTROSUR'],
    addresses: ['AREQUIPA'],
  },
  {
    empresa: 'ELECTRO PUNO',
    keywords: ['ELECTRO PUNO', 'ELECTROPUNO'],
    addresses: ['PUNO', 'JULIACA'],
  },
];

const MIN_SCORE = 30;

function normalizeMatchText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s./-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function padSource(text) {
  return ` ${normalizeMatchText(text)} `;
}

function extractRucsFromText(text) {
  const normalized = normalizeMatchText(text);
  const rucs = new Set();

  for (const match of normalized.matchAll(/\b(20\d{9})\b/g)) {
    rucs.add(match[1]);
  }

  for (const match of normalized.matchAll(/R\.?\s*U\.?\s*C\.?\s*N[°O]?\s*(\d[\d\s.-]{9,16})/gi)) {
    const digits = match[1].replace(/\D/g, '');
    if (/^20\d{9}$/.test(digits)) rucs.add(digits);
  }

  const allDigits = normalized.replace(/\D/g, '');
  for (const match of allDigits.matchAll(/20\d{9}/g)) {
    rucs.add(match[0]);
  }

  return [...rucs];
}

function scoreDistribuidora(source, distribuidora, rucs) {
  if (distribuidora.ruc && rucs.includes(distribuidora.ruc)) {
    return { score: 100, metodo: 'ruc' };
  }

  let score = 0;
  let metodo = null;

  for (const keyword of distribuidora.keywords || []) {
    const needle = normalizeMatchText(keyword);
    if (!needle.trim()) continue;
    if (source.includes(needle)) {
      score += needle.length >= 10 ? 45 : 35;
      metodo = metodo || 'razon_social';
    }
  }

  let addressHits = 0;
  for (const address of distribuidora.addresses || []) {
    const needle = normalizeMatchText(address);
    if (source.includes(needle)) {
      score += 20;
      addressHits += 1;
      metodo = metodo || 'direccion';
    }
  }

  if (addressHits >= 2) {
    score += 10;
    metodo = 'direccion';
  }

  return { score, metodo };
}

function extractEmpresaDistribuidoraFromText(text) {
  const source = padSource(text);
  if (!source.trim()) {
    return { empresa_distribuidora: null, metodo: null };
  }

  const rucs = extractRucsFromText(text);
  let best = { empresa: null, score: 0, metodo: null };

  for (const distribuidora of DISTRIBUIDORAS) {
    const { score, metodo } = scoreDistribuidora(source, distribuidora, rucs);
    if (score > best.score) {
      best = { empresa: distribuidora.empresa, score, metodo };
    }
  }

  if (best.score < MIN_SCORE) {
    return { empresa_distribuidora: null, metodo: null };
  }

  return {
    empresa_distribuidora: best.empresa,
    metodo: best.metodo,
  };
}

module.exports = {
  DISTRIBUIDORAS,
  extractEmpresaDistribuidoraFromText,
  normalizeMatchText,
  extractRucsFromText,
};
