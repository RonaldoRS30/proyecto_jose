import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GitCompare, Download, Zap, DollarSign, TrendingDown, TrendingUp,
  AlertTriangle, CheckSquare, Square, FileText, Calculator, CalendarRange,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import SearchableSelect from '../../components/SearchableSelect';
import ComparacionCharts, { ComparacionAhorroPie } from '../../components/ComparacionCharts';
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
  ahorroAnual: true,
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

export default function ComparacionPage() {
  const alert = useAlert();
  const [calculos, setCalculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [reciboId, setReciboId] = useState('');
  const [calculoId, setCalculoId] = useState('');
  const [metricas, setMetricas] = useState(DEFAULT_METRICAS);

  const fetchCalculos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCalculos({ page: 1, limit: 100 });
      const list = [...(data.data ?? [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      setCalculos(list);
      const { reciboId: rId, calculoId: cId } = pickComparacionDefaults(list);
      if (rId) setReciboId(rId);
      if (cId) setCalculoId(cId);
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

  const recibos = useMemo(
    () => calculos.filter(isReciboRegistro),
    [calculos],
  );

  const calculosEstimados = useMemo(
    () => calculos.filter((c) => !isReciboRegistro(c)),
    [calculos],
  );

  const reciboOptions = useMemo(
    () => buildComparacionSelectOptions(recibos),
    [recibos],
  );

  const calculoOptions = useMemo(
    () => buildComparacionSelectOptions(calculosEstimados),
    [calculosEstimados],
  );

  const renderEscenarioOption = useCallback(
    (opt) => <ComparacionEscenarioOption option={opt} />,
    [],
  );

  const reciboCalculo = useMemo(
    () => calculos.find((c) => String(c.id) === reciboId),
    [calculos, reciboId],
  );

  const calculoEstimado = useMemo(
    () => calculos.find((c) => String(c.id) === calculoId),
    [calculos, calculoId],
  );

  const comparison = useMemo(() => {
    if (!reciboCalculo || !calculoEstimado) return null;
    return compareCalculos(calculoEstimado, reciboCalculo);
  }, [reciboCalculo, calculoEstimado]);

  const activeMetricKeys = useMemo(
    () => COMPARACION_METRICAS.filter((m) => metricas[m.key]).map((m) => m.field),
    [metricas],
  );

  const handlePDF = async () => {
    if (!comparison) return;
    setPdfLoading(true);
    try {
      const { data } = await generarPDFComparacion(Number(calculoId), Number(reciboId));
      const blob = await downloadReporte(data.data.id);
      const url = window.URL.createObjectURL(blob.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparacion_${calculoId}_vs_${reciboId}.pdf`;
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

  const canCompare = recibos.length >= 1 && calculosEstimados.length >= 1;
  const faltaRecibo = recibos.length === 0;
  const faltaCalculo = calculosEstimados.length === 0;

  if (loading) return <div className="loading">Cargando comparación...</div>;

  if (!canCompare) {
    return (
      <div className="comparacion-page">
        <PageHeader
          title="Comparación de reportes"
          subtitle="Compare sus recibos subidos contra los cálculos estimados del sistema"
        />
        <div className="dashboard-empty">
          <GitCompare size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} aria-hidden />
          {faltaRecibo && faltaCalculo && (
            <p>
              Necesita al menos <strong>1 recibo subido</strong> y <strong>1 cálculo estimado</strong> en su historial.
              Suba su recibo en Mi Perfil y ejecute «Ejecutar Reporte» en Inicio.
            </p>
          )}
          {faltaRecibo && !faltaCalculo && (
            <p>
              Suba al menos un <strong>recibo PDF</strong> en Mi Perfil para compararlo con sus cálculos estimados.
            </p>
          )}
          {!faltaRecibo && faltaCalculo && (
            <p>
              Ejecute al menos un <strong>cálculo estimado</strong> desde Inicio («Ejecutar Reporte») para compararlo con sus recibos.
            </p>
          )}
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
  const anualAhorro = comparison?.facturaTotalAnio.ahorro ?? 0;
  const KwhIcon = kwhAhorro >= 0 ? TrendingDown : TrendingUp;
  const SolesIcon = facturaAhorro >= 0 ? TrendingDown : TrendingUp;
  const AnualIcon = anualAhorro >= 0 ? CalendarRange : TrendingUp;
  const neutralColor = '#64748b';

  return (
    <div className="comparacion-page">
      <PageHeader
        title="Comparación de reportes"
        subtitle="Compare un recibo subido contra un cálculo estimado con sus equipos"
        action={comparison ? {
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
            <label htmlFor="comparacion-recibo">Recibos subidos</label>
            <SearchableSelect
              options={reciboOptions}
              value={reciboId}
              onChange={setReciboId}
              placeholder="Seleccione un recibo..."
              clearable={false}
              renderOption={renderEscenarioOption}
              renderValue={renderEscenarioOption}
            />
          </div>
          <div className="comparacion-selectors__vs" aria-hidden>vs</div>
          <div className="form-group">
            <label htmlFor="comparacion-calculo">Cálculo estimado</label>
            <SearchableSelect
              options={calculoOptions}
              value={calculoId}
              onChange={setCalculoId}
              placeholder="Seleccione un cálculo..."
              clearable={false}
              renderOption={renderEscenarioOption}
              renderValue={renderEscenarioOption}
            />
          </div>
        </div>
        <p className="comparacion-selectors__hint">
          A la izquierda elige el recibo real (PDF) y a la derecha el cálculo estimado con sus equipos.
          El ahorro indica cuánto menos consume o paga su estimación respecto al recibo.
        </p>
      </div>

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
                subtext={`Recibo: ${formatNumber(comparison.consumoMesKwh.referencia)} kWh · Cálculo: ${formatNumber(comparison.consumoMesKwh.actual)} kWh`}
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
                subtext={`Recibo: ${formatCurrency(comparison.gastoEnergiaMes.referencia)} · Cálculo: ${formatCurrency(comparison.gastoEnergiaMes.actual)}`}
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
                subtext={`Recibo: ${formatCurrency(comparison.facturaTotalMes.referencia)} · Cálculo: ${formatCurrency(comparison.facturaTotalMes.actual)}`}
              />
            )}
            {metricas.ahorroAnual && (
              <StatCard
                icon={AnualIcon}
                label="Ahorro en años"
                value={formatAhorroLabel(
                  comparison.facturaTotalAnio.ahorro,
                  comparison.facturaTotalAnio.pctAhorro,
                  'S/',
                )}
                color={sinVariacion ? neutralColor : ahorroColor(anualAhorro)}
                subtext={`Recibo: ${formatCurrency(comparison.facturaTotalAnio.referencia)} · Cálculo: ${formatCurrency(comparison.facturaTotalAnio.actual)}`}
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
                    <th>Recibo subido</th>
                    <th>Cálculo estimado</th>
                    <th>Diferencia</th>
                    <th>% ahorro</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.consumoKwh && (
                    <tr>
                      <td>Consumo kWh/mes</td>
                      <td>{formatNumber(comparison.consumoMesKwh.referencia)}</td>
                      <td>{formatNumber(comparison.consumoMesKwh.actual)}</td>
                      <td>{formatNumber(comparison.consumoMesKwh.diferencia)}</td>
                      <td>{comparison.consumoMesKwh.pctAhorro != null ? `${comparison.consumoMesKwh.pctAhorro}%` : '—'}</td>
                    </tr>
                  )}
                  {metricas.gastoEnergia && (
                    <tr>
                      <td>Gasto energía S/mes</td>
                      <td>{formatCurrency(comparison.gastoEnergiaMes.referencia)}</td>
                      <td>{formatCurrency(comparison.gastoEnergiaMes.actual)}</td>
                      <td>{formatCurrency(comparison.gastoEnergiaMes.diferencia)}</td>
                      <td>{comparison.gastoEnergiaMes.pctAhorro != null ? `${comparison.gastoEnergiaMes.pctAhorro}%` : '—'}</td>
                    </tr>
                  )}
                  {metricas.totalFactura && (
                    <tr>
                      <td>Total a pagar S/mes</td>
                      <td>{formatCurrency(comparison.facturaTotalMes.referencia)}</td>
                      <td>{formatCurrency(comparison.facturaTotalMes.actual)}</td>
                      <td>{formatCurrency(comparison.facturaTotalMes.diferencia)}</td>
                      <td>{comparison.facturaTotalMes.pctAhorro != null ? `${comparison.facturaTotalMes.pctAhorro}%` : '—'}</td>
                    </tr>
                  )}
                  {metricas.consumoKwh && (
                    <tr>
                      <td>Consumo kWh/año</td>
                      <td>{formatNumber(comparison.consumoAnioKwh.referencia)}</td>
                      <td>{formatNumber(comparison.consumoAnioKwh.actual)}</td>
                      <td>{formatNumber(comparison.consumoAnioKwh.diferencia)}</td>
                      <td>{comparison.consumoAnioKwh.pctAhorro != null ? `${comparison.consumoAnioKwh.pctAhorro}%` : '—'}</td>
                    </tr>
                  )}
                  {metricas.gastoEnergia && (
                    <tr>
                      <td>Gasto energía S/año</td>
                      <td>{formatCurrency(comparison.gastoEnergiaAnio.referencia)}</td>
                      <td>{formatCurrency(comparison.gastoEnergiaAnio.actual)}</td>
                      <td>{formatCurrency(comparison.gastoEnergiaAnio.diferencia)}</td>
                      <td>{comparison.gastoEnergiaAnio.pctAhorro != null ? `${comparison.gastoEnergiaAnio.pctAhorro}%` : '—'}</td>
                    </tr>
                  )}
                  {metricas.ahorroAnual && (
                    <tr>
                      <td>Total a pagar S/año</td>
                      <td>{formatCurrency(comparison.facturaTotalAnio.referencia)}</td>
                      <td>{formatCurrency(comparison.facturaTotalAnio.actual)}</td>
                      <td>{formatCurrency(comparison.facturaTotalAnio.diferencia)}</td>
                      <td>{comparison.facturaTotalAnio.pctAhorro != null ? `${comparison.facturaTotalAnio.pctAhorro}%` : '—'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <ComparacionAhorroPie comparison={comparison} metricas={metricas} />
        </>
      )}
    </div>
  );
}
