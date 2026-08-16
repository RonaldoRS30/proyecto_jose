import { validateEficienciaPayload } from './eficienciaValidation';
import { matchCatalogEficiencia } from './plantillasEficiencia';
import { usaCiclosDiariosLavadora } from './eficienciaEnergetica';
import { findDuplicateNombreEquipo } from './nombreEquipo';

export async function saveElectrodomestico({
  editId,
  payload,
  createElectrodomestico,
  updateElectrodomestico,
  alert,
  catalogo = [],
  existingItems = [],
}) {
  if (payload.eficiencia_energetica) {
    const invalid = validateEficienciaPayload(payload, catalogo);
    if (invalid) {
      await alert({
        title: 'Datos de eficiencia incompletos',
        message: invalid,
        variant: 'warning',
        confirmLabel: 'Entendido',
      });
      return false;
    }
  }

  const catalogEntry = matchCatalogEficiencia(payload.nombre, payload.recomendacion_id, catalogo);
  const porCiclos = usaCiclosDiariosLavadora(payload, catalogEntry);

  if (porCiclos) {
    const ciclos = Number(payload.horas_uso_dia);
    if (!Number.isFinite(ciclos) || ciclos <= 0 || !Number.isInteger(ciclos)) {
      await alert({
        title: 'Ciclos inválidos',
        message: 'Indique la cantidad de ciclos por día (número entero mayor a 0).',
        variant: 'warning',
        confirmLabel: 'Entendido',
      });
      return false;
    }
  } else {
    const horas = parseFloat(payload.horas_uso_dia);
    if (!Number.isFinite(horas) || horas <= 0) {
      await alert({
        title: 'Tiempo de uso inválido',
        message: 'El tiempo de uso por día debe ser mayor a 0.',
        detail: 'Indique horas (ej. 0.5, 1, 2) o active minutos e ingrese la duración diaria (ej. 15 min).',
        variant: 'warning',
        confirmLabel: 'Entendido',
      });
      return false;
    }
  }

  const duplicado = findDuplicateNombreEquipo(payload.nombre, existingItems, editId);
  if (duplicado) {
    await alert({
      title: editId ? 'Nombre no disponible' : 'Equipo ya registrado',
      message: editId
        ? `Ya existe otro equipo llamado «${duplicado.nombre}». Elija un nombre distinto.`
        : `Ya existe un equipo llamado «${duplicado.nombre}». Puede editarlo desde la lista en lugar de agregar uno nuevo.`,
      detail: editId
        ? 'El nombre debe ser único en su inventario, sin importar marca o modelo.'
        : 'Busque el equipo en la lista y use «Editar» para actualizar sus datos.',
      variant: 'warning',
      confirmLabel: 'Entendido',
    });
    return false;
  }

  try {
    if (editId) await updateElectrodomestico(editId, payload);
    else await createElectrodomestico(payload);
    return true;
  } catch (err) {
    const message = err.response?.data?.message;
    if (err.response?.status === 409) {
      await alert({
        title: editId ? 'Nombre no disponible' : 'Equipo ya registrado',
        message: message || (editId
          ? 'Ya existe otro equipo con ese nombre.'
          : 'Ya existe un equipo con ese nombre.'),
        detail: editId
          ? 'Use un nombre distinto o deje el nombre actual sin cambios.'
          : 'Busque el equipo en la lista y use «Editar» para actualizar sus datos.',
        variant: 'warning',
        confirmLabel: 'Entendido',
      });
    } else {
      await alert({
        title: 'No se pudo guardar',
        message: message || 'Ocurrió un error al guardar el equipo.',
        variant: 'error',
        confirmLabel: 'Entendido',
      });
    }
    return false;
  }
}
