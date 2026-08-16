import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GitCompare, Download, Zap, DollarSign, TrendingDown, TrendingUp,
  AlertTriangle, CheckSquare, Square, FileText, Calculator,
} from 'lucide-react';
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
import { formatNumber, formatCurrency } from '../../utils/helpers';
import { isReciboRegistro } from '../../utils/calculoRegistro';
import {
  compareCalculos,
  formatAhorroLabel,
  pickComparacionDefaults,
  buildComparacionSelectOptions,
  COMPARACION_METRICAS,
} from '../../utils/compareCalculos';

const DEFAULT_METRICAS = {
  consumoKwh: true,
  gastoEnergia: true,
  totalFactura: true,
};

function ComparacionEscenarioOption({ option }) {
  const Icon = option.esRecibo ? FileText : Calculator;
  return (
    <span className="comparacion-option-row">
      <span className={`comparacion-option-badge comparacion-option-badge--${option.badge.variant}`}>
        <Icon size={11} aria-hidden />
        {option.badge.text}
      </span>
      <span className="comparacion-option-detail">{option.label}</span>
    </span>
  );
}

function MetricCheckbox({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} className="comparacion-metric-check">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="comparacion-metric-check__box" aria-hidden="true">
        {checked ? <CheckSquare size={16} /> : <Square size={16} />}
      </span>
      <span>{label}</span>
    </label>
  );
}

function ahorroColor(value, neutral = false) {
  if (neutral || Math.abs(value ?? 0) < 0.001) return '#64748b';
  return value >= 0 ? '#10b981' : '#ef4444';
}

function escenarioLabel(comparison, side) {
  const esRecibo = side === 'actual' ? comparison.actualEsRecibo : comparison.referenciaEsRecibo;
  return esRecibo ? 'Recibo real' : 'Cálculo';
}

export default function ComparacionPage() {
  const alert = useAlert();
  const [calculos, setCalculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [actualId, setActualId] = useState('');
  const [referenciaId, setReferenciaId] = useState('');
  const [metricas, setMetricas] = useState(DEFAULT_METRICAS);

  const fetchCalculos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCalculos({ page: 1, limit: 100 });
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
        message: 'No se pudo cargar el historial de escenarios.',
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
    () => buildComparacionSelectOptions(calculos),
    [calculos],
  );

  const referenciaOptions = useMemo(
    () => options.filter((o) => o.value !== actualId),
    [options, actualId],
  );

  const actualOptions = useMemo(
    () => options.filter((o) => o.value !== referenciaId),
    [options, referenciaId],
  );

  const renderEscenarioOption = useCallback(
    (opt) => <ComparacionEscenarioOption option={opt} />,
    [],
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

  const activeMetricKeys = useMemo(
    () => COMPARACION_METRICAS.filter((m) => metricas[m.key]).map((m) => m.field),
    [metricas],
  );

  const handlePDF = async () => {
    if (!comparison || isReciboRegistro(actualCalculo)) return;
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
    } catch (err) {
      await alert({
        title: 'Error al generar PDF',
        message: err.response?.data?.message || 'No se pudo generar el reporte comparativo.',
        variant: 'error',
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const canCompare = calculos.length >= 2;

  if (loading) return <div className="loading">Cargando comparación...</div>;

  if (!canCompare) {
    return (
      <div className="comparacion-page">
        <PageHeader
          title="Comparación de reportes"
          subtitle="Compare recibos reales y cálculos estimados en un mismo selector"
        />
        <div className="dashboard-empty">
          <GitCompare size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} aria-hidden />
          <p>
            Necesita al menos <strong>2 escenarios</strong> en su historial
            (recibo PDF, cálculos estimados, o ambos).
          </p>
        </div>
      </div>
    );
  }

  const sinVariacion = comparison && activeMetricKeys.every(
    (k) => Math.abs(comparison[k]?.diferencia ?? 0) <= 0.001,
  );
  const kwhAhorro = comparison?.consumoMesKwh.ahorro ?? 0;
  const facturaAhorro = comparison?.facturaTotalMes.ahorro ?? 0;
  const energiaAhorro = comparison?.gastoEnergiaMes.ahorro ?? 0;
  const KwhIcon = kwhAhorro >= 0 ? TrendingDown : TrendingUp;
  const SolesIcon = facturaAhorro >= 0 ? TrendingDown : TrendingUp;
  const neutralColor = '#64748b';
  const pdfDisabled = !comparison || isReciboRegistro(actualCalculo);
  const actualTipo = comparison ? escenarioLabel(comparison, 'actual') : '';
  const refTipo = comparison ? escenarioLabel(comparison, 'referencia') : '';

  return (
    <div className="comparacion-page">
      <PageHeader
        title="Comparación de reportes"
        subtitle="Seleccione cualquier escenario: recibos reales (PDF) o cálculos del sistema"
        action={comparison && !pdfDisabled ? {
          label: pdfLoading ? 'Generando...' : 'Descargar PDF',
          icon: Download,
          onClick: handlePDF,
          disabled: pdfLoading,
        } : undefined}
      />

      <div className="comparacion-leyenda card">
        <span className="comparacion-option-badge comparacion-option-badge--recibo">
          <FileText size={11} aria-hidden />
          Recibo real
        </span>
        <span className="comparacion-leyenda-text">Datos informativos del PDF subido</span>
        <span className="comparacion-option-badge comparacion-option-badge--calculo">
          <Calculator size={11} aria-hidden />
          Cálculo
        </span>
        <span className="comparacion-leyenda-text">Escenario estimado con sus equipos</span>
      </div>

      <div className="card comparacion-metricas-card">
        <h3 className="comparacion-metricas-card__title">Indicadores a comparar</h3>
        <div className="comparacion-metricas-card__checks">
          {COMPARACION_METRICAS.map((m) => (
            <MetricCheckbox
              key={m.key}
              id={`metrica-${m.key}`}
              label={m.label}
              checked={metricas[m.key]}
              onChange={(checked) => setMetricas((prev) => ({ ...prev, [m.key]: checked }))}
            />
          ))}
        </div>
      </div>

      <div className="comparacion-selectors card">
        <div className="comparacion-selectors__grid">
          <div className="form-group">
            <label htmlFor="comparacion-actual">Escenario actual</label>
            <SearchableSelect
              options={actualOptions}
              value={actualId}
              onChange={setActualId}
              placeholder="Seleccione escenario..."
              clearable={false}
              renderOption={renderEscenarioOption}
              renderValue={renderEscenarioOption}
            />
          </div>
          <div className="comparacion-selectors__vs" aria-hidden>vs</div>
          <div className="form-group">
            <label htmlFor="comparacion-ref">Comparar con (referencia)</label>
            <SearchableSelect
              options={referenciaOptions}
              value={referenciaId}
              onChange={setReferenciaId}
              placeholder="Seleccione referencia..."
              clearable={false}
              renderOption={renderEscenarioOption}
              renderValue={renderEscenarioOption}
            />
          </div>
        </div>
        <p className="comparacion-selectors__hint">
          Puede comparar recibo vs cálculo, cálculo vs cálculo, o recibo vs recibo.
          El escenario actual se mide contra la referencia; el ahorro indica cuánto menos consume o paga.
        </p>
      </div>

      {actualId === referenciaId && (
        <div className="comparacion-alert">
          <AlertTriangle size={18} aria-hidden />
          Seleccione dos escenarios distintos para comparar.
        </div>
      )}

      {pdfDisabled && comparison && isReciboRegistro(actualCalculo) && (
        <div className="comparacion-alert comparacion-alert--info">
          <AlertTriangle size={18} aria-hidden />
          El PDF comparativo requiere un cálculo estimado como escenario actual. Puede invertir los selectores o elegir otro escenario.
        </div>
      )}

      {sinVariacion && (
        <div className="comparacion-alert comparacion-alert--info">
          <AlertTriangle size={18} aria-hidden />
          Los valores seleccionados son iguales. Elija otro escenario para ver diferencias.
        </div>
      )}

      {comparison?.tarifaDistinta && (
        <div className="comparacion-alert comparacion-alert--info">
          <AlertTriangle size={18} aria-hidden />
          Las tarifas kWh difieren; la comparación en soles puede incluir cambio de precio.
        </div>
      )}

      {comparison && (
        <>
          <div className="dashboard-kpi-grid comparacion-kpi-grid">
            {metricas.consumoKwh && (
              <StatCard
                icon={KwhIcon}
                label="Variación consumo kWh/mes"
                value={formatAhorroLabel(
                  comparison.consumoMesKwh.ahorro,
                  comparison.consumoMesKwh.pctAhorro,
                  'kWh',
                )}
                color={sinVariacion ? neutralColor : ahorroColor(kwhAhorro)}
                subtext={`${actualTipo}: ${formatNumber(comparison.consumoMesKwh.actual)} kWh · ${refTipo}: ${formatNumber(comparison.consumoMesKwh.referencia)} kWh`}
              />
            )}
            {metricas.gastoEnergia && (
              <StatCard
                icon={Zap}
                label="Variación gasto energía S/mes"
                value={formatAhorroLabel(
                  comparison.gastoEnergiaMes.ahorro,
                  comparison.gastoEnergiaMes.pctAhorro,
                  'S/',
                )}
                color={sinVariacion ? neutralColor : ahorroColor(energiaAhorro)}
                subtext={`${actualTipo}: ${formatCurrency(comparison.gastoEnergiaMes.actual)} · ${refTipo}: ${formatCurrency(comparison.gastoEnergiaMes.referencia)}`}
              />
            )}
            {metricas.totalFactura && (
              <StatCard
                icon={SolesIcon}
                label="Variación total a pagar S/mes"
                value={formatAhorroLabel(
                  comparison.facturaTotalMes.ahorro,
                  comparison.facturaTotalMes.pctAhorro,
                  'S/',
                )}
                color={sinVariacion ? neutralColor : ahorroColor(facturaAhorro)}
                subtext={`${actualTipo}: ${formatCurrency(comparison.facturaTotalMes.actual)} · ${refTipo}: ${formatCurrency(comparison.facturaTotalMes.referencia)}`}
              />
            )}
          </div>

          <ComparacionCharts comparison={comparison} metricas={metricas} />

          <div className="card comparacion-tabla">
            <div className="card-header">
              <h3>Detalle de la comparación</h3>
            </div>
            <div className="table-wrap table-dual-scroll">
              <table className="data-table comparacion-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Actual ({actualTipo})</th>
                    <th>Referencia ({refTipo})</th>
                    <th>Diferencia</th>
                    <th>% ahorro</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.consumoKwh && (
                    <tr>
                      <td>Consumo kWh/mes</td>
                      <td>{formatNumber(comparison.consumoMesKwh.actual)}</td>
                      <td>{formatNumber(comparison.consumoMesKwh.referencia)}</td>
                      <td>{formatNumber(comparison.consumoMesKwh.diferencia)}</td>
                      <td>{comparison.consumoMesKwh.pctAhorro != null ? `${comparison.consumoMesKwh.pctAhorro}%` : '—'}</td>
                    </tr>
                  )}
                  {metricas.gastoEnergia && (
                    <tr>
                      <td>Gasto energía S/mes</td>
                      <td>{formatCurrency(comparison.gastoEnergiaMes.actual)}</td>
                      <td>{formatCurrency(comparison.gastoEnergiaMes.referencia)}</td>
                      <td>{formatCurrency(comparison.gastoEnergiaMes.diferencia)}</td>
                      <td>{comparison.gastoEnergiaMes.pctAhorro != null ? `${comparison.gastoEnergiaMes.pctAhorro}%` : '—'}</td>
                    </tr>
                  )}
                  {metricas.totalFactura && (
                    <tr>
                      <td>Total a pagar S/mes</td>
                      <td>{formatCurrency(comparison.facturaTotalMes.actual)}</td>
                      <td>{formatCurrency(comparison.facturaTotalMes.referencia)}</td>
                      <td>{formatCurrency(comparison.facturaTotalMes.diferencia)}</td>
                      <td>{comparison.facturaTotalMes.pctAhorro != null ? `${comparison.facturaTotalMes.pctAhorro}%` : '—'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
