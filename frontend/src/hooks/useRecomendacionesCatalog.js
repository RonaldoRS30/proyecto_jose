import { useEffect, useState } from 'react';
import { getRecomendaciones } from '../services/api';

const mapRecomendacion = (r) => ({
  id: r.id,
  recomendacion_id: r.id,
  nombre: r.nombre,
  potencia: Number(r.potencia_w) || 0,
  horas: r.horas_uso_dia != null ? Number(r.horas_uso_dia) : 24,
  categoria: r.categoria,
  texto: r.texto,
});

export function useRecomendacionesCatalog(modulo, fallbackPresets = []) {
  const [catalogo, setCatalogo] = useState(fallbackPresets);

  useEffect(() => {
    let cancelled = false;

    getRecomendaciones({ modulo })
      .then(({ data }) => {
        if (cancelled) return;
        const fromApi = (data.data || []).map(mapRecomendacion);
        if (!fromApi.length) {
          setCatalogo(fallbackPresets);
          return;
        }
        const names = new Set(fromApi.map((p) => p.nombre.toLowerCase()));
        const extras = fallbackPresets.filter((p) => !names.has(p.nombre.toLowerCase()));
        setCatalogo([...fromApi, ...extras]);
      })
      .catch(() => {
        if (!cancelled) setCatalogo(fallbackPresets);
      });

    return () => { cancelled = true; };
  }, [modulo]);

  return catalogo;
}
