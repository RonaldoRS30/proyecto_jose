import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Calculator, FileText, Zap, AlertTriangle } from 'lucide-react';
import StatCard from '../../components/StatCard';
import { getEstadisticas } from '../../services/api';
import { formatNumber, formatCurrency, formatDate } from '../../utils/helpers';
import { buildFacturaFromCalculo } from '../../utils/factura';

const getFacturaTotal = (c) => buildFacturaFromCalculo(c).totalMes;

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEstadisticas()
      .then(({ data }) => setStats(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando estadísticas...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Administrador</h1>
          <p className="page-subtitle">Resumen general del sistema</p>
        </div>
      </div>

      <div className="cards-grid">
        <StatCard icon={Users} label="Clientes Registrados" value={stats?.totalClientes ?? 0} color="#2563eb" />
        <StatCard icon={UserCheck} label="Clientes Activos" value={stats?.clientesActivos ?? 0} color="#10b981" />
        <StatCard icon={UserX} label="Clientes Inactivos" value={stats?.clientesInactivos ?? 0} color="#ef4444" />
        <StatCard icon={Calculator} label="Total Cálculos" value={stats?.totalCalculos ?? 0} color="#8b5cf6" />
        <StatCard icon={FileText} label="Reportes Generados" value={stats?.totalReportes ?? 0} color="#f59e0b" />
        <StatCard icon={Zap} label="Consumo Promedio (kWh/mes)" value={formatNumber(stats?.consumoPromedio ?? 0)} color="#06b6d4" />
      </div>

      {stats?.alertasConsumo?.length > 0 && (
        <div className="card admin-alert-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header admin-alert-header">
            <h3><AlertTriangle size={18} /> Alertas de consumo alto</h3>
            <span className="admin-alert-meta">
              Último cálculo &gt; {formatNumber(stats.umbralAlertaConsumo ?? 0)} kWh
              {stats.umbralAlertaPct != null && (
                <> ({stats.umbralAlertaPct}% sobre el promedio — configurable en Configuración)</>
              )}
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th><th>Consumo mes</th><th>vs promedio</th><th>Fecha</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.alertasConsumo.map((a) => (
                    <tr key={a.calculoId}>
                      <td>
                        <Link to={`/admin/clientes/${a.clienteId}`}>{a.clienteNombre}</Link>
                      </td>
                      <td><strong>{formatNumber(a.consumoMes)} kWh</strong></td>
                      <td>
                        <span className="badge badge-warning">+{a.porcentajeSobrePromedio}%</span>
                      </td>
                      <td>{formatDate(a.fecha)}</td>
                      <td>
                        <Link to={`/admin/reportes?cliente_id=${a.clienteId}`} className="btn btn-secondary btn-sm">
                          Ver reportes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="admin-detail-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header"><h3>Actividad reciente</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {stats?.actividadReciente?.length ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th><th>Fecha</th><th>Cons. mes</th><th>Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.actividadReciente.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.cliente ? (
                            <Link to={`/admin/clientes/${c.cliente.id}`}>
                              {c.cliente.nombre} {c.cliente.apellido || ''}
                            </Link>
                          ) : '-'}
                        </td>
                        <td>{formatDate(c.created_at)}</td>
                        <td>{formatNumber(c.consumo_mes_total)} kWh</td>
                        <td>{formatCurrency(getFacturaTotal(c))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ padding: '1.25rem', color: 'var(--text-muted)', margin: 0 }}>
                Aún no hay cálculos registrados por los clientes.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Acciones rápidas</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/admin/clientes" className="btn btn-primary">Gestionar Clientes</Link>
            <Link to="/admin/codigos" className="btn btn-secondary">Generar Códigos</Link>
            <Link to="/admin/reportes" className="btn btn-secondary">Ver Reportes PDF</Link>
            <Link to="/admin/configuracion" className="btn btn-secondary">Configurar Precio kWh</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
