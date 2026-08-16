import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  hasCambiosPendientes,
  isCalculoSincronizado,
  isSoloConfigFacturacionPendiente,
  numDiff,
  previewPrecioKwh,
} from '../utils/calculoSync';
import { isReciboRegistro } from '../utils/calculoRegistro';
import { getCalculoPreview, ejecutarCalculo, getCalculos } from '../services/api';

const CalculoContext = createContext(null);

export function CalculoProvider({ children }) {
  const [preview, setPreview] = useState(null);
  const [ultimoCalculo, setUltimoCalculo] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [calculosLoading, setCalculosLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const refreshPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const { data } = await getCalculoPreview();
      setPreview(data.data);
      return data.data;
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const refreshCalculos = useCallback(async () => {
    setCalculosLoading(true);
    try {
      const { data } = await getCalculos({ page: 1, limit: 10 });
      const rows = data.data ?? [];
      // Solo cálculos estimados del sistema — los recibos PDF son referencia aparte.
      const latestCalculo = rows.find((c) => !isReciboRegistro(c)) ?? null;
      setUltimoCalculo(latestCalculo);
      return latestCalculo;
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setCalculosLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([refreshPreview(), refreshCalculos()]);
    } catch (e) {
      console.error(e);
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

  const hasCambiosSinGuardar = useMemo(
    () => hasCambiosPendientes(preview, ultimoCalculo),
    [preview, ultimoCalculo],
  );

  const calculoSincronizado = useMemo(
    () => isCalculoSincronizado(preview, ultimoCalculo),
    [preview, ultimoCalculo],
  );

  const tarifaCambiada = useMemo(() => {
    const previewTarifa = previewPrecioKwh(preview);
    if (!previewTarifa || !ultimoCalculo?.precio_kwh) return false;
    return numDiff(ultimoCalculo.precio_kwh, previewTarifa);
  }, [preview, ultimoCalculo]);

  const configFacturacionCambiada = useMemo(
    () => isSoloConfigFacturacionPendiente(preview, ultimoCalculo),
    [preview, ultimoCalculo],
  );

  const hasEquipos = (preview?.resumenGeneral?.cantidadEquipos ?? 0) > 0;

  const loading = previewLoading && preview === null;

  const value = useMemo(() => ({
    preview,
    ultimoCalculo,
    loading,
    previewLoading,
    calculosLoading,
    calculating,
    hasEquipos,
    hasCambiosSinGuardar,
    calculoSincronizado,
    tarifaCambiada,
    configFacturacionCambiada,
    refreshPreview,
    refreshCalculos,
    refreshAll,
    ejecutarCalculo: ejecutarCalculoGuardado,
    resumenGeneral: preview?.resumenGeneral ?? {},
    modulos: preview?.modulos ?? {},
    factura: preview?.factura,
    precioKwh: preview?.precioKwh ?? preview?.tarifa?.precioKwh,
    tarifaFuente: preview?.tarifa?.fuente ?? 'global',
    tarifaGlobal: preview?.tarifa?.globalPrecio,
    dispositivos: preview?.dispositivos ?? [],
    excedentesPotencia: preview?.excedentesPotencia ?? [],
  }), [
    preview, ultimoCalculo, loading, previewLoading, calculosLoading, calculating, hasEquipos, hasCambiosSinGuardar,
    tarifaCambiada, configFacturacionCambiada, calculoSincronizado, refreshPreview, refreshCalculos, refreshAll, ejecutarCalculoGuardado,
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
