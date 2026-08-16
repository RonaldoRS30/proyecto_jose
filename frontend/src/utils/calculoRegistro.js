function parseResumenJson(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

/** Registro de historial subido desde PDF de recibo (solo informativo). */
export function isReciboRegistro(calculo) {
  const rj = parseResumenJson(calculo?.resumen_json);
  return calculo?.origen === 'recibo' || rj?.origen === 'recibo';
}

/** Primer escenario del cliente: datos del recibo PDF (línea base). */
export function isEscenarioInicial(calculo) {
  if (!isReciboRegistro(calculo)) return false;
  const rj = parseResumenJson(calculo?.resumen_json);
  return rj?.escenario_inicial === true;
}
