import { useCallback, useEffect, useState } from 'react';
import { getMarcaModeloCatalog } from '../services/api';

export function useMarcaModeloCatalog(enabled = true) {
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(false);

  const reloadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getMarcaModeloCatalog();
      setMarcas(data.data?.marcas || []);
      setModelos(data.data?.modelos || []);
    } catch {
      setMarcas([]);
      setModelos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) reloadCatalog();
  }, [enabled, reloadCatalog]);

  return { marcas, modelos, loading, reloadCatalog };
}
