import { useState, useEffect } from 'react';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';

export default function ElectroForm({
  isOpen, onClose, onSubmit, form, setForm, editId,
  categorias, modulo, tiposPreset = [], catalogLabel = 'Plantilla rápida',
}) {
  const [presetKey, setPresetKey] = useState('');
  const [selectedConsejo, setSelectedConsejo] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPresetKey('');
      setSelectedConsejo('');
    }
  }, [isOpen, editId]);

  const applyPreset = (preset) => {
    if (!preset) return;
    setForm({
      ...form,
      nombre: preset.nombre,
      potencia_w: preset.potencia,
      horas_uso_dia: preset.horas ?? form.horas_uso_dia ?? 24,
      categoria: preset.categoria || form.categoria,
      recomendacion_id: preset.recomendacion_id || preset.id || null,
    });
    setPresetKey(preset.nombre);
    setSelectedConsejo(preset.texto || '');
  };

  const presetOptions = tiposPreset.map((t) => ({
    ...t,
    label: `${t.nombre} (${t.potencia}W)`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editId ? 'Editar Equipo' : 'Nuevo Equipo'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={onSubmit}>Guardar</button>
        </>
      }
    >
      {tiposPreset.length > 0 && (
        <div className="form-group">
          <label>{catalogLabel}</label>
          <SearchableSelect
            options={presetOptions}
            value={presetKey}
            placeholder="Escriba para buscar: lavadora, tv, refrigeradora..."
            onChange={(_, opt) => applyPreset(opt)}
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => opt.nombre}
            renderOption={(opt) => (
              <span className="searchable-option-content">
                <span className="searchable-option-name">{opt.nombre}</span>
                <span className="searchable-option-meta">{opt.potencia}W · {opt.horas ?? 24}h/día</span>
              </span>
            )}
          />
          <small className="form-hint">Seleccione un equipo del catálogo para completar potencia y horas sugeridas.</small>
          {selectedConsejo && (
            <div className="recomendacion-preview">
              <strong>Consejo de ahorro:</strong> {selectedConsejo}
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label>Nombre *</label>
        <input className="form-control" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Categoría</label>
          <SearchableSelect
            options={categorias.map((c) => ({ value: c, label: c }))}
            value={form.categoria}
            placeholder="Buscar categoría..."
            onChange={(val) => setForm({ ...form, categoria: val })}
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => opt.value}
            clearable={false}
          />
        </div>
        <div className="form-group">
          <label>Marca</label>
          <input className="form-control" value={form.marca || ''} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Modelo</label>
          <input className="form-control" value={form.modelo || ''} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Potencia (Watts) *</label>
          <input className="form-control" type="number" min="0" step="0.01" value={form.potencia_w} onChange={(e) => setForm({ ...form, potencia_w: e.target.value })} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Cantidad *</label>
          <input className="form-control" type="number" min="0" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Horas de uso por día *</label>
          <input className="form-control" type="number" min="0" step="0.5" value={form.horas_uso_dia} onChange={(e) => setForm({ ...form, horas_uso_dia: e.target.value })} required />
        </div>
      </div>

      <div className="form-group">
        <label>Días de uso por mes</label>
        <input className="form-control" type="number" min="1" max="31" value={form.dias_uso_mes || 30} onChange={(e) => setForm({ ...form, dias_uso_mes: e.target.value })} />
        <small style={{ color: 'var(--text-muted)' }}>Nota: El cálculo mensual usa 30 días según fórmula Excel (G = F × 30)</small>
      </div>

      <div className="form-group">
        <label>Observaciones</label>
        <textarea className="form-control" rows={2} value={form.observaciones || ''} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
      </div>

      <input type="hidden" value={modulo} />
    </Modal>
  );
}
