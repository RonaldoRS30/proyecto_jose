import { useState } from 'react';
import { Eye, Download, History } from 'lucide-react';
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
import { formatNumber, formatCurrency, formatDate } from '../../utils/helpers';
import { buildFacturaFromCalculo } from '../../utils/factura';

const getFacturaTotal = (calculo) => buildFacturaFromCalculo(calculo).totalMes;

export default function HistorialPage() {
  const { loading: contextLoading, resumenGeneral, ultimoCalculo } = useCalculo();
  const alert = useAlert();
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const syncKey = ultimoCalculo?.id;
  const {
    calculos, total, page, setPage, loading: listLoading,
  } = useServerCalculosList({ syncKey });
  const chartCalculos = useCalculosChart(10, syncKey);

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

  const chartData = [...chartCalculos].reverse().map((c) => ({
    fecha: new Date(c.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    consumoMes: parseFloat(c.consumo_mes_total),
    gastoDiario: parseFloat(c.gasto_diario_total),
    gastoMensual: parseFloat(c.gasto_mensual_total),
    gastoAnual: parseFloat(c.gasto_anual_total),
  }));

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
      <button type="button" className="btn btn-primary btn-sm" onClick={() => handlePDF(c.id)}>
        <Download size={14} /> PDF
      </button>
    </>
  );

  if (contextLoading && total === 0) return <div className="loading">Cargando historial...</div>;

  return (
    <div>
      <PageHeader
        title="Historial de Cálculos"
        subtitle="Registro de cálculos guardados desde Inicio — vinculado al sistema global"
      />

      <div className="card card-chart" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><h3>Evolución Histórica</h3></div>
        <div className="card-body chart-evolucion-body">
          <EvolucionHistoricaChart data={chartData} />
        </div>
      </div>

      {chartGastosActual.some((g) => g.gasto > 0) && (
        <div className="card card-chart" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3>Gastos actuales (vista en tiempo real)</h3>
          </div>
          <div className="card-body"><GastoResumenChart data={chartGastosActual} /></div>
        </div>
      )}

      <div className="card">
        <div className="card-header view-desktop">
          <h3>{total} registro{total !== 1 ? 's' : ''} guardado{total !== 1 ? 's' : ''}</h3>
        </div>
        <ServerPaginatedResponsiveList
          loading={listLoading}
          empty={!listLoading && total === 0}
          emptyMessage="No hay cálculos guardados. Ejecute el cálculo desde Inicio."
          emptyIcon={History}
          items={calculos}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="registros"
          tableHead={
            <tr>
              <th>Fecha</th><th>Cons. Mes</th><th>Gasto Día</th><th>Gasto Mes</th>
              <th>Gasto Año</th><th>Factura Est.</th><th>Demanda</th><th>Acciones</th>
            </tr>
          }
          renderTableRow={(c) => (
            <tr key={c.id} className={c.id === ultimoCalculo?.id ? 'row-active' : ''}>
              <td>
                {formatDate(c.created_at)}
                {c.id === ultimoCalculo?.id && (
                  <span className="badge badge-success" style={{ marginLeft: '0.35rem' }}>Activo</span>
                )}
              </td>
              <td>{formatNumber(c.consumo_mes_total)} kWh</td>
              <td>{formatCurrency(c.gasto_diario_total)}</td>
              <td>{formatCurrency(c.gasto_mensual_total)}</td>
              <td>{formatCurrency(c.gasto_anual_total)}</td>
              <td>{formatCurrency(getFacturaTotal(c))}</td>
              <td>{formatNumber(c.demanda_total)} kW</td>
              <td className="actions">{renderActions(c)}</td>
            </tr>
          )}
          renderCard={(c) => (
            <ListCard
              title={formatDate(c.created_at)}
              badge={
                c.id === ultimoCalculo?.id
                  ? <span className="badge badge-success">Activo</span>
                  : <span className="badge badge-info">#{c.id}</span>
              }
              fields={[
                { label: 'Consumo/mes', value: `${formatNumber(c.consumo_mes_total)} kWh`, highlight: true },
                { label: 'Gasto/día', value: formatCurrency(c.gasto_diario_total) },
                { label: 'Gasto/mes', value: formatCurrency(c.gasto_mensual_total) },
                { label: 'Gasto/año', value: formatCurrency(c.gasto_anual_total) },
                { label: 'Factura est.', value: formatCurrency(getFacturaTotal(c)), highlight: true },
                { label: 'Demanda', value: `${formatNumber(c.demanda_total)} kW` },
              ]}
              actions={renderActions(c)}
            />
          )}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Detalle del Cálculo">
        {selected && (
          <div>
            <p><strong>Fecha:</strong> {formatDate(selected.created_at)}</p>
            <p><strong>Precio kWh:</strong> {formatCurrency(selected.precio_kwh)}</p>
            <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
            <p>Consumo diario: {formatNumber(selected.consumo_dia_total)} kWh</p>
            <p>Consumo mensual: {formatNumber(selected.consumo_mes_total)} kWh</p>
            <p>Consumo anual: {formatNumber(selected.consumo_anio_total)} kWh</p>
            <p>Gasto diario: {formatCurrency(selected.gasto_diario_total)}</p>
            <p>Gasto mensual: {formatCurrency(selected.gasto_mensual_total)}</p>
            <p>Gasto anual: {formatCurrency(selected.gasto_anual_total)}</p>
            <p>Total factura: {formatCurrency(getFacturaTotal(selected))}</p>
            <div style={{ marginTop: '1rem' }}>
              <FacturaBreakdown
                factura={selected.resumen_json?.factura}
                precioKwh={selected.precio_kwh}
                consumoMesFallback={selected.consumo_mes_total}
              />
            </div>
            {selected.detalles?.length > 0 && (
              <>
                <h4 style={{ marginTop: '1rem' }}>Equipos ({selected.detalles.length})</h4>
                <ul style={{ fontSize: '0.85rem', paddingLeft: '1.25rem' }}>
                  {selected.detalles.map((d) => (
                    <li key={d.id}>
                      {d.nombre} — {formatNumber(d.consumo_dia)}/{formatNumber(d.consumo_mes)}/{formatNumber(d.consumo_anio)} kWh
                      {' '}| {formatCurrency(d.gasto_diario)}/{formatCurrency(d.gasto_mensual)}/{formatCurrency(d.gasto_anual)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
