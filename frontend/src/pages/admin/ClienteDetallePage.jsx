import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Key, Plug, Ghost, Lightbulb, History } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import { useAlert } from '../../contexts/ConfirmContext';
import { usePagination } from '../../hooks/usePagination';
import { getClienteDetalle, generarPDF, downloadReporte } from '../../services/api';
import { formatDate, formatNumber, formatCurrency } from '../../utils/helpers';
import { buildFacturaFromCalculo } from '../../utils/factura';

const getFacturaTotal = (calculo) => buildFacturaFromCalculo(calculo).totalMes;

const MODULO_LABEL = {
  aparato: 'Electrodomésticos',
  fantasma: 'Consumo fantasma',
  iluminacion: 'Iluminación',
};

const PAGE_SIZE = 8;

export default function ClienteDetallePage() {
  const alert = useAlert();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);

  const electrodomesticos = data?.electrodomesticos ?? [];
  const calculos = data?.calculos ?? [];
  const accesos = data?.accesos ?? [];

  const equiposPagination = usePagination(electrodomesticos, PAGE_SIZE);
  const calculosPagination = usePagination(calculos, PAGE_SIZE);

  const load = () => {
    setLoading(true);
    getClienteDetalle(id)
      .then(({ data: res }) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handlePDF = async (calculoId) => {
    setGenerating(calculoId);
    try {
      const { data: res } = await generarPDF(calculoId);
      const blob = await downloadReporte(res.data.id);
      const url = window.URL.createObjectURL(blob.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_cliente_${id}_${calculoId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      await alert({
        title: 'Error al generar PDF',
        message: e.response?.data?.message || 'No se pudo generar el reporte.',
        variant: 'error',
      });
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <div className="loading">Cargando ficha del cliente...</div>;
  if (!data) return <div className="empty-state"><p>No se encontró el cliente</p></div>;

  const { cliente, resumen } = data;
  const nombre = `${cliente.nombre} ${cliente.apellido || ''}`.trim();

  return (
    <div>
      <PageHeader
        title={nombre}
        
      />

      <Link to="/admin/clientes" className="btn btn-secondary btn-sm" style={{ marginBottom: '1.25rem' }}>
        <ArrowLeft size={14} /> Volver a clientes
      </Link>

      <div className="cards-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <Plug size={20} color="#1A4AB0" />
          <div className="stat-card-value">{resumen.totalEquipos}</div>
          <div className="stat-card-label">Equipos registrados</div>
        </div>
        <div className="stat-card">
          <History size={20} color="#8b5cf6" />
          <div className="stat-card-value">{resumen.totalCalculos}</div>
          <div className="stat-card-label">Cálculos guardados</div>
        </div>
        <div className="stat-card">
          <Key size={20} color="#10b981" />
          <div className="stat-card-value">{resumen.codigosActivos}</div>
          <div className="stat-card-label">Códigos activos</div>
        </div>
        <div className="stat-card">
          <Download size={20} color="#f59e0b" />
          <div className="stat-card-value">{resumen.totalReportes}</div>
          <div className="stat-card-label">PDF generados</div>
        </div>
      </div>

      <div className="admin-detail-grid">
        <div className="card">
          <div className="card-header"><h3>Datos del cliente</h3></div>
          <div className="card-body admin-detail-info">
            <p><strong>Documento:</strong> {cliente.documento || '-'}</p>
            <p><strong>Email:</strong> {cliente.email || '-'}</p>
            <p><strong>Teléfono:</strong> {cliente.telefono || '-'}</p>
            <p><strong>Distribuidora:</strong> {cliente.empresa_distribuidora || '-'}</p>
            <p><strong>Último cálculo:</strong> {resumen.ultimoCalculo ? formatDate(resumen.ultimoCalculo) : 'Sin cálculos'}</p>
            <Link to={`/admin/reportes?cliente_id=${cliente.id}`} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
              Ver todos sus reportes
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Códigos de acceso</h3></div>
          <div className="card-body">
            {cliente.codigos?.length ? (
              <ul className="admin-detail-list">
                {cliente.codigos.map((c) => (
                  <li key={c.id}>
                    <code>{c.codigo}</code>
                    <span className={`badge ${c.activo ? 'badge-success' : 'badge-danger'}`}>
                      {c.activo ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Sin códigos generados</p>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><h3>Equipos por módulo</h3></div>
        <div className="card-body admin-modulo-stats">
          <span><Plug size={14} /> Aparatos: {resumen.equiposPorModulo.aparato}</span>
          <span><Ghost size={14} /> Fantasma: {resumen.equiposPorModulo.fantasma}</span>
          <span><Lightbulb size={14} /> Iluminación: {resumen.equiposPorModulo.iluminacion}</span>
        </div>
        {electrodomesticos.length > 0 && (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Equipo</th><th>Módulo</th><th>Potencia</th><th>Horas/día</th>
                  </tr>
                </thead>
                <tbody>
                  {equiposPagination.paginatedItems.map((e) => (
                    <tr key={e.id}>
                      <td>{e.nombre}</td>
                      <td>{MODULO_LABEL[e.modulo] || e.modulo}</td>
                      <td>{e.potencia_w} W</td>
                      <td>{e.horas_uso_dia}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {equiposPagination.hasPagination && (
              <Pagination
                page={equiposPagination.page}
                totalPages={equiposPagination.totalPages}
                total={equiposPagination.total}
                pageSize={equiposPagination.pageSize}
                onPageChange={equiposPagination.setPage}
                label="equipos"
              />
            )}
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><h3>Historial de cálculos</h3></div>
        {calculos.length === 0 ? (
          <div className="empty-state"><p>El cliente aún no ha ejecutado cálculos</p></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Fecha</th><th>Cons. mes</th><th>Total factura</th><th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {calculosPagination.paginatedItems.map((c) => (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td>{formatDate(c.created_at)}</td>
                      <td>{formatNumber(c.consumo_mes_total)} kWh</td>
                      <td>{formatCurrency(getFacturaTotal(c))}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handlePDF(c.id)}
                          disabled={generating === c.id}
                        >
                          <Download size={14} />
                          {generating === c.id ? 'Generando...' : 'PDF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {calculosPagination.hasPagination && (
              <Pagination
                page={calculosPagination.page}
                totalPages={calculosPagination.totalPages}
                total={calculosPagination.total}
                pageSize={calculosPagination.pageSize}
                onPageChange={calculosPagination.setPage}
                label="cálculos"
              />
            )}
          </>
        )}
      </div>

      {accesos.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Últimos accesos</h3></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Fecha</th><th>IP</th></tr>
              </thead>
              <tbody>
                {accesos.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDate(a.created_at)}</td>
                    <td>{a.ip || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
