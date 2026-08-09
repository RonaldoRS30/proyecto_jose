import { useCallback, useEffect, useState } from 'react';
import { getElectrodomesticos, getRecomendaciones } from '../services/api';

const mapRecomendacion = (r) => {
  const aliases = Array.isArray(r.aliases) ? r.aliases : [];
  return {
    id: r.id,
    recomendacion_id: r.id,
    nombre: r.nombre,
    potencia: Number(r.potencia_w) || 0,
    horas: r.horas_uso_dia != null ? Number(r.horas_uso_dia) : 24,
    categoria: r.categoria,
    texto: r.texto,
    aliases,
    searchText: [r.nombre, ...aliases].join(' '),
    source: 'catalog',
  };
};

const mapFallbackPreset = (p) => ({
  ...p,
  recomendacion_id: p.recomendacion_id || p.id || null,
  searchText: p.nombre,
  source: 'catalog',
});

const mapElectrodomestico = (e) => ({
  id: `saved-${e.id}`,
  electrodomestico_id: e.id,
  nombre: e.nombre,
  potencia: Number(e.potencia_w) || 0,
  horas: e.horas_uso_dia != null ? Number(e.horas_uso_dia) : 24,
  categoria: e.categoria,
  marca: e.marca,
  modelo: e.modelo,
  cantidad: e.cantidad,
  dias_uso_mes: e.dias_uso_mes,
  observaciones: e.observaciones,
  recomendacion_id: e.recomendacion_id || null,
  searchText: e.nombre,
  source: 'saved',
});

function mergeCatalog(modulo, fromApi, savedItems, fallbackPresets) {
  const fallbacks = fallbackPresets.map(mapFallbackPreset);
  const catalogNames = new Set(fromApi.map((p) => p.nombre.toLowerCase()));
  const extras = fallbacks.filter((p) => !catalogNames.has(p.nombre.toLowerCase()));
  const savedNames = new Set([...catalogNames, ...extras.map((p) => p.nombre.toLowerCase())]);
  const savedUnique = savedItems.filter((s) => !savedNames.has(s.nombre.toLowerCase()));
  return [...fromApi, ...extras, ...savedUnique];
}

export function useRecomendacionesCatalog(modulo, fallbackPresets = []) {
  const [catalogo, setCatalogo] = useState(() => fallbackPresets.map(mapFallbackPreset));
  const [refreshToken, setRefreshToken] = useState(0);

  const reloadCatalog = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getRecomendaciones({ modulo }),
      getElectrodomesticos({ modulo }),
    ])
      .then(([recRes, elecRes]) => {
        if (cancelled) return;
        const fromApi = (recRes.data.data || []).map(mapRecomendacion);
        const saved = (elecRes.data.data || []).map(mapElectrodomestico);
        setCatalogo(mergeCatalog(modulo, fromApi, saved, fallbackPresets));
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogo(fallbackPresets.map(mapFallbackPreset));
        }
      });

    return () => { cancelled = true; };
  }, [modulo, refreshToken]);

  return { catalogo, reloadCatalog };
}
