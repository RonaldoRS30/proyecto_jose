function normalizeNombreEquipo(nombre) {
  if (!nombre) return '';
  return String(nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

module.exports = { normalizeNombreEquipo };
