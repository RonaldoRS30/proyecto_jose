import { useMemo, useState } from 'react';
import { Eye, Download, History, FileText, Calculator } from 'lucide-react';
import Modal from '../../components/Modal';
import FacturaBreakdown from '../../components/FacturaBreakdown';
import PageHeader from '../../components/PageHeader';
import ServerPaginatedResponsiveList from '../../components/ServerPaginatedResponsiveList';
import { ListCard } from '../../components/ResponsiveList';
import { EvolucionHistoricaChart, GastoResumenChart } from '../../components/ConsumoCharts';
import { useCalculo } from '../../contexts/CalculoContext';
import { useAlert } from '../../contexts/ConfirmContext';
import { useCalculosChart, useServerCalculosList, PAGE_SIZE } from '../../hooks/useServerCalculosList';
import { getCalculo, generarPDF, downloadReporte } from '../../services/api';
import { formatNumber, formatCurrency, formatDate, formatDateDay } from '../../utils/helpers';
import { buildFacturaFromCalculo } from '../../utils/factura';
import { isReciboRegistro } from '../../utils/calculoRegistro';

const getFacturaTotal = (calculo) => buildFacturaFromCalculo(calculo).totalMes;

const getConsumoMes = (calculo) => {
  if (isReciboRegistro(calculo)) {
    const raw = calculo.consumo_mes_total ?? calculo.resumen_json?.consumo_kwh;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = parseFloat(calculo.consumo_mes_total);
  return Number.isFinite(n) ? n : 0;
};

const formatPeriodoFactura = (calculo) => {
  const raw = calculo?.periodo_facturacion || calculo?.resumen_json?.periodo_facturacion;
  if (!raw) return null;
  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
};

const formatFechaChartFull = (calculo) => {
  const d = new Date(calculo.created_at);
  const dia = d.toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const tipo = isReciboRegistro(calculo) ? 'Recibo real' : 'Cálculo estimado';
  return `${dia}, ${hora} · ${tipo}`;
};

const formatFechaChartShort = (calculo, sameCalendarDay) => {
  const d = new Date(calculo.created_at);
  const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  if (sameCalendarDay) return hora;
  const dia = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  return `${dia} ${hora}`;
};

const MONTHS = [
  { value: '', label: 'Todos los meses' },
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

function buildYearOptions() {
  const current = new Date().getFullYear();
  return [
    { value: '', label: 'Todos los años' },
    ...Array.from({ length: 4 }, (_, i) => {
      const year = current - i;
      return { value: String(year), label: String(year) };
    }),
  ];
}

function TipoBadge({ calculo }) {
  if (isReciboRegistro(calculo)) {
    return <span className="badge badge-warning"><FileText size={12} /> Recibo real</span>;
  }
  return <span className="badge badge-info"><Calculator size={12} /> Cálculo</span>;
}

export default function HistorialPage() {
  const { loading: contextLoading, resumenGeneral, ultimoCalculo } = useCalculo();
  const alert = useAlert();
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [origen, setOrigen] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const filters = useMemo(() => ({
    mes: mes || undefined,
    anio: anio || undefined,
    origen: origen || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  }), [mes, anio, origen, fechaDesde, fechaHasta]);

  const syncKey = ultimoCalculo?.id;
  const {
    calculos, total, page, setPage, loading: listLoading,
  } = useServerCalculosList({ syncKey, filters });
  const chartCalculos = useCalculosChart(20, syncKey, filters);
  const yearOptions = useMemo(() => buildYearOptions(), []);

  const viewDetail = async (id) => {
    const { data } = await getCalculo(id);
    setSelected(data.data);
    setModalOpen(true);
  };

  const handlePDF = async (calculoId) => {
    try {
      const { data } = await generarPDF(calculoId);
      const blob = await downloadReporte(data.data.id);
      const url = window.URL.createObjectURL(blob.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${calculoId}.pdf`;
      a.click();
    } catch {
      await alert({
        title: 'Error al generar PDF',
        message: 'No se pudo generar el reporte. Intente nuevamente.',
        variant: 'error',
      });
    }
  };

  const chartCalculosAsc = useMemo(
    () => [...chartCalculos].reverse(),
    [chartCalculos],
  );

  const chartData = useMemo(() => {
    const days = new Set(
      chartCalculosAsc.map((c) => new Date(c.created_at).toDateString()),
    );
    const sameCalendarDay = days.size <= 1;
    return chartCalculosAsc.map((c) => ({
      fecha: formatFechaChartShort(c, sameCalendarDay),
      fechaFull: formatFechaChartFull(c),
      consumoMes: getConsumoMes(c) ?? 0,
      gastoDiario: parseFloat(c.gasto_diario_total) || 0,
      gastoMensual: getFacturaTotal(c),
      gastoAnual: parseFloat(c.gasto_anual_total) || 0,
    }));
  }, [chartCalculosAsc]);

  const chartGastosActual = [
    { periodo: 'Diario', gasto: resumenGeneral.gastoDiario ?? 0 },
    { periodo: 'Mensual', gasto: resumenGeneral.gastoMensual ?? 0 },
    { periodo: 'Anual', gasto: resumenGeneral.gastoAnual ?? 0 },
  ];

  const renderActions = (c) => (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => viewDetail(c.id)}>
        <Eye size={14} /> Ver
      </button>
      {!isReciboRegistro(c) && (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => handlePDF(c.id)}>
          <Download size={14} /> PDF
        </button>
      )}
    </>
  );

  const hasActiveFilters = Boolean(mes || anio || origen || fechaDesde || fechaHasta);

  const clearFilters = () => {
    setMes('');
    setAnio('');
    setOrigen('');
    setFechaDesde('');
    setFechaHasta('');
  };

  if (contextLoading && total === 0) return <div className="loading">Cargando historial...</div>;

  return (
    <div>
      <PageHeader
        title="Historial de Facturación"
        subtitle="Compare su recibo real (al subir PDF) con los cálculos estimados del sistema"
      />

      <div className="search-bar historial-filters">
        <div className="search-input-wrap historial-date-wrap">
          <label className="historial-filter-label">Desde</label>
          <input
            type="date"
            className="form-control search-input"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            aria-label="Filtrar desde fecha"
          />
        </div>
        <div className="search-input-wrap historial-date-wrap">
          <label className="historial-filter-label">Hasta</label>
          <input
            type="date"
            className="form-control search-input"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            aria-label="Filtrar hasta fecha"
          />
        </div>
        <select className="form-control search-filter" value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Filtrar por mes">
          {MONTHS.map((m) => <option key={m.value || 'all'} value={m.value}>{m.label}</option>)}
        </select>
        <select className="form-control search-filter" value={anio} onChange={(e) => setAnio(e.target.value)} aria-label="Filtrar por año">
          {yearOptions.map((y) => <option key={y.value || 'all'} value={y.value}>{y.label}</option>)}
        </select>
        <select className="form-control search-filter" value={origen} onChange={(e) => setOrigen(e.target.value)} aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          <option value="recibo">Recibo real</option>
          <option value="calculo">Cálculo estimado</option>
        </select>
        {hasActiveFilters && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="card card-chart" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header"><h3>Evolución del total a pagar</h3></div>
          <div className="card-body chart-evolucion-body">
            <EvolucionHistoricaChart data={chartData} showKwh={false} />
          </div>
        </div>
      )}

      {chartGastosActual.some((g) => g.gasto > 0) && (
        <div className="card card-chart" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header"><h3>Gastos actuales (vista en tiempo real)</h3></div>
          <div className="card-body"><GastoResumenChart data={chartGastosActual} /></div>
        </div>
      )}

      <div className="card card-list historial-records-card">
        <div className="card-header view-desktop">
          <h3>{total} registro{total !== 1 ? 's' : ''} en historial</h3>
        </div>
        <ServerPaginatedResponsiveList
          loading={listLoading}
          empty={!listLoading && total === 0}
          emptyMessage={hasActiveFilters ? 'No hay registros con esos filtros.' : 'Suba su recibo en Perfil o ejecute un cálculo desde Inicio para comenzar el historial.'}
          emptyIcon={History}
          items={calculos}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="registros"
          mobileGridClass="data-cards-single"
          tableHead={
            <tr>
              <th>Fecha</th><th>Tipo</th><th>Cons. Mes</th><th>Total factura</th><th>Acciones</th>
            </tr>
          }
          renderTableRow={(c) => {
            const periodoFactura = formatPeriodoFactura(c);
            return (
            <tr key={c.id} className={c.id === ultimoCalculo?.id ? 'row-active' : ''}>
              <td>
                <strong>{formatDateDay(c.created_at)}</strong>
                <br />
                <small style={{ color: 'var(--text-muted)' }}>
                  {new Date(c.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </small>
                {isReciboRegistro(c) && periodoFactura && (
                  <>
                    <br />
                    <small style={{ color: 'var(--text-muted)' }}>Factura: {periodoFactura}</small>
                  </>
                )}
                {c.id === ultimoCalculo?.id && <span className="badge badge-success" style={{ marginLeft: '0.35rem' }}>Reciente</span>}
              </td>
              <td><TipoBadge calculo={c} /></td>
              <td>{(() => {
                const cons = getConsumoMes(c);
                if (isReciboRegistro(c)) {
                  return cons != null ? `${formatNumber(cons)} kWh` : '-';
                }
                return `${formatNumber(cons ?? 0)} kWh`;
              })()}</td>
              <td><strong>{formatCurrency(getFacturaTotal(c))}</strong></td>
              <td className="cell-actions">
                <div className="actions">{renderActions(c)}</div>
              </td>
            </tr>
            );
          }}
          renderCard={(c) => {
            const periodoFactura = formatPeriodoFactura(c);
            return (
            <ListCard
              title={formatDateDay(c.created_at)}
              subtitle={formatDate(c.created_at)}
              badge={<TipoBadge calculo={c} />}
              fields={[
                { label: 'Total factura', value: formatCurrency(getFacturaTotal(c)), highlight: true },
                { label: 'Consumo/mes', value: (() => {
                  const cons = getConsumoMes(c);
                  if (isReciboRegistro(c)) {
                    return cons != null ? `${formatNumber(cons)} kWh (recibo real)` : '— (no detectado en PDF)';
                  }
                  return `${formatNumber(cons ?? 0)} kWh`;
                })(), highlight: !isReciboRegistro(c) },
                ...(isReciboRegistro(c) && periodoFactura
                  ? [{ label: 'Período factura', value: periodoFactura }]
                  : []),
                ...(isReciboRegistro(c) && c.resumen_json?.empresa_distribuidora
                  ? [{ label: 'Distribuidora', value: c.resumen_json.empresa_distribuidora }]
                  : []),
              ]}
              actions={renderActions(c)}
            />
            );
          }}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Detalle del registro">
        {selected && (
          <div>
            <p><strong>Tipo:</strong> {isReciboRegistro(selected) ? 'Recibo real (PDF)' : 'Cálculo estimado'}</p>
            <p><strong>Fecha de subida:</strong> {formatDate(selected.created_at)}</p>
            {isReciboRegistro(selected) && formatPeriodoFactura(selected) && (
              <p><strong>Período del recibo:</strong> {formatPeriodoFactura(selected)}</p>
            )}
            <p><strong>Total factura:</strong> {formatCurrency(getFacturaTotal(selected))}</p>
            {isReciboRegistro(selected) && getConsumoMes(selected) != null && (
              <p><strong>Consumo del recibo:</strong> {formatNumber(getConsumoMes(selected))} kWh/mes</p>
            )}
            {isReciboRegistro(selected) ? (
              <>
                {selected.resumen_json?.empresa_distribuidora && <p><strong>Distribuidora:</strong> {selected.resumen_json.empresa_distribuidora}</p>}
                {selected.resumen_json?.tarifa_kwh != null && <p><strong>Tarifa detectada:</strong> {formatCurrency(selected.resumen_json.tarifa_kwh)}/kWh</p>}
                {selected.resumen_json?.nombre_archivo && <p><strong>Archivo:</strong> {selected.resumen_json.nombre_archivo}</p>}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.75rem' }}>
                  Registrado el día que subió el PDF. Compare con los cálculos estimados del mismo período.
                </p>
              </>
            ) : (
              <>
                <p><strong>Precio kWh:</strong> {formatCurrency(selected.precio_kwh)}</p>
                <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                <p>Consumo mensual: {formatNumber(selected.consumo_mes_total)} kWh</p>
                <p>Gasto mensual: {formatCurrency(selected.gasto_mensual_total)}</p>
                <div style={{ marginTop: '1rem' }}>
                  <FacturaBreakdown factura={selected.resumen_json?.factura} precioKwh={selected.precio_kwh} consumoMesFallback={selected.consumo_mes_total} />
                </div>
                {selected.detalles?.length > 0 && (
                  <>
                    <h4 style={{ marginTop: '1rem' }}>Equipos ({selected.detalles.length})</h4>
                    <ul style={{ fontSize: '0.85rem', paddingLeft: '1.25rem' }}>
                      {selected.detalles.map((d) => (
                        <li key={d.id}>{d.nombre} — {formatNumber(d.consumo_mes)} kWh | {formatCurrency(d.gasto_mensual)}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
