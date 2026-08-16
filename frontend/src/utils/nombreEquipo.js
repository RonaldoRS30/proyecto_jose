export function normalizeNombreEquipo(nombre) {
  if (!nombre) return '';
  return String(nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getAllEquiposFromModulos(modulos = {}) {
  return [
    ...(modulos.aparatos?.detalles ?? []),
    ...(modulos.fantasma?.detalles ?? []),
    ...(modulos.iluminacion?.detalles ?? []),
  ];
}

export function findDuplicateNombreEquipo(nombre, existingItems = [], editId = null) {
  const buscado = normalizeNombreEquipo(nombre);
  if (!buscado) return null;

  return existingItems.find((item) => {
    if (editId != null && String(item.id) === String(editId)) return false;
    return normalizeNombreEquipo(item.nombre) === buscado;
  }) ?? null;
}
