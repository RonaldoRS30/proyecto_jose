const { Op } = require('sequelize');
const { Recomendacion, Electrodomestico } = require('../models');
const { AppError } = require('../utils/errorHandler');
const { normalizeNombreEquipo } = require('../helpers/nombreEquipoHelper');
const { matchRecomendacionesForEquipos } = require('./recomendacionMatcher');

const MODULOS_VALIDOS = ['aparato', 'fantasma', 'iluminacion'];

const TEXTO_RECOMENDACION_CLIENTE = 'Equipo registrado por un cliente. Personalice la recomendación, potencia de referencia y fórmulas desde este panel.';

function normalizeModulo(modulo) {
  const value = String(modulo || 'aparato').toLowerCase();
  if (!MODULOS_VALIDOS.includes(value)) {
    throw new AppError('Módulo inválido.', 400);
  }
  return value;
}

function findRecomendacionByNombreModulo(recomendaciones, nombre, modulo) {
  const buscado = normalizeNombreEquipo(nombre);
  if (!buscado) return null;
  return recomendaciones.find(
    (rec) => rec.modulo === modulo && normalizeNombreEquipo(rec.nombre) === buscado,
  ) || null;
}

async function loadRecomendacionesIndex() {
  const rows = await Recomendacion.findAll({
    attributes: ['id', 'nombre', 'modulo', 'potencia_w', 'horas_uso_dia', 'texto', 'orden'],
  });
  const byModulo = new Map();
  for (const modulo of MODULOS_VALIDOS) {
    byModulo.set(modulo, []);
  }
  rows.forEach((row) => {
    const list = byModulo.get(row.modulo);
    if (list) list.push(row);
  });
  return byModulo;
}

/**
 * Crea o reutiliza una recomendación de catálogo para un equipo del cliente.
 * Devuelve el id de recomendación vinculado.
 */
async function ensureRecomendacionFromEquipo(data, { index = null } = {}) {
  const nombre = String(data.nombre || '').trim();
  if (!nombre) return null;

  const modulo = normalizeModulo(data.modulo);
  const catalogIndex = index || await loadRecomendacionesIndex();
  const catalogoModulo = catalogIndex.get(modulo) || [];

  if (data.recomendacion_id) {
    const linked = catalogoModulo.find((rec) => Number(rec.id) === Number(data.recomendacion_id))
      || (await Recomendacion.findByPk(data.recomendacion_id));
    if (linked
      && linked.modulo === modulo
      && normalizeNombreEquipo(linked.nombre) === normalizeNombreEquipo(nombre)) {
      return linked.id;
    }
  }

  const existing = findRecomendacionByNombreModulo(catalogoModulo, nombre, modulo);
  if (existing) {
    const updates = {};
    if ((existing.potencia_w == null || existing.potencia_w === '') && data.potencia_w != null) {
      updates.potencia_w = data.potencia_w;
    }
    if ((existing.horas_uso_dia == null || existing.horas_uso_dia === '') && data.horas_uso_dia != null) {
      updates.horas_uso_dia = data.horas_uso_dia;
    }
    if (Object.keys(updates).length) {
      await existing.update(updates);
    }
    return existing.id;
  }

  const maxOrden = catalogoModulo.reduce((max, rec) => Math.max(max, rec.orden || 0), 0);
  const created = await Recomendacion.create({
    nombre,
    texto: TEXTO_RECOMENDACION_CLIENTE,
    aliases: [],
    categoria: data.categoria || 'Otros',
    modulo,
    potencia_w: data.potencia_w ?? null,
    horas_uso_dia: data.horas_uso_dia ?? null,
    activo: true,
    orden: maxOrden + 1,
    eficiencia_habilitada: false,
    plantilla_eficiencia: null,
    eficiencia_config: null,
  });

  catalogoModulo.push(created);
  return created.id;
}

/** Sincroniza equipos ya guardados por clientes que aún no tienen recomendación en admin. */
async function syncRecomendacionesDesdeEquipos() {
  const equipos = await Electrodomestico.findAll({
    where: { activo: true },
    attributes: [
      'id', 'nombre', 'modulo', 'categoria', 'potencia_w', 'horas_uso_dia', 'recomendacion_id',
    ],
  });

  if (!equipos.length) return { synced: 0, created: 0 };

  const index = await loadRecomendacionesIndex();
  let synced = 0;
  let created = 0;

  for (const equipo of equipos) {
    const beforeCount = [...index.values()].reduce((sum, list) => sum + list.length, 0);
    const recomendacionId = await ensureRecomendacionFromEquipo(equipo.toJSON(), { index });
    const afterCount = [...index.values()].reduce((sum, list) => sum + list.length, 0);
    if (afterCount > beforeCount) created += 1;

    if (recomendacionId && Number(equipo.recomendacion_id) !== Number(recomendacionId)) {
      await equipo.update({ recomendacion_id: recomendacionId });
      synced += 1;
    }
  }

  return { synced, created };
}

const listar = async ({ soloActivas = false, modulo = null } = {}) => {
  const where = {};
  if (soloActivas) where.activo = true;
  if (modulo) where.modulo = modulo;

  return Recomendacion.findAll({
    where,
    order: [['orden', 'ASC'], ['nombre', 'ASC']],
  });
};

const obtener = async (id) => {
  const item = await Recomendacion.findByPk(id);
  if (!item) throw new AppError('Recomendación no encontrada', 404);
  return item;
};

const crear = async (data) => {
  if (data.eficiencia_habilitada && !data.plantilla_eficiencia) {
    throw new AppError('Seleccione una plantilla de eficiencia energética.', 400);
  }
  return Recomendacion.create({
    ...data,
    aliases: Array.isArray(data.aliases) ? data.aliases : [],
  });
};

const actualizar = async (id, data) => {
  const item = await obtener(id);
  const merged = { ...item.toJSON(), ...data };
  if (merged.eficiencia_habilitada && !merged.plantilla_eficiencia) {
    throw new AppError('Seleccione una plantilla de eficiencia energética.', 400);
  }
  await item.update({
    ...data,
    aliases: data.aliases != null
      ? (Array.isArray(data.aliases) ? data.aliases : [])
      : item.aliases,
  });
  return item;
};

const eliminar = async (id) => {
  const item = await obtener(id);
  await item.destroy();
  return { message: 'Recomendación eliminada' };
};

const toggleActivo = async (id) => {
  const item = await obtener(id);
  await item.update({ activo: !item.activo });
  return item;
};

const obtenerParaEquipos = async (equipos) => {
  const recomendaciones = await listar({ soloActivas: true });
  const matched = [];
  const seen = new Set();

  const addRecomendacion = (rec) => {
    if (!rec || seen.has(rec.id)) return;
    seen.add(rec.id);
    matched.push(rec);
  };

  const ids = new Set(
    (equipos || [])
      .map((equipo) => Number(equipo.recomendacion_id))
      .filter(Boolean)
  );

  if (ids.size > 0) {
    recomendaciones
      .filter((rec) => ids.has(rec.id))
      .forEach(addRecomendacion);
  }

  const equiposSinId = (equipos || []).filter((equipo) => !equipo.recomendacion_id);
  matchRecomendacionesForEquipos(equiposSinId, recomendaciones).forEach(addRecomendacion);

  return matched.sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.nombre.localeCompare(b.nombre));
};

module.exports = {
  TEXTO_RECOMENDACION_CLIENTE,
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  toggleActivo,
  obtenerParaEquipos,
  ensureRecomendacionFromEquipo,
  syncRecomendacionesDesdeEquipos,
  findRecomendacionByNombreModulo,
};
