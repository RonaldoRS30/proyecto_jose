import { useCallback, useEffect, useMemo, useState } from 'react';
import { GitCompare, Download, Zap, DollarSign, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import SearchableSelect from '../../components/SearchableSelect';
import ComparacionCharts from '../../components/ComparacionCharts';
import { useAlert } from '../../contexts/ConfirmContext';
import {
  getCalculos,
  generarPDFComparacion,
  downloadReporte,
} from '../../services/api';
import { formatNumber, formatCurrency, formatDate } from '../../utils/helpers';
import {
  compareCalculos,
  formatCalculoOptionLabel,
  formatAhorroLabel,
  pickComparacionDefaults,
} from '../../utils/compareCalculos';

export default function ComparacionPage() {
  const alert = useAlert();
  const [calculos, setCalculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [actualId, setActualId] = useState('');
  const [referenciaId, setReferenciaId] = useState('');

  const fetchCalculos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCalculos({ page: 1, limit: 100, origen: 'calculo' });
      const list = [...(data.data ?? [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      setCalculos(list);
      const { actualId: aId, referenciaId: rId } = pickComparacionDefaults(list);
      if (aId) setActualId(aId);
      if (rId) setReferenciaId(rId);
    } catch {
      await alert({
        title: 'Error',
        message: 'No se pudo cargar el historial de cálculos.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => { fetchCalculos(); }, [fetchCalculos]);

  useEffect(() => {
    if (calculos.length < 2 || !actualId || !referenciaId) return;
    if (actualId === referenciaId) {
      const { referenciaId: rId } = pickComparacionDefaults(calculos);
      if (rId && rId !== actualId) setReferenciaId(rId);
    }
  }, [calculos, actualId, referenciaId]);

  const options = useMemo(
    () => calculos.map((c) => ({
      value: String(c.id),
      label: formatCalculoOptionLabel(c),
      searchText: formatDate(c.created_at),
    })),
    [calculos],
  );

  const referenciaOptions = useMemo(
    () => options.filter((o) => o.value !== actualId),
    [options, actualId],
  );

  const actualCalculo = useMemo(
    () => calculos.find((c) => String(c.id) === actualId),
    [calculos, actualId],
  );

  const referenciaCalculo = useMemo(
    () => calculos.find((c) => String(c.id) === referenciaId),
    [calculos, referenciaId],
  );

  const comparison = useMemo(() => {
    if (!actualCalculo || !referenciaCalculo || actualId === referenciaId) return null;
    return compareCalculos(actualCalculo, referenciaCalculo);
  }, [actualCalculo, referenciaCalculo, actualId, referenciaId]);

  const handlePDF = async () => {
    if (!comparison) return;
    setPdfLoading(true);
    try {
      const { data } = await generarPDFComparacion(Number(actualId), Number(referenciaId));
      const blob = await downloadReporte(data.data.id);
      const url = window.URL.createObjectURL(blob.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparacion_${actualId}_vs_${referenciaId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      await alert({
        title: 'Error al generar PDF',
        message: 'No se pudo generar el reporte comparativo.',
        variant: 'error',
      });
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return <div className="loading">Cargando comparación...</div>;

  if (calculos.length < 2) {
    return (
      <div className="comparacion-page">
        <PageHeader
          title="Comparación de reportes"
          subtitle="Compare dos cálculos guardados y mida su ahorro"
        />
        <div className="dashboard-empty">
          <GitCompare size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} aria-hidden />
          <p>Necesita al menos <strong>2 cálculos estimados guardados</strong> para comparar.</p>
          <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
            Ejecute un cálculo desde Inicio y guarde otro en una fecha distinta. Los recibos reales del PDF se ven en Historial.
          </p>
        </div>
      </div>
    );
  }

  const kwhAhorro = comparison?.consumoMesKwh.ahorro ?? 0;
  const facturaAhorro = comparison?.facturaTotalMes.ahorro ?? 0;
  const solesAnualAhorro = comparison?.gastoEnergiaAnio.ahorro ?? 0;
  const sinVariacion = comparison && !comparison.tieneVariacion;
  const KwhIcon = kwhAhorro >= 0 ? TrendingDown : TrendingUp;
  const SolesIcon = facturaAhorro >= 0 ? TrendingDown : TrendingUp;
  const neutralColor = '#64748b';

  return (
    <div className="comparacion-page">
      <PageHeader
        title="Comparación de reportes"
        subtitle="Compare dos cálculos estimados del sistema (no incluye recibos reales del PDF)"
        action={comparison ? {
          label: pdfLoading ? 'Generando...' : 'Descargar PDF',
          icon: Download,
          onClick: handlePDF,
          disabled: pdfLoading,
        } : undefined}
      />

      <div className="comparacion-selectors card">
        <div className="comparacion-selectors__grid">
          <div className="form-group">
            <label htmlFor="comparacion-actual">Reporte actual (más reciente)</label>
            <SearchableSelect
              options={options}
              value={actualId}
              onChange={(v) => {
                setActualId(v);
                if (v === referenciaId) {
                  const otro = options.find((o) => o.value !== v);
                  if (otro) setReferenciaId(otro.value);
                }
              }}
              placeholder="Seleccione el cálculo actual..."
              clearable={false}
            />
          </div>
          <div className="comparacion-selectors__vs" aria-hidden>vs</div>
          <div className="form-group">
            <label htmlFor="comparacion-ref">Comparar con (referencia)</label>
            <SearchableSelect
              options={referenciaOptions}
              value={referenciaId}
              onChange={setReferenciaId}
              placeholder="Seleccione el cálculo de referencia..."
              clearable={false}
            />
          </div>
        </div>
      </div>

      {actualId === referenciaId && (
        <div className="comparacion-alert">
          <AlertTriangle size={18} aria-hidden />
          Seleccione dos cálculos distintos para comparar.
        </div>
      )}

      {sinVariacion && (
        <div className="comparacion-alert comparacion-alert--info">
          <AlertTriangle size={18} aria-hidden />
          Los dos cálculos seleccionados tienen los mismos valores. Elija otro cálculo de referencia en el selector de arriba para ver diferencias.
        </div>
      )}

      {comparison?.tarifaDistinta && (
        <div className="comparacion-alert comparacion-alert--info">
          <AlertTriangle size={18} aria-hidden />
          Los cálculos usaron tarifas distintas; la comparación en soles puede incluir cambio de precio kWh.
        </div>
      )}

      {comparison && (
        <>
          <div className="dashboard-kpi-grid comparacion-kpi-grid">
            <StatCard
              icon={Zap}
              label="Variación kWh/mes"
              value={formatAhorroLabel(
                comparison.consumoMesKwh.ahorro,
                comparison.consumoMesKwh.pctAhorro,
                'kWh',
              )}
              color={sinVariacion ? neutralColor : (kwhAhorro >= 0 ? '#10b981' : '#ef4444')}
              subtext={`Actual: ${formatNumber(comparison.consumoMesKwh.actual)} kWh · Ref.: ${formatNumber(comparison.consumoMesKwh.referencia)} kWh`}
            />
            <StatCard
              icon={SolesIcon}
              label="Variación total factura S/mes"
              value={formatAhorroLabel(
                comparison.facturaTotalMes.ahorro,
                comparison.facturaTotalMes.pctAhorro,
                'S/',
              )}
              color={sinVariacion ? neutralColor : (facturaAhorro >= 0 ? '#10b981' : '#ef4444')}
              subtext={`Actual: ${formatCurrency(comparison.facturaTotalMes.actual)} · Ref.: ${formatCurrency(comparison.facturaTotalMes.referencia)}`}
            />
            <StatCard
              icon={DollarSign}
              label="Variación energía S/año"
              value={formatAhorroLabel(
                comparison.gastoEnergiaAnio.ahorro,
                comparison.gastoEnergiaAnio.pctAhorro,
                'S/',
              )}
              color={sinVariacion ? neutralColor : (solesAnualAhorro >= 0 ? '#10b981' : '#ef4444')}
              subtext={`Actual: ${formatCurrency(comparison.gastoEnergiaAnio.actual)} · Ref.: ${formatCurrency(comparison.gastoEnergiaAnio.referencia)}`}
            />
            <StatCard
              icon={KwhIcon}
              label="Diferencia directa (actual − ref.)"
              value={sinVariacion
                ? 'Sin variación'
                : `${formatNumber(comparison.consumoMesKwh.diferencia)} kWh`}
              color={sinVariacion ? neutralColor : '#1A4AB0'}
              subtext={`Factura: ${formatCurrency(comparison.facturaTotalMes.diferencia)}`}
            />
          </div>

          <ComparacionCharts comparison={comparison} />

          <div className="card comparacion-tabla">
            <div className="card-header">
              <h3>Detalle de la comparación</h3>
            </div>
            <div className="table-wrap table-dual-scroll">
              <table className="data-table comparacion-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Actual</th>
                    <th>Referencia</th>
                    <th>Diferencia</th>
                    <th>% ahorro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Consumo kWh/mes</td>
                    <td>{formatNumber(comparison.consumoMesKwh.actual)}</td>
                    <td>{formatNumber(comparison.consumoMesKwh.referencia)}</td>
                    <td>{formatNumber(comparison.consumoMesKwh.diferencia)}</td>
                    <td>{comparison.consumoMesKwh.pctAhorro != null ? `${comparison.consumoMesKwh.pctAhorro}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Gasto energía S/mes</td>
                    <td>{formatCurrency(comparison.gastoEnergiaMes.actual)}</td>
                    <td>{formatCurrency(comparison.gastoEnergiaMes.referencia)}</td>
                    <td>{formatCurrency(comparison.gastoEnergiaMes.diferencia)}</td>
                    <td>{comparison.gastoEnergiaMes.pctAhorro != null ? `${comparison.gastoEnergiaMes.pctAhorro}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Gasto energía S/año</td>
                    <td>{formatCurrency(comparison.gastoEnergiaAnio.actual)}</td>
                    <td>{formatCurrency(comparison.gastoEnergiaAnio.referencia)}</td>
                    <td>{formatCurrency(comparison.gastoEnergiaAnio.diferencia)}</td>
                    <td>{comparison.gastoEnergiaAnio.pctAhorro != null ? `${comparison.gastoEnergiaAnio.pctAhorro}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Total factura S/mes</td>
                    <td>{formatCurrency(comparison.facturaTotalMes.actual)}</td>
                    <td>{formatCurrency(comparison.facturaTotalMes.referencia)}</td>
                    <td>{formatCurrency(comparison.facturaTotalMes.diferencia)}</td>
                    <td>{comparison.facturaTotalMes.pctAhorro != null ? `${comparison.facturaTotalMes.pctAhorro}%` : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
