import { matchCatalogEficiencia, PLANTILLAS_EFICIENCIA, parseMinutosEnteros } from './plantillasEficiencia';

function isPositive(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0;
}

export function validateEficienciaPayload(payload, catalogo = []) {
  const entry = matchCatalogEficiencia(payload.nombre, payload.recomendacion_id, catalogo);
  const plantillaId = payload.plantilla_eficiencia || entry?.plantilla_eficiencia;
  const plantilla = PLANTILLAS_EFICIENCIA[plantillaId];

  if (!plantilla) {
    return 'Este equipo no tiene eficiencia energética habilitada en el catálogo.';
  }

  for (const field of plantilla.fields) {
    if (field === 'potencia_w') {
      if (!isPositive(payload.potencia_w)) {
        return 'Indique la potencia (W).';
      }
    } else if (field === 'minutos_por_ciclo') {
      if (parseMinutosEnteros(payload.minutos_por_ciclo) == null) {
        return 'Indique la duración en minutos (número entero, sin decimales).';
      }
    } else if (!isPositive(payload[field])) {
      const labels = {
        kwh_por_ciclo: 'consumo por ciclo (kWh)',
        kwh_anual: 'consumo anual (kWh/año)',
        btu_h: 'capacidad en BTU/h',
        hp: 'potencia nominal (HP)',
      };
      return `Indique el ${labels[field] || field}.`;
    }
  }

  return null;
}
