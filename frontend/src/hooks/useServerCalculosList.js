import { useEffect, useState } from 'react';
import { getCalculos, getElectrodomesticos } from '../services/api';

export const PAGE_SIZE = 8;

export function useServerCalculosList({ pageSize = PAGE_SIZE, syncKey } = {}) {
  const [calculos, setCalculos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [syncKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCalculos({ page, limit: pageSize })
      .then(({ data }) => {
        if (cancelled) return;
        setCalculos(data.data ?? []);
        setTotal(data.total ?? data.data?.length ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setCalculos([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, pageSize, syncKey, refreshToken]);

  const reload = () => setRefreshToken((t) => t + 1);

  return { calculos, total, page, setPage, loading, pageSize, reload };
}

export function useCalculosChart(limit = 10, syncKey) {
  const [chartCalculos, setChartCalculos] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getCalculos({ page: 1, limit })
      .then(({ data }) => {
        if (!cancelled) setChartCalculos(data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setChartCalculos([]);
      });
    return () => { cancelled = true; };
  }, [limit, syncKey]);

  return chartCalculos;
}

export function useServerElectrodomesticosList(modulo) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [modulo]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getElectrodomesticos({ modulo, page, limit: PAGE_SIZE })
      .then(({ data }) => {
        if (cancelled) return;
        setItems(data.data ?? []);
        setTotal(data.total ?? data.data?.length ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [modulo, page, refreshToken]);

  const reload = () => setRefreshToken((t) => t + 1);

  return {
    items, total, page, setPage, loading, reload,
  };
}
