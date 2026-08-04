import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Lightbulb, Power } from 'lucide-react';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import PaginatedResponsiveList from '../../components/PaginatedResponsiveList';
import { ListCard } from '../../components/ResponsiveList';
import {
  getRecomendaciones,
  createRecomendacion,
  updateRecomendacion,
  deleteRecomendacion,
  toggleRecomendacion,
} from '../../services/api';
import { CATEGORIAS_APARATO } from '../../utils/helpers';
import { useConfirm, useAlert } from '../../contexts/ConfirmContext';

const emptyForm = {
  nombre: '',
  texto: '',
  aliases: '',
  categoria: 'Cocina',
  modulo: 'aparato',
  potencia_w: '',
  horas_uso_dia: '',
  orden: 0,
  activo: true,
};

const toForm = (item) => ({
  nombre: item.nombre || '',
  texto: item.texto || '',
  aliases: Array.isArray(item.aliases) ? item.aliases.join(', ') : '',
  categoria: item.categoria || 'Otros',
  modulo: item.modulo || 'aparato',
  potencia_w: item.potencia_w ?? '',
  horas_uso_dia: item.horas_uso_dia ?? '',
  orden: item.orden ?? 0,
  activo: item.activo !== false,
});

const toPayload = (form) => ({
  nombre: form.nombre.trim(),
  texto: form.texto.trim(),
  aliases: form.aliases
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean),
  categoria: form.categoria,
  modulo: form.modulo,
  potencia_w: form.potencia_w === '' ? null : Number(form.potencia_w),
  horas_uso_dia: form.horas_uso_dia === '' ? null : Number(form.horas_uso_dia),
  orden: Number(form.orden) || 0,
  activo: form.activo,
});

export default function RecomendacionesPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getRecomendaciones();
      setItems(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setForm(toForm(item));
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = toPayload(form);
      if (editId) await updateRecomendacion(editId, payload);
      else await createRecomendacion(payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar recomendación',
      message: '¿Desea eliminar esta recomendación del catálogo?',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteRecomendacion(id);
      load();
    } catch (err) {
      await alert({
        title: 'Error',
        message: err.response?.data?.message || 'No se pudo eliminar.',
        variant: 'error',
      });
    }
  };

  const handleToggle = async (item) => {
    try {
      await toggleRecomendacion(item.id);
      load();
    } catch (err) {
      await alert({
        title: 'Error',
        message: err.response?.data?.message || 'No se pudo cambiar el estado.',
        variant: 'error',
      });
    }
  };

  const renderActions = (item) => (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>
        <Edit size={14} /> Editar
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleToggle(item)}>
        <Power size={14} /> {item.activo ? 'Desactivar' : 'Activar'}
      </button>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
        <Trash2 size={14} /> Eliminar
      </button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Recomendaciones"
        subtitle="Catálogo de equipos y consejos de ahorro energético para los clientes"
        action={{ label: 'Nueva recomendación', icon: Plus, onClick: openCreate }}
      />

      <div className="card card-list">
        <PaginatedResponsiveList
          loading={loading}
          empty={!loading && items.length === 0}
          emptyMessage="No hay recomendaciones registradas"
          emptyIcon={Lightbulb}
          items={items}
          label="recomendaciones"
          pageSize={8}
          tableHead={(
            <tr>
              <th>Equipo</th>
              <th>Categoría</th>
              <th>Potencia</th>
              <th>Horas/día</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          )}
          renderTableRow={(item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.nombre}</strong>
                <br />
                <small style={{ color: 'var(--text-muted)' }}>
                  {item.texto.substring(0, 80)}{item.texto.length > 80 ? '…' : ''}
                </small>
              </td>
              <td><span className="badge badge-info">{item.categoria}</span></td>
              <td>{item.potencia_w != null ? `${item.potencia_w} W` : '-'}</td>
              <td>{item.horas_uso_dia != null ? `${item.horas_uso_dia}h` : '-'}</td>
              <td>
                <span className={`badge ${item.activo ? 'badge-success' : 'badge-warning'}`}>
                  {item.activo ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td className="actions">{renderActions(item)}</td>
            </tr>
          )}
          renderCard={(item) => (
            <ListCard
              key={item.id}
              title={item.nombre}
              subtitle={item.categoria}
              badge={(
                <span className={`badge ${item.activo ? 'badge-success' : 'badge-warning'}`}>
                  {item.activo ? 'Activa' : 'Inactiva'}
                </span>
              )}
              fields={[
                { label: 'Potencia sugerida', value: item.potencia_w != null ? `${item.potencia_w} W` : '-' },
                { label: 'Horas/día sugeridas', value: item.horas_uso_dia != null ? `${item.horas_uso_dia}h` : '-' },
                { label: 'Consejo', value: item.texto },
              ]}
              actions={renderActions(item)}
            />
          )}
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar recomendación' : 'Nueva recomendación'}
        size="lg"
        footer={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" form="recomendacion-form" className="btn btn-primary">
              Guardar
            </button>
          </>
        )}
      >
        <form id="recomendacion-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Nombre del equipo *</label>
            <input
              className="form-control"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Lavadora"
              required
            />
          </div>

          <div className="form-group">
            <label>Consejo de ahorro *</label>
            <textarea
              className="form-control"
              rows={4}
              value={form.texto}
              onChange={(e) => setForm({ ...form, texto: e.target.value })}
              placeholder="Texto que aparecerá en el reporte PDF..."
              required
            />
          </div>

          <div className="form-group">
            <label>Nombres alternativos (separados por coma)</label>
            <input
              className="form-control"
              value={form.aliases}
              onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              placeholder="refri, nevera, refrigerador"
            />
            <small className="form-hint">Ayuda a detectar el equipo aunque el cliente use otro nombre.</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Categoría</label>
              <select
                className="form-control"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                {CATEGORIAS_APARATO.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Módulo</label>
              <select
                className="form-control"
                value={form.modulo}
                onChange={(e) => setForm({ ...form, modulo: e.target.value })}
              >
                <option value="aparato">Electrodomésticos</option>
                <option value="fantasma">Consumo fantasma</option>
                <option value="iluminacion">Iluminación</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Potencia sugerida (W)</label>
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={form.potencia_w}
                onChange={(e) => setForm({ ...form, potencia_w: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Horas uso/día sugeridas</label>
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                value={form.horas_uso_dia}
                onChange={(e) => setForm({ ...form, horas_uso_dia: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Orden</label>
              <input
                className="form-control"
                type="number"
                min="0"
                value={form.orden}
                onChange={(e) => setForm({ ...form, orden: e.target.value })}
              />
            </div>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Visible para clientes y reportes
          </label>
        </form>
      </Modal>
    </div>
  );
}
