export async function saveElectrodomestico({
  editId,
  payload,
  createElectrodomestico,
  updateElectrodomestico,
  alert,
}) {
  if (payload.eficiencia_energetica) {
    const nombre = String(payload.nombre || '').toLowerCase();
    const esLav = nombre.includes('lavadora');
    const esRef = nombre.includes('refrigerador') || nombre.includes('nevera') || nombre.includes('refri');
    if (esLav) {
      const kwh = parseFloat(payload.kwh_por_ciclo);
      const horas = parseFloat(payload.horas_por_ciclo);
      if (!Number.isFinite(kwh) || kwh <= 0 || !Number.isFinite(horas) || horas <= 0) {
        await alert({
          title: 'Datos de eficiencia incompletos',
          message: 'Indique consumo por ciclo (kWh) y duración del ciclo (horas).',
          variant: 'warning',
          confirmLabel: 'Entendido',
        });
        return false;
      }
    } else if (esRef) {
      const anual = parseFloat(payload.kwh_anual);
      if (!Number.isFinite(anual) || anual <= 0) {
        await alert({
          title: 'Datos de eficiencia incompletos',
          message: 'Indique el consumo anual (kWh/año) de la etiqueta del refrigerador.',
          variant: 'warning',
          confirmLabel: 'Entendido',
        });
        return false;
      }
    }
  }

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
