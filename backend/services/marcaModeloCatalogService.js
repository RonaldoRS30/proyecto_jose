const { Op } = require('sequelize');
const { Configuracion, Electrodomestico } = require('../models');
const sequelize = require('../config/database');
const { DEFAULT_MARCAS, DEFAULT_MODELOS } = require('../constants/marcaModeloCatalog');

const MARCA_KEY = 'catalogo_marcas_extra';
const MODELO_KEY = 'catalogo_modelos_extra';

const normalize = (value) => String(value || '').trim();

const parseJsonArray = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalize).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const uniqueSorted = (values) => [...new Set(values.map(normalize).filter(Boolean))].sort((a, b) =>
  a.localeCompare(b, 'es', { sensitivity: 'base' }),
);

const getExtraValues = async (clave) => {
  const row = await Configuracion.findOne({ where: { clave } });
  return parseJsonArray(row?.valor);
};

const saveExtraValues = async (clave, values) => {
  const normalized = uniqueSorted(values);
  const [row] = await Configuracion.findOrCreate({
    where: { clave },
    defaults: {
      valor: JSON.stringify(normalized),
      descripcion: `Catálogo extra: ${clave}`,
    },
  });
  await row.update({ valor: JSON.stringify(normalized) });
  return normalized;
};

const getDistinctFromEquipos = async (field) => {
  const rows = await Electrodomestico.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col(field)), field]],
    where: {
      activo: true,
      [field]: { [Op.notIn]: [null, ''] },
    },
    raw: true,
  });
  return rows.map((row) => normalize(row[field])).filter(Boolean);
};

const listCatalog = async () => {
  const [marcasExtra, modelosExtra, marcasEquipos, modelosEquipos] = await Promise.all([
    getExtraValues(MARCA_KEY),
    getExtraValues(MODELO_KEY),
    getDistinctFromEquipos('marca'),
    getDistinctFromEquipos('modelo'),
  ]);

  return {
    marcas: uniqueSorted([...DEFAULT_MARCAS, ...marcasExtra, ...marcasEquipos]),
    modelos: uniqueSorted([...DEFAULT_MODELOS, ...modelosExtra, ...modelosEquipos]),
  };
};

const registerMarcaModelo = async ({ marca, modelo } = {}) => {
  const marcaNorm = normalize(marca);
  const modeloNorm = normalize(modelo);

  const updates = [];

  if (marcaNorm) {
    const { marcas } = await listCatalog();
    if (!marcas.some((m) => m.toLowerCase() === marcaNorm.toLowerCase())) {
      const extra = await getExtraValues(MARCA_KEY);
      updates.push(saveExtraValues(MARCA_KEY, [...extra, marcaNorm]));
    }
  }

  if (modeloNorm) {
    const { modelos } = await listCatalog();
    if (!modelos.some((m) => m.toLowerCase() === modeloNorm.toLowerCase())) {
      const extra = await getExtraValues(MODELO_KEY);
      updates.push(saveExtraValues(MODELO_KEY, [...extra, modeloNorm]));
    }
  }

  if (updates.length) await Promise.all(updates);
};

module.exports = {
  listCatalog,
  registerMarcaModelo,
};
