import { useEffect, useState } from 'react';
import { FileText, Download, Search, FileSpreadsheet } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import SearchableSelect from '../../components/SearchableSelect';
import PaginatedResponsiveList from '../../components/PaginatedResponsiveList';
import ServerPaginatedResponsiveList from '../../components/ServerPaginatedResponsiveList';
import { ListCard } from '../../components/ResponsiveList';
import { useCalculo } from '../../contexts/CalculoContext';
import { useAlert } from '../../contexts/ConfirmContext';
import { getCalculos, generarPDF, downloadReporte, downloadExcelReporte, getClientes } from '../../services/api';
import { formatDate, formatNumber, formatCurrency } from '../../utils/helpers';
import { buildFacturaFromCalculo } from '../../utils/factura';
import { useServerCalculosList, PAGE_SIZE } from '../../hooks/useServerCalculosList';

const getFacturaTotal = (calculo) => buildFacturaFromCalculo(calculo).totalMes;
const getModuloConsumoMes = (calculo, modulo) => {
  const key = {
    aparato: 'moduloAparatos',
    fantasma: 'moduloFantasma',
    iluminacion: 'moduloIluminacion',
  }[modulo];
  return calculo.resumen_json?.[key]?.totales?.consumoMes ?? '';
};

const getClienteNombre = (c) => {
  if (!c.cliente) return '-';
  return `${c.cliente.nombre || ''} ${c.cliente.apellido || ''}`.trim() || '-';
};

function ReportesList({
  calculos,
  ultimoCalculo,
  generating,
  exportingExcel,
  onPDF,
  onExcel,
  admin = false,
  serverPage,
  serverTotal,
  onServerPageChange,
  listLoading = false,
}) {
  const listProps = {
    loading: listLoading,
    empty: !listLoading && calculos.length === 0,
    emptyMessage: admin ? 'Ningún cliente ha guardado cálculos aún' : 'Sin cálculos guardados',
    emptyIcon: FileText,
    items: calculos,
    label: 'reportes',
    tableHead: admin ? (
      <tr>
        <th>ID</th><th>Cliente</th><th>Fecha</th><th>Cons. Mes</th><th>Total Factura</th><th>Acción</th>
      </tr>
    ) : (
      <tr>
        <th>ID</th><th>Fecha</th><th>Cons. Mes</th><th>Gasto Día</th>
        <th>Gasto Mes</th><th>Gasto Año</th><th>Total Factura</th><th>Acción</th>
      </tr>
    ),
    renderTableRow: (c) => (
      admin ? (
        <tr key={c.id}>
          <td>#{c.id}</td>
          <td>{getClienteNombre(c)}</td>
          <td>{formatDate(c.created_at)}</td>
          <td>{formatNumber(c.consumo_mes_total)} kWh</td>
          <td>{formatCurrency(getFacturaTotal(c))}</td>
          <td>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onPDF(c.id)}
                disabled={generating === c.id || exportingExcel === c.id}
              >
                <Download size={14} />
                {generating === c.id ? 'Gen...' : 'PDF'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onExcel(c.id)}
                disabled={exportingExcel === c.id || generating === c.id}
              >
                <FileSpreadsheet size={14} />
                {exportingExcel === c.id ? 'Gen...' : 'Excel'}
              </button>
            </div>
          </td>
        </tr>
      ) : (
        <tr key={c.id} className={c.id === ultimoCalculo?.id ? 'row-active' : ''}>
          <td>
            #{c.id}
            {c.id === ultimoCalculo?.id && (
              <span className="badge badge-success" style={{ marginLeft: '0.35rem' }}>Activo</span>
            )}
          </td>
          <td>{formatDate(c.created_at)}</td>
          <td>{formatNumber(c.consumo_mes_total)} kWh</td>
          <td>{formatCurrency(c.gasto_diario_total)}</td>
          <td>{formatCurrency(c.gasto_mensual_total)}</td>
          <td>{formatCurrency(c.gasto_anual_total)}</td>
          <td>{formatCurrency(getFacturaTotal(c))}</td>
          <td>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onPDF(c.id)}
                disabled={generating === c.id || exportingExcel === c.id}
              >
                <Download size={14} />
                {generating === c.id ? 'Generando...' : 'Descargar PDF'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onExcel(c.id)}
                disabled={exportingExcel === c.id || generating === c.id}
              >
                <FileSpreadsheet size={14} />
                {exportingExcel === c.id ? 'Exportando...' : 'Excel'}
              </button>
            </div>
          </td>
        </tr>
      )
    ),
    renderCard: (c) => (
      admin ? (
        <ListCard
          key={c.id}
          title={`Reporte #${c.id}`}
          subtitle={getClienteNombre(c)}
          badge={<span className="badge badge-info">{formatDate(c.created_at)}</span>}
          fields={[
            { label: 'Consumo/mes', value: `${formatNumber(c.consumo_mes_total)} kWh` },
            { label: 'Total', value: formatCurrency(getFacturaTotal(c)), highlight: true },
          ]}
          actions={
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => onPDF(c.id)}
                disabled={generating === c.id || exportingExcel === c.id}
              >
                <Download size={14} /> PDF
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => onExcel(c.id)}
                disabled={exportingExcel === c.id || generating === c.id}
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
            </div>
          }
        />
      ) : (
        <ListCard
          key={c.id}
          title={`Reporte #${c.id}`}
          subtitle={formatDate(c.created_at)}
          badge={
            c.id === ultimoCalculo?.id
              ? <span className="badge badge-success">Activo</span>
              : null
          }
          fields={[
            { label: 'Consumo/mes', value: `${formatNumber(c.consumo_mes_total)} kWh`, highlight: true },
            { label: 'Gasto/día', value: formatCurrency(c.gasto_diario_total) },
            { label: 'Gasto/mes', value: formatCurrency(c.gasto_mensual_total) },
            { label: 'Gasto/año', value: formatCurrency(c.gasto_anual_total) },
            { label: 'Total factura', value: formatCurrency(getFacturaTotal(c)), highlight: true },
          ]}
          actions={
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onPDF(c.id)}
                disabled={generating === c.id || exportingExcel === c.id}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Download size={14} />
                {generating === c.id ? 'Gen...' : 'PDF'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onExcel(c.id)}
                disabled={exportingExcel === c.id || generating === c.id}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <FileSpreadsheet size={14} />
                {exportingExcel === c.id ? 'Exp...' : 'Excel'}
              </button>
            </div>
          }
        />
      )
    ),
  };

  if (onServerPageChange) {
    return (
      <ServerPaginatedResponsiveList
        {...listProps}
        page={serverPage}
        total={serverTotal}
        pageSize={PAGE_SIZE}
        onPageChange={onServerPageChange}
      />
    );
  }

  return (
    <PaginatedResponsiveList
      {...listProps}
      pageSize={PAGE_SIZE}
    />
  );
}
/** Reportes del panel cliente */
function ClientReportesPage() {
  const { loading: contextLoading, ultimoCalculo } = useCalculo();
  const alert = useAlert();
  const [generating, setGenerating] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(null);
  const [calculos, setCalculos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => { setPage(1); }, [fechaDesde, fechaHasta, ultimoCalculo?.id]);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    const params = { page, limit: PAGE_SIZE };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    getCalculos(params)
      .then(({ data }) => {
        if (cancelled) return;
        setCalculos(data.data ?? []);
        setTotal(data.total ?? data.data?.length ?? 0);
      })
      .catch(() => { if (!cancelled) { setCalculos([]); setTotal(0); } })
      .finally(() => { if (!cancelled) setListLoading(false); });
    return () => { cancelled = true; };
  }, [page, fechaDesde, fechaHasta, ultimoCalculo?.id]);

  const handlePDF = async (calculoId) => {
    setGenerating(calculoId);
    try {
      const { data } = await generarPDF(calculoId);
      const blob = await downloadReporte(data.data.id);
      const url = window.URL.createObjectURL(blob.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_consumo_${calculoId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      await alert({
        title: 'Error al generar reporte',
        message: e.response?.data?.message || 'No se pudo generar el PDF.',
        variant: 'error',
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleExcel = async (calculoId) => {
    setExportingExcel(calculoId);
    try {
      const response = await downloadExcelReporte(calculoId);
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calculo_${calculoId}_detalles_graficos.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      await alert({
        title: 'Error al exportar',
        message: 'No se pudo generar el Excel. Verifica que el servidor esté activo.',
        variant: 'error',
      });
    } finally {
      setExportingExcel(null);
    }
  };

  if (contextLoading && total === 0 && listLoading) {
    return <div className="loading">Cargando reportes...</div>;
  }

  const hasFilters = Boolean(fechaDesde || fechaHasta);

  return (
    <div>
      <PageHeader
        title="Reportes PDF"
        subtitle="Descargue reportes de los cálculos guardados desde Inicio"
      />

      {/* Filtros de fecha */}
      <div className="card filters-card" style={{ marginBottom: '1rem' }}>
        <div className="card-body filters-panel">
          <div className="filters-grid reportes-filters-grid" style={{ gridTemplateColumns: 'auto auto auto auto', alignItems: 'end' }}>
            <div className="filter-field filter-field-dates">
              <label className="filter-label">Desde</label>
              <input type="date" className="form-control" value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="filter-field filter-field-dates">
              <label className="filter-label">Hasta</label>
              <input type="date" className="form-control" value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <div className="filter-field filter-actions">
              <label className="filter-label filter-label-invisible">Acciones</label>
              <div className="filter-actions-row">
                {hasFilters && (
                  <button type="button" className="btn btn-secondary btn-filter"
                    onClick={() => { setFechaDesde(''); setFechaHasta(''); }}>
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {total === 0 && !listLoading && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {hasFilters
                ? 'No hay cálculos en el período seleccionado. Prueba con otro rango de fechas.'
                : 'No hay cálculos guardados. Vaya a Inicio y pulse «Ejecutar Cálculo».'}
            </p>
            {!hasFilters && <Link to="/cliente" className="btn btn-primary">Ir a Inicio</Link>}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header view-desktop">
          <h3>{total} cálculo{total !== 1 ? 's' : ''} disponible{total !== 1 ? 's' : ''}</h3>
        </div>
        <ReportesList
          calculos={calculos}
          ultimoCalculo={ultimoCalculo}
          generating={generating}
          exportingExcel={exportingExcel}
          onPDF={handlePDF}
          onExcel={handleExcel}
          serverPage={page}
          serverTotal={total}
          onServerPageChange={setPage}
          listLoading={listLoading}
        />
      </div>
    </div>
  );
}

/** Reportes del panel admin — sin contexto de cliente */
function AdminReportesPage() {
  const alert = useAlert();
  const [searchParams] = useSearchParams();
  const [calculos, setCalculos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(null);
  const [search, setSearch] = useState('');
  const [clienteId, setClienteId] = useState(searchParams.get('cliente_id') || '');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    getClientes({ limit: 200 })
      .then(({ data }) => setClientes(data.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const paramCliente = searchParams.get('cliente_id');
    if (paramCliente) setClienteId(paramCliente);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [search, clienteId, fechaDesde, fechaHasta]);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: PAGE_SIZE };
    if (search.trim()) params.search = search.trim();
    if (clienteId) params.cliente_id = clienteId;
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;

    getCalculos(params)
      .then(({ data }) => {
        setCalculos(data.data);
        setTotal(data.total ?? data.data.length);
      })
      .catch(() => {
        setCalculos([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, search, clienteId, fechaDesde, fechaHasta]);

  const handlePDF = async (calculoId) => {
    setGenerating(calculoId);
    try {
      const { data } = await generarPDF(calculoId);
      const blob = await downloadReporte(data.data.id);
      const url = window.URL.createObjectURL(blob.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_consumo_${calculoId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      await alert({
        title: 'Error al generar reporte',
        message: e.response?.data?.message || 'No se pudo generar el PDF.',
        variant: 'error',
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleExcel = async (calculoId) => {
    setExportingExcel(calculoId);
    try {
      const response = await downloadExcelReporte(calculoId);
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calculo_${calculoId}_detalles_graficos.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      await alert({
        title: 'Error al exportar',
        message: 'No se pudo generar el Excel. Verifica que el servidor esté activo.',
        variant: 'error',
      });
    } finally {
      setExportingExcel(null);
    }
  };

  const handleExportCsv = async () => {
    if (total === 0) return;
    try {
      const params = { page: 1, limit: 10000 };
      if (search.trim()) params.search = search.trim();
      if (clienteId) params.cliente_id = clienteId;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const { data } = await getCalculos(params);
      const allRows = data.data || [];
      const rows = allRows.map((c) => [
        c.id,
        getClienteNombre(c),
        c.cliente?.documento || '',
        formatCsvDate(c.created_at),
        c.consumo_mes_total,
        c.gasto_diario_total,
        c.gasto_mensual_total,
        c.gasto_anual_total,
        getFacturaTotal(c),
      ]);
      exportToCsv(
      `reportes_${new Date().toISOString().slice(0, 10)}`,
      [
        'ID', 'Cliente', 'Documento', 'Fecha', 'Consumo mes (kWh)',
        'Gasto día (S/)', 'Gasto mes (S/)', 'Gasto año (S/)', 'Total factura (S/)',
      ],
      rows,
    );
    } catch (e) {
      await alert({
        title: 'Error al exportar',
        message: e.response?.data?.message || 'No se pudo exportar los reportes.',
        variant: 'error',
      });
    }
  };

  const clienteSeleccionado = clientes.find((c) => String(c.id) === String(clienteId));

  const clienteOptions = [
    { value: '', label: 'Todos los clientes' },
    ...clientes.map((c) => ({
      value: String(c.id),
      label: `${c.nombre} ${c.apellido || ''}`.trim(),
    })),
  ];

  const hasActiveFilters = Boolean(search.trim() || clienteId || fechaDesde || fechaHasta);

  const clearFilters = () => {
    setSearch('');
    setClienteId('');
    setFechaDesde('');
    setFechaHasta('');
  };

  if (loading && calculos.length === 0 && total === 0) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <PageHeader
        title="Reportes PDF"
        subtitle={
          clienteSeleccionado
            ? `Reportes de ${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`.trim()
            : 'Cálculos guardados por todos los clientes — descargue el PDF de cada uno'
        }
      />

      <div className="card filters-card">
        <div className="card-body filters-panel">
          <div className="filters-grid reportes-filters-grid">
            <div className="filter-field filter-field-search">
              <label className="filter-label" htmlFor="reportes-search">Buscar</label>
              <div className="search-input-wrap">
                <Search size={16} className="search-input-icon" />
                <input
                  id="reportes-search"
                  className="form-control search-input"
                  placeholder="Nombre o documento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-field">
              <label className="filter-label">Cliente</label>
              <SearchableSelect
                options={clienteOptions}
                value={clienteId}
                onChange={(val) => setClienteId(val)}
                placeholder="Todos los clientes"
                clearable={Boolean(clienteId)}
                getOptionLabel={(o) => o.label}
                getOptionValue={(o) => o.value}
              />
            </div>

            <div className="filter-field filter-field-dates">
              <label className="filter-label">Desde</label>
              <input
                type="date"
                className="form-control"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="filter-field filter-field-dates">
              <label className="filter-label">Hasta</label>
              <input
                type="date"
                className="form-control"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>

            <div className="filter-field filter-actions">
              <label className="filter-label filter-label-invisible">Acciones</label>
              <div className="filter-actions-row">
                {hasActiveFilters && (
                  <button type="button" className="btn btn-secondary btn-filter" onClick={clearFilters}>
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-filter btn-export"
                  onClick={handleExportCsv}
                  disabled={!total}
                >
                  <Download size={16} />
                  Exportar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {total === 0 && !loading && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body" style={{ padding: '1.25rem 1.5rem' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              No hay reportes con los filtros actuales. Los cálculos aparecen cuando un cliente
              registra equipos y pulsa <strong>Ejecutar Cálculo</strong> en su panel.
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header view-desktop">
          <h3>{total} reporte{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</h3>
        </div>
        <ReportesList
          calculos={calculos}
          generating={generating}
          exportingExcel={exportingExcel}
          onPDF={handlePDF}
          onExcel={handleExcel}
          admin
          serverPage={page}
          serverTotal={total}
          onServerPageChange={setPage}
        />
      </div>
    </div>
  );
}
export default function ReportesPage({ admin }) {
  return admin ? <AdminReportesPage /> : <ClientReportesPage />;
}
