import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Users, Eye, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import ServerPaginatedResponsiveList from '../../components/ServerPaginatedResponsiveList';
import { ListCard } from '../../components/ResponsiveList';
import {
  getClientes, createCliente, updateCliente, deleteCliente, generarCodigo, getClientesExportResumen,
} from '../../services/api';
import { exportToCsv, formatCsvDate } from '../../utils/exportCsv';
import { useConfirm, useAlert } from '../../contexts/ConfirmContext';

const PAGE_SIZE = 8;

const emptyForm = {
  nombre: '', apellido: '', documento: '', email: '', telefono: '',
  direccion: '', empresa_distribuidora: 'Luz del Sur', tarifa: 'BT5B residencial',
  potencia_contratada: '10 KW', medidor: '3φ - 3 hilos', notas: '',
};

export default function ClientesPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const [clientes, setClientes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [search, filtroActivo]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { search, page, limit: PAGE_SIZE };
      if (filtroActivo !== '') params.acceso = filtroActivo;
      const { data } = await getClientes(params);
      setClientes(data.data);
      setTotal(data.total ?? data.data.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search, filtroActivo]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); setError(''); };
  const openEdit = (c) => {
    setEditId(c.id);
    setForm({ ...c });
    setModalOpen(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateCliente(editId, form);
      } else {
        const { data } = await createCliente(form);
        await generarCodigo({ cliente_id: data.data.id });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar cliente',
      message: '¿Desea eliminar este cliente del sistema?',
      detail: 'Se eliminarán sus datos, códigos de acceso y registros asociados. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar cliente',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteCliente(id);
    if (clientes.length === 1 && page > 1) setPage(page - 1);
    else load();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await getClientesExportResumen();
      const rows = data.data.map((c) => [
        c.codigo_interno,
        c.nombre,
        c.apellido,
        c.documento,
        c.email,
        c.telefono,
        c.direccion,
        c.empresa_distribuidora,
        c.tarifa,
        c.potencia_contratada,
        c.medidor,
        c.acceso,
        c.codigos_activos,
        c.total_equipos,
        c.total_calculos,
        formatCsvDate(c.ultimo_calculo),
        c.consumo_dia_kwh ?? '',
        c.consumo_mes_kwh ?? '',
        c.consumo_anio_kwh ?? '',
        c.gasto_mes ?? '',
        c.factura_estimada ?? '',
        c.alerta_consumo,
      ]);
      exportToCsv(
        `clientes_${new Date().toISOString().slice(0, 10)}`,
        [
          'Código', 'Nombre', 'Apellido', 'Documento', 'Email', 'Teléfono',
          'Dirección', 'Distribuidora', 'Tarifa', 'Potencia', 'Medidor',
          'Acceso', 'Códigos activos', 'Equipos activos', 'Total cálculos', 'Último cálculo',
          'Consumo día (kWh)', 'Consumo mes (kWh)', 'Consumo año (kWh)',
          'Gasto mes (S/)', 'Factura estimada (S/)', 'Alerta consumo alto',
        ],
        rows,
      );
    } catch (e) {
      await alert({
        title: 'Error al exportar',
        message: e.response?.data?.message || 'No se pudo generar el archivo Excel.',
        variant: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const hasAccesoHabilitado = (c) => c.codigos?.some((codigo) => codigo.activo);

  const renderEstadoAcceso = (c) => (
    <span className={`badge ${hasAccesoHabilitado(c) ? 'badge-success' : 'badge-danger'}`}>
      {hasAccesoHabilitado(c) ? 'Habilitado' : 'Deshabilitado'}
    </span>
  );

  const renderActions = (c) => (
    <>
      <Link to={`/admin/clientes/${c.id}`} className="btn btn-primary btn-sm">
        <Eye size={14} /> Ver
      </Link>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>
        <Edit size={14} /> Editar
      </button>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
        <Trash2 size={14} /> Eliminar
      </button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Gestión de Clientes"
        subtitle="Registrar y editar clientes. El acceso se habilita o deshabilita desde Códigos."
        action={{ label: 'Nuevo Cliente', icon: Plus, onClick: openCreate }}
      />

      <div className="search-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-input-icon" />
          <input
            className="form-control search-input"
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-control search-filter" value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Con acceso habilitado</option>
          <option value="false">Sin acceso habilitado</option>
        </select>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download size={16} />
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      <div className="card">
        <div className="card-header view-desktop">
          <h3>{total} cliente{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</h3>
        </div>
        <ServerPaginatedResponsiveList
          loading={loading}
          empty={!loading && total === 0}
          emptyMessage="No hay clientes registrados"
          emptyIcon={Users}
          items={clientes}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="clientes"
          tableHead={
            <tr>
              <th>Código</th><th>Nombre</th><th>Documento</th><th>Email</th><th>Acceso</th><th>Acciones</th>
            </tr>
          }
          renderTableRow={(c) => (
            <tr key={c.id}>
              <td><code>{c.codigo_interno}</code></td>
              <td>{c.nombre} {c.apellido}</td>
              <td>{c.documento || '-'}</td>
              <td>{c.email || '-'}</td>
              <td>{renderEstadoAcceso(c)}</td>
              <td className="actions">{renderActions(c)}</td>
            </tr>
          )}
          renderCard={(c) => (
            <ListCard
              title={`${c.nombre} ${c.apellido || ''}`.trim()}
              subtitle={c.email || c.telefono || 'Sin contacto'}
              badge={renderEstadoAcceso(c)}
              fields={[
                { label: 'Código', value: c.codigo_interno },
                { label: 'Documento', value: c.documento || '-' },
                { label: 'Teléfono', value: c.telefono || '-' },
                { label: 'Distribuidora', value: c.empresa_distribuidora || '-' },
              ]}
              actions={renderActions(c)}
            />
          )}
        />
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar Cliente' : 'Nuevo Cliente'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>Guardar</button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre *</label>
              <input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input className="form-control" value={form.apellido || ''} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Documento</label>
              <input className="form-control" value={form.documento || ''} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-control" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Teléfono</label>
              <input className="form-control" value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Empresa Distribuidora</label>
              <input className="form-control" value={form.empresa_distribuidora || ''} onChange={(e) => setForm({ ...form, empresa_distribuidora: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input className="form-control" value={form.direccion || ''} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
