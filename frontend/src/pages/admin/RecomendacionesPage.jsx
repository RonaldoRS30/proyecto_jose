import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Lightbulb, Power, Search } from 'lucide-react';
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
import { PLANTILLA_OPTIONS, PLANTILLAS_EFICIENCIA } from '../../utils/plantillasEficiencia';
import {
  esRecomendacionRegistradaPorCliente,
  labelModuloRecomendacion,
} from '../../utils/recomendacionesAdmin';

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
  eficiencia_habilitada: false,
  plantilla_eficiencia: '',
  eficiencia_minutos_como_horas: false,
  eficiencia_label_kwh: '',
  eficiencia_label_minutos: '',
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
  eficiencia_habilitada: Boolean(item.eficiencia_habilitada),
  plantilla_eficiencia: item.plantilla_eficiencia || '',
  eficiencia_minutos_como_horas: Boolean(item.eficiencia_config?.minutos_como_horas_uso),
  eficiencia_label_kwh: item.eficiencia_config?.labels?.kwh_por_ciclo || '',
  eficiencia_label_minutos: item.eficiencia_config?.labels?.minutos_por_ciclo || '',
});

const toPayload = (form) => {
  const eficienciaConfig = {};
  if (form.eficiencia_minutos_como_horas) {
    eficienciaConfig.minutos_como_horas_uso = true;
  }
  const labels = {};
  if (form.eficiencia_label_kwh.trim()) labels.kwh_por_ciclo = form.eficiencia_label_kwh.trim();
  if (form.eficiencia_label_minutos.trim()) labels.minutos_por_ciclo = form.eficiencia_label_minutos.trim();
  if (Object.keys(labels).length) eficienciaConfig.labels = labels;

  return {
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
    eficiencia_habilitada: Boolean(form.eficiencia_habilitada),
    plantilla_eficiencia: form.eficiencia_habilitada && form.plantilla_eficiencia
      ? form.plantilla_eficiencia
      : null,
    eficiencia_config: form.eficiencia_habilitada && Object.keys(eficienciaConfig).length
      ? eficienciaConfig
      : null,
  };
};

export default function RecomendacionesPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const aliases = Array.isArray(item.aliases) ? item.aliases.join(' ') : '';
      const haystack = [
        item.nombre,
        item.categoria,
        item.texto,
        item.modulo,
        aliases,
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

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
    if (form.eficiencia_habilitada && !form.plantilla_eficiencia) {
      setError('Seleccione una plantilla de eficiencia energética.');
      return;
    }
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

      <div className="search-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-input-icon" aria-hidden />
          <input
            className="form-control search-input"
            type="search"
            placeholder="Buscar equipos por nombre, categoría o consejo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar recomendaciones"
          />
        </div>
        {search.trim() && (
          <span className="search-results-hint">
            {filteredItems.length} de {items.length} encontradas
          </span>
        )}
      </div>

      <div className="card card-list admin-table-card">
        <PaginatedResponsiveList
          key={search.trim().toLowerCase()}
          loading={loading}
          empty={!loading && filteredItems.length === 0}
          emptyMessage={
            search.trim()
              ? 'No se encontraron equipos con ese criterio'
              : 'No hay recomendaciones registradas'
          }
          emptyIcon={Lightbulb}
          items={filteredItems}
          label="recomendaciones"
          pageSize={8}
          tableHead={(
            <tr>
              <th>Equipo</th>
              <th>Categoría</th>
              <th>Potencia normal máx.</th>
              <th>Horas/día</th>
              <th>Eficiencia EE</th>
              <th className="cell-status">Estado</th>
              <th className="cell-actions">Acciones</th>
            </tr>
          )}
          renderTableRow={(item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.nombre}</strong>
                {esRecomendacionRegistradaPorCliente(item) && (
                  <>
                    <br />
                    <span className="badge badge-warning" style={{ marginTop: '0.25rem' }}>
                      Registrado por cliente
                    </span>
                  </>
                )}
                <br />
                <small style={{ color: 'var(--text-muted)' }}>
                  {labelModuloRecomendacion(item.modulo)}
                  {' · '}
                  {item.texto.substring(0, 80)}{item.texto.length > 80 ? '…' : ''}
                </small>
              </td>
              <td><span className="badge badge-info">{item.categoria}</span></td>
              <td>{item.potencia_w != null ? `${item.potencia_w} W` : '-'}</td>
              <td>{item.horas_uso_dia != null ? `${item.horas_uso_dia}h` : '-'}</td>
              <td>
                {item.eficiencia_habilitada && item.plantilla_eficiencia ? (
                  <span className="badge badge-info" title={PLANTILLAS_EFICIENCIA[item.plantilla_eficiencia]?.label}>
                    EE
                  </span>
                ) : '-'}
              </td>
              <td className="cell-status">
                <span className="table-status">
                  <span className={`badge ${item.activo ? 'badge-success' : 'badge-warning'}`}>
                    {item.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </span>
              </td>
              <td className="cell-actions">
                <div className="actions">{renderActions(item)}</div>
              </td>
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
                { label: 'Potencia normal máx.', value: item.potencia_w != null ? `${item.potencia_w} W` : '-' },
                { label: 'Horas/día sugeridas', value: item.horas_uso_dia != null ? `${item.horas_uso_dia}h` : '-' },
                {
                  label: 'Eficiencia EE',
                  value: item.eficiencia_habilitada && item.plantilla_eficiencia
                    ? PLANTILLAS_EFICIENCIA[item.plantilla_eficiencia]?.label || item.plantilla_eficiencia
                    : 'No habilitada',
                },
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
              <label>Potencia normal máx. (W)</label>
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                placeholder="Límite de consumo normal para alertas en PDF"
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

          <div className="form-group eficiencia-block" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Eficiencia energética</h4>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.eficiencia_habilitada}
                onChange={(e) => setForm({
                  ...form,
                  eficiencia_habilitada: e.target.checked,
                  plantilla_eficiencia: e.target.checked ? form.plantilla_eficiencia : '',
                })}
              />
              Habilitar formulario de eficiencia energética para clientes
            </label>

            {form.eficiencia_habilitada && (
              <>
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Plantilla de cálculo *</label>
                  <select
                    className="form-control"
                    value={form.plantilla_eficiencia}
                    onChange={(e) => setForm({ ...form, plantilla_eficiencia: e.target.value })}
                    required
                  >
                    <option value="">Seleccione plantilla...</option>
                    {PLANTILLA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {form.plantilla_eficiencia && PLANTILLAS_EFICIENCIA[form.plantilla_eficiencia] && (
                    <small className="form-hint">
                      {PLANTILLAS_EFICIENCIA[form.plantilla_eficiencia].description}
                    </small>
                  )}
                </div>

                {(form.plantilla_eficiencia === 'energia_tiempo_potencia'
                  || form.plantilla_eficiencia === 'potencia_tiempo_energia') && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Etiqueta energía (opcional)</label>
                      <input
                        className="form-control"
                        value={form.eficiencia_label_kwh}
                        onChange={(e) => setForm({ ...form, eficiencia_label_kwh: e.target.value })}
                        placeholder="Ej. kWh por ciclo"
                      />
                    </div>
                    <div className="form-group">
                      <label>Etiqueta minutos (opcional)</label>
                      <input
                        className="form-control"
                        value={form.eficiencia_label_minutos}
                        onChange={(e) => setForm({ ...form, eficiencia_label_minutos: e.target.value })}
                        placeholder="Ej. Minutos por ducha"
                      />
                    </div>
                  </div>
                )}

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.eficiencia_minutos_como_horas}
                    onChange={(e) => setForm({ ...form, eficiencia_minutos_como_horas: e.target.checked })}
                  />
                  Usar minutos ingresados como horas de uso diario (útil para ducha eléctrica)
                </label>
              </>
            )}
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
