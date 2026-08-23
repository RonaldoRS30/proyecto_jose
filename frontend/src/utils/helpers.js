/** Decimales estándar — réplica Excel */
export const DECIMALS = 3;
export const DECIMALS_KWH_DAY = 4;
export const DECIMALS_KWH_MONTH = 3;
export const DECIMALS_KWH_YEAR = 2;
export const DECIMALS_MONEY = 2;

export const roundNumber = (num, decimals = DECIMALS) => {
  const factor = 10 ** decimals;
  return Math.round(Number(num) * factor) / factor;
};

export const formatNumber = (num, decimals = DECIMALS) => {
  if (num === null || num === undefined || Number.isNaN(Number(num))) {
    return Number(0).toLocaleString('es-PE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return Number(num).toLocaleString('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatKwhDay = (num) => formatNumber(num, DECIMALS_KWH_DAY);
export const formatKwhMonth = (num) => formatNumber(num, DECIMALS_KWH_MONTH);
export const formatKwhYear = (num) => formatNumber(num, DECIMALS_KWH_YEAR);
export const formatCurrency = (num, decimals = DECIMALS_MONEY) => `S/ ${formatNumber(num, decimals)}`;

/** Valores para tooltips de gráficos */
export const formatChartCurrency = (value) => `S/ ${Number(value).toFixed(DECIMALS_MONEY)}`;
export const formatChartKwh = (value) => `${Number(value).toFixed(DECIMALS_KWH_MONTH)} kWh`;

/** Etiquetas compactas en ejes Y (soles, sin decimales) */
export const formatChartAxisNumber = (value, { compact = false } = {}) => {
  const n = Number(value);
  if (Number.isNaN(n)) return '0';
  if (compact && Math.abs(n) >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1)}k`;
  }
  return n.toLocaleString('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const formatChartAxisSoles = (value, options = {}) => formatChartAxisNumber(value, options);

/** Etiquetas compactas en ejes Y (kWh, sin decimales) */
export const formatChartAxisKwh = (value, options = {}) => formatChartAxisNumber(value, options);

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Solo día (sin hora) — recibos y gráficos */
export const formatDateDay = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const MODULOS = {
  aparato: { label: 'Electrodomésticos', color: '#3b82f6' },
  fantasma: { label: 'Consumo Fantasma', color: '#f59e0b' },
  iluminacion: { label: 'Iluminación', color: '#10b981' },
};

export const CATEGORIAS_APARATO = [
  'Cocina', 'Lavandería', 'Climatización', 'Entretenimiento',
  'Informática', 'Hogar', 'Baño', 'Otros',
];

export const CATEGORIAS_FANTASMA = [
  'Cargadores', 'Televisores', 'Audio', 'Electrodomésticos',
  'Smart Home', 'Otros',
];

export const CATEGORIAS_ILUMINACION = [
  'Incandescente', 'LED', 'Fluorescente', 'Halógeno', 'Spot LED', 'Otros',
];

export const TIPOS_LUMINARIA = [
  { nombre: 'Bombillas incandescentes', potencia: 100 },
  { nombre: 'Bombillas LED', potencia: 7 },
  { nombre: 'Culvilux o Splendor LED', potencia: 27 },
  { nombre: 'Lámparas LED', potencia: 48 },
  { nombre: 'Reflectores Halógenos', potencia: 10 },
  { nombre: 'Spot LED', potencia: 18 },
];

export const TIPOS_STANDBY = [
  { nombre: 'Stand-by cargador', potencia: 0.24, horas: 24 },
  { nombre: 'Stand-by TV 37" LCD', potencia: 2, horas: 20 },
  { nombre: 'Stand-by TV 42"', potencia: 3, horas: 20 },
  { nombre: 'Stand-by TDT', potencia: 5, horas: 24 },
  { nombre: 'Stand-by PC portatil', potencia: 4, horas: 24 },
  { nombre: 'Stand-by Equipo música', potencia: 6, horas: 24 },
  { nombre: 'Stand-by Alexa/Google', potencia: 3, horas: 24 },
  { nombre: 'Stand-by Microondas', potencia: 4, horas: 24 },
  { nombre: 'Stand-by Radio despertador', potencia: 7, horas: 24 },
  { nombre: 'Stand-by Caldera de gas', potencia: 3.5, horas: 20 },
  { nombre: 'Stand-by Robot aspirador', potencia: 3, horas: 20 },
  { nombre: 'Stand-by regletas', potencia: 0.3, horas: 24 },
];
