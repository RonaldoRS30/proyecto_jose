export async function saveElectrodomestico({
  editId,
  payload,
  createElectrodomestico,
  updateElectrodomestico,
  alert,
}) {
  try {
    if (editId) await updateElectrodomestico(editId, payload);
    else await createElectrodomestico(payload);
    return true;
  } catch (err) {
    const message = err.response?.data?.message;
    if (err.response?.status === 409) {
      await alert({
        title: 'Equipo ya registrado',
        message: message || 'Ya existe un equipo con ese nombre.',
        detail: 'Busque el equipo en la lista y use «Editar» para actualizar sus datos.',
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
