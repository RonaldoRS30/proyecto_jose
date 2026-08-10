import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Users, Eye, Download, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import ReciboTarifaUploader from '../../components/ReciboTarifaUploader';
import ServerPaginatedResponsiveList from '../../components/ServerPaginatedResponsiveList';
import { ListCard } from '../../components/ResponsiveList';
import {
  getClientes, createCliente, updateCliente, deleteCliente, generarCodigo, getClientesExportResumen,
} from '../../services/api';
import { exportToCsv, formatCsvDate } from '../../utils/exportCsv';
import { useConfirm, useAlert } from '../../contexts/ConfirmContext';
import { useUnsavedTarifaGuard } from '../../hooks/useUnsavedTarifaGuard';
import { tarifaValuesDiffer } from '../../utils/tarifaCompare';

const PAGE_SIZE = 10;

const rowNumber = (page, index) => (page - 1) * PAGE_SIZE + index + 1;

const emptyForm = {
  nombre: '', apellido: '', documento: '', email: '', telefono: '',
  direccion: '', empresa_distribuidora: 'Luz del Sur', tarifa: 'BT5B residencial',
  potencia_contratada: '10 KW', alumbrado_publico: '', medidor: '3φ - 3 hilos', notas: '',
  tipo_cliente: 'natural',
};

const inferTipoFromCliente = (c) => {
  if (c.tipo_cliente === 'empresa' || c.tipo_cliente === 'natural') return c.tipo_cliente;
  return c.apellido === '' || c.apellido == null ? 'empresa' : 'natural';
};

const buildClientePayload = (form, tipoCliente) => ({
  ...form,
  tipo_cliente: tipoCliente,
  apellido: tipoCliente === 'empresa' ? null : (form.apellido || '').trim(),
  documento: (form.documento || '').replace(/\D/g, ''),
  email: (form.email || '').trim() || null,
  direccion: (form.direccion || '').trim() || null,
});

const SearchableSelect = ({ value, onChange, options, placeholder, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  
  return (
    <div style={{ position: 'relative' }}>
      <input 
        className="form-control"
        type="text"
        placeholder={placeholder}
        value={isOpen ? search : (value || '')}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => { setIsOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        required={required}
      />
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e1e2d', border: '1px solid #2b2b40', borderRadius: '8px', zIndex: 100, maxHeight: '150px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          {filteredOptions.length > 0 ? filteredOptions.map(opt => (
            <div 
              key={opt}
              style={{ padding: '10px 12px', cursor: 'pointer', color: '#fff', borderBottom: '1px solid #2b2b40', transition: 'background 0.2s' }}
              onMouseDown={() => { onChange(opt); setIsOpen(false); }}
              onMouseEnter={(e) => e.target.style.background = '#2b2b40'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              {opt}
            </div>
          )) : (
             <div style={{ padding: '10px 12px', color: '#888' }}>Sin resultados</div>
          )}
        </div>
      )}
    </div>
  );
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
  const [tipoCliente, setTipoCliente] = useState('natural');
  const [extractingTarifa, setExtractingTarifa] = useState(false);
  const [tarifaGuardada, setTarifaGuardada] = useState('');
  const [tarifaDesdeRecibo, setTarifaDesdeRecibo] = useState(false);

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

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setTipoCliente('natural');
    setTarifaGuardada('');
    setTarifaDesdeRecibo(false);
    setModalOpen(true);
    setError('');
  };

  const openEdit = (c) => {
    const tipo = inferTipoFromCliente(c);
    setEditId(c.id);
    setForm({
      ...c,
      apellido: tipo === 'empresa' ? '' : (c.apellido || ''),
      tipo_cliente: tipo,
    });
    setTipoCliente(tipo);
    setTarifaGuardada(c.tarifa_kwh ?? '');
    setTarifaDesdeRecibo(false);
    setModalOpen(true);
    setError('');
  };

  const tarifaPendiente = modalOpen && tarifaValuesDiffer(tarifaGuardada, form.tarifa_kwh);
  const tarifaPendienteGuard = tarifaPendiente && !extractingTarifa;

  const confirmLeaveModal = useUnsavedTarifaGuard(tarifaPendienteGuard, {
    message: 'Detectó una tarifa desde el recibo pero aún no la ha guardado en el cliente.',
    detail: 'Pulse «Guardar» para registrar la tarifa antes de cerrar o cambiar de módulo.',
  });

  const closeModal = async () => {
    if (extractingTarifa) return;
    const canLeave = await confirmLeaveModal();
    if (canLeave) setModalOpen(false);
  };

  const handleTipoChange = (tipo) => {
    setTipoCliente(tipo);
    setForm((prev) => {
      const doc = (prev.documento || '').replace(/\D/g, '');
      const docLimpio = tipo === 'empresa' && doc.length === 8
        ? ''
        : tipo === 'natural' && doc.length === 11
          ? ''
          : doc;
      return {
        ...prev,
        tipo_cliente: tipo,
        apellido: tipo === 'empresa' ? '' : (prev.apellido || ''),
        documento: docLimpio,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (extractingTarifa) return;
    setError('');

    const payload = buildClientePayload(form, tipoCliente);

    if (tipoCliente === 'natural' && !payload.apellido) {
      setError('El apellido es obligatorio para persona natural.');
      return;
    }
    if (tipoCliente === 'empresa' && form.apellido?.trim()) {
      setError('Una empresa no puede tener apellido. Use solo razón social.');
      return;
    }
    if (tipoCliente === 'empresa' && payload.documento.length !== 11) {
      setError('El RUC debe tener exactamente 11 dígitos.');
      return;
    }
    if (tipoCliente === 'natural' && payload.documento.length !== 8) {
      setError('El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    if (form.tarifa_kwh === null || form.tarifa_kwh === undefined || form.tarifa_kwh === '') {
      setError('La tarifa eléctrica (S/ por kWh) es obligatoria.');
      return;
    }
    if (Number.isNaN(Number(form.tarifa_kwh)) || Number(form.tarifa_kwh) < 0) {
      setError('La tarifa eléctrica debe ser un número válido mayor o igual a 0.');
      return;
    }
    const emailTrim = (form.email || '').trim();
    if (emailTrim && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailTrim)) {
      setError('Si ingresa email, debe ser un correo válido (ej. usuario@gmail.com).');
      return;
    }

    try {
      if (editId) {
        await updateCliente(editId, payload);
      } else {
        const { data } = await createCliente(payload);
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
              <th>N°</th><th>Nombre</th><th>Documento</th><th>Email</th><th>Acceso</th><th>Acciones</th>
            </tr>
          }
          renderTableRow={(c, index) => (
            <tr key={c.id}>
              <td>{rowNumber(page, index)}</td>
              <td>{c.nombre}{c.apellido ? ` ${c.apellido}` : ''}</td>
              <td>
                <span className={`badge ${inferTipoFromCliente(c) === 'empresa' ? 'badge-info' : 'badge-secondary'}`} style={{ marginRight: '6px' }}>
                  {inferTipoFromCliente(c) === 'empresa' ? 'Empresa' : 'Persona'}
                </span>
                {c.documento || '-'}
              </td>
              <td>{c.email || '-'}</td>
              <td>{renderEstadoAcceso(c)}</td>
              <td className="actions">{renderActions(c)}</td>
            </tr>
          )}
          renderCard={(c, index) => (
            <ListCard
              title={`${c.nombre}${c.apellido ? ` ${c.apellido}` : ''}`.trim()}
              subtitle={c.email || c.telefono || 'Sin contacto'}
              badge={
                <span className={`badge ${inferTipoFromCliente(c) === 'empresa' ? 'badge-info' : 'badge-secondary'}`}>
                  {inferTipoFromCliente(c) === 'empresa' ? 'Empresa' : 'Persona natural'}
                </span>
              }
              fields={[
                { label: 'N°', value: rowNumber(page, index) },
                { label: 'Acceso', value: hasAccesoHabilitado(c) ? 'Habilitado' : 'Deshabilitado' },
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
        onClose={closeModal}
        title={editId ? 'Editar Cliente' : 'Nuevo Cliente'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={extractingTarifa}>
              Cancelar
            </button>
            <button
              type="submit"
              form="cliente-form"
              className="btn btn-primary"
              disabled={extractingTarifa}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {extractingTarifa ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Analizando recibo...
                </>
              ) : (
                'Guardar'
              )}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error">{error}</div>}
        <form id="cliente-form" onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Tipo de Cliente *</label>
            {editId ? (
              <div>
                <span className={`badge ${tipoCliente === 'empresa' ? 'badge-info' : 'badge-secondary'}`} style={{ fontSize: '0.9rem', padding: '8px 14px' }}>
                  {tipoCliente === 'empresa' ? 'Empresa' : 'Persona Natural'}
                </span>
                <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-muted)' }}>
                  El tipo de cliente no se puede modificar después del registro.
                </small>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '10px', background: 'rgba(255, 255, 255, 0.05)', padding: '5px', borderRadius: '8px', width: 'max-content' }}>
                  <button
                    type="button"
                    onClick={() => handleTipoChange('natural')}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: tipoCliente === 'natural' ? '#4f46e5' : 'transparent', color: tipoCliente === 'natural' ? '#fff' : '#aaa', cursor: 'pointer', transition: 'all 0.2s', fontWeight: tipoCliente === 'natural' ? '500' : 'normal' }}
                  >
                    Persona Natural
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipoChange('empresa')}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: tipoCliente === 'empresa' ? '#4f46e5' : 'transparent', color: tipoCliente === 'empresa' ? '#fff' : '#aaa', cursor: 'pointer', transition: 'all 0.2s', fontWeight: tipoCliente === 'empresa' ? '500' : 'normal' }}
                  >
                    Empresa
                  </button>
                </div>
                <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-muted)' }}>
                  {tipoCliente === 'natural'
                    ? 'Persona natural: nombre, apellido y DNI (8 dígitos).'
                    : 'Empresa: solo razón social y RUC (11 dígitos), sin apellido.'}
                </small>
              </>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{tipoCliente === 'empresa' ? 'Razón Social *' : 'Nombre *'}</label>
              <input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            {tipoCliente === 'natural' && (
              <div className="form-group">
                <label>Apellido *</label>
                <input className="form-control" value={form.apellido || ''} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
              </div>
            )}
          </div>
          <div className="form-row">
            <div className="form-group" style={tipoCliente === 'empresa' ? { gridColumn: '1 / -1' } : {}}>
              <label>{tipoCliente === 'empresa' ? 'RUC *' : 'Documento (DNI) *'}</label>
              <input 
                className="form-control" 
                value={form.documento || ''} 
                onChange={(e) => setForm({ ...form, documento: e.target.value.replace(/\D/g, '') })} 
                maxLength={tipoCliente === 'empresa' ? 11 : 8}
                minLength={tipoCliente === 'empresa' ? 11 : 8}
                pattern={tipoCliente === 'empresa' ? "\\d{11}" : "\\d{8}"}
                title={tipoCliente === 'empresa' ? 'El RUC debe tener exactamente 11 dígitos' : 'El DNI debe tener exactamente 8 dígitos'}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input 
                className="form-control" 
                type="email" 
                value={form.email || ''} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Teléfono *</label>
              <input 
                className="form-control" 
                value={form.telefono || ''} 
                onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '') })} 
                maxLength={9}
                minLength={7}
                pattern="\d{7,9}"
                title="El teléfono debe tener entre 7 y 9 dígitos"
                required
              />
            </div>
            <div className="form-group">
              <label>Empresa Distribuidora *</label>
              <SearchableSelect 
                value={form.empresa_distribuidora}
                onChange={(val) => setForm({ ...form, empresa_distribuidora: val })}
                options={[
                  'Luz del Sur', 'PLUZ PERU', 'ELECTROCENTRO', 
                  'HIDRANDINA', 'ENSA', 'ENOSA', 'ELECTRO DUNAS', 'SEAL', 
                  'ELECTROORIENTE', 'ELECTRO UCAYALI', 'ELECTRO SUR ESTE', 
                  'ELECTROSUR', 'ELECTRO PUNO'
                ]}
                placeholder="Buscar empresa..."
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <ReciboTarifaUploader
                key={editId ?? 'new'}
                onDatosDetected={(datos) => {
                  setForm((prev) => ({
                    ...prev,
                    ...(datos.tarifa_kwh != null ? { tarifa_kwh: datos.tarifa_kwh } : {}),
                    ...(datos.potencia_contratada ? { potencia_contratada: datos.potencia_contratada } : {}),
                    ...(datos.alumbrado_publico != null ? { alumbrado_publico: datos.alumbrado_publico } : {}),
                  }));
                  setTarifaDesdeRecibo(true);
                }}
                onExtractingChange={setExtractingTarifa}
              />
              {tarifaPendiente && (
                <div
                  role="alert"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#fbbf24',
                    fontSize: '0.75rem',
                    lineHeight: 1.5,
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>
                    {tarifaDesdeRecibo
                      ? 'Subió un recibo y la tarifa fue detectada, pero aún no la ha guardado. Pulse «Guardar» antes de cerrar o cambiar de módulo.'
                      : 'Tiene cambios en la tarifa sin guardar. Pulse «Guardar» antes de cerrar o cambiar de módulo.'}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tarifa Eléctrica (S/ por kWh) *</label>
              <input
                className="form-control"
                type="number"
                step="0.0001"
                min="0"
                value={form.tarifa_kwh ?? ''}
                onChange={(e) => setForm({
                  ...form,
                  tarifa_kwh: e.target.value === '' ? '' : parseFloat(e.target.value),
                })}
                placeholder="Ej. 0.613"
                required
                disabled={extractingTarifa}
              />
            </div>
            <div className="form-group">
              <label>Potencia contratada</label>
              <input
                className="form-control"
                value={form.potencia_contratada || ''}
                onChange={(e) => setForm({ ...form, potencia_contratada: e.target.value })}
                placeholder="Ej. 3.00 KW"
                disabled={extractingTarifa}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Alumbrado público (S/)</label>
              <input
                className="form-control"
                type="number"
                step="0.01"
                min="0"
                value={form.alumbrado_publico ?? ''}
                onChange={(e) => setForm({
                  ...form,
                  alumbrado_publico: e.target.value === '' ? '' : parseFloat(e.target.value),
                })}
                placeholder="Ej. 12.60"
                disabled={extractingTarifa}
              />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input
                className="form-control"
                value={form.direccion || ''}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
