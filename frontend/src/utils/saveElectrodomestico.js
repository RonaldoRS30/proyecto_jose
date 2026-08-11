export async function saveElectrodomestico({
  editId,
  payload,
  createElectrodomestico,
  updateElectrodomestico,
  alert,
}) {
  const horas = parseFloat(payload.horas_uso_dia);
  if (!Number.isFinite(horas) || horas <= 0) {
    await alert({
      title: 'Horas de uso inválidas',
      message: 'Las horas de uso por día deben ser mayores a 0.',
      detail: 'Indique cuántas horas al día utiliza este equipo (por ejemplo: 0.5, 1, 2).',
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
