/** Registro de historial subido desde PDF de recibo (solo informativo). */
export function isReciboRegistro(calculo) {
  return calculo?.origen === 'recibo' || calculo?.resumen_json?.origen === 'recibo';
}
