import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { getCalculoPreview, ejecutarCalculo, getCalculos } from '../services/api';

const CalculoContext = createContext(null);

export function CalculoProvider({ children }) {
  const [preview, setPreview] = useState(null);
  const [ultimoCalculo, setUltimoCalculo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const refreshPreview = useCallback(async () => {
    const { data } = await getCalculoPreview();
    setPreview(data.data);
    return data.data;
  }, []);

  const refreshCalculos = useCallback(async () => {
    const { data } = await getCalculos({ page: 1, limit: 1 });
    const latest = data.data?.[0] ?? null;
    setUltimoCalculo(latest);
    return latest;
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([refreshPreview(), refreshCalculos()]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [refreshPreview, refreshCalculos]);

  const ejecutarCalculoGuardado = useCallback(async () => {
    setCalculating(true);
    try {
      await ejecutarCalculo();
      await Promise.all([refreshPreview(), refreshCalculos()]);
    } catch (e) {
      throw e;
    } finally {
      setCalculating(false);
    }
  }, [refreshPreview, refreshCalculos]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const hasCambiosSinGuardar = useMemo(() => {
    if (!preview?.resumenGeneral) return false;
    if (!ultimoCalculo) {
      return (preview.resumenGeneral.cantidadEquipos ?? 0) > 0;
    }
    const diff = (a, b) => Math.abs(parseFloat(a || 0) - parseFloat(b || 0)) > 0.001;
    return (
      diff(ultimoCalculo.consumo_mes_total, preview.resumenGeneral.consumoMes)
      || diff(ultimoCalculo.gasto_mensual_total, preview.resumenGeneral.gastoMensual)
      || diff(ultimoCalculo.factura_total_mes, preview.factura?.totalMes)
    );
  }, [preview, ultimoCalculo]);

  const hasEquipos = (preview?.resumenGeneral?.cantidadEquipos ?? 0) > 0;

  const value = useMemo(() => ({
    preview,
    ultimoCalculo,
    loading,
    calculating,
    hasEquipos,
    hasCambiosSinGuardar,
    refreshPreview,
    refreshCalculos,
    refreshAll,
    ejecutarCalculo: ejecutarCalculoGuardado,
    resumenGeneral: preview?.resumenGeneral ?? {},
    modulos: preview?.modulos ?? {},
    factura: preview?.factura,
    precioKwh: preview?.precioKwh,
    dispositivos: preview?.dispositivos ?? [],
  }), [
    preview, ultimoCalculo, loading, calculating, hasEquipos, hasCambiosSinGuardar,
    refreshPreview, refreshCalculos, refreshAll, ejecutarCalculoGuardado,
  ]);

  return (
    <CalculoContext.Provider value={value}>
      {children}
    </CalculoContext.Provider>
  );
}

export function useCalculo() {
  const ctx = useContext(CalculoContext);
  if (!ctx) {
    throw new Error('useCalculo debe usarse dentro de CalculoProvider');
  }
  return ctx;
}
