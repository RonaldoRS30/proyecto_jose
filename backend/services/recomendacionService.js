const { Recomendacion } = require('../models');
const { AppError } = require('../utils/errorHandler');
const { matchRecomendacionesForEquipos } = require('./recomendacionMatcher');

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
  return Recomendacion.create({
    ...data,
    aliases: Array.isArray(data.aliases) ? data.aliases : [],
  });
};

const actualizar = async (id, data) => {
  const item = await obtener(id);
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
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  toggleActivo,
  obtenerParaEquipos,
};
