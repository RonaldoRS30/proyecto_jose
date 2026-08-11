import { useState, useEffect } from 'react';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import { useMarcaModeloCatalog } from '../hooks/useMarcaModeloCatalog';

export default function ElectroForm({
  isOpen, onClose, onSubmit, form, setForm, editId,
  categorias, modulo, tiposPreset = [], catalogLabel = 'Plantilla rápida',
}) {
  const [presetKey, setPresetKey] = useState('');
  const [selectedConsejo, setSelectedConsejo] = useState('');
  const [isManual, setIsManual] = useState(false);
  const { marcas, modelos } = useMarcaModeloCatalog(isOpen);

  useEffect(() => {
    if (isOpen) {
      setPresetKey('');
      setSelectedConsejo('');
      setIsManual(!!editId);
    }
  }, [isOpen, editId]);

  const applyPreset = (preset) => {
    if (!preset) return;
    setForm({
      ...form,
      nombre: preset.nombre,
      potencia_w: preset.potencia,
      horas_uso_dia: '',
      categoria: preset.categoria || form.categoria,
      recomendacion_id: preset.source === 'saved' ? preset.recomendacion_id : (preset.recomendacion_id || preset.id || null),
      marca: preset.marca ?? form.marca ?? '',
      modelo: preset.modelo ?? form.modelo ?? '',
      cantidad: preset.cantidad ?? form.cantidad ?? 1,
      dias_uso_mes: preset.dias_uso_mes ?? form.dias_uso_mes ?? 30,
      observaciones: preset.observaciones ?? form.observaciones ?? '',
    });
    setPresetKey(preset.nombre);
    setSelectedConsejo(preset.texto || '');
    setIsManual(true);
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
      <div style={{ minHeight: isManual ? 'auto' : '320px', display: 'flex', flexDirection: 'column' }}>
        {!editId && tiposPreset.length > 0 && (
        <div className="form-group">
          <label>{catalogLabel}</label>
          <SearchableSelect
            options={presetOptions}
            value={presetKey}
            placeholder="Escriba para buscar: lavadora, tv, refrigeradora..."
            onChange={(_, opt) => {
              if (!opt) { setPresetKey(''); setSelectedConsejo(''); return; }
              applyPreset(opt);
            }}
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => opt.nombre}
            onNotFound={(searchQuery) => {
              setIsManual(true);
              setForm({ ...form, nombre: searchQuery });
            }}
            renderOption={(opt) => (
              <span className="searchable-option-content">
                <span className="searchable-option-name">
                  {opt.nombre}
                  {opt.source === 'saved' && (
                    <small style={{ marginLeft: '0.35rem', opacity: 0.75 }}>(registrado)</small>
                  )}
                </span>
                <span className="searchable-option-meta">{opt.potencia}W · {opt.horas ?? 24}h/día</span>
              </span>
            )}
          />
          <small className="form-hint">Seleccione un equipo del catálogo para autocompletar nombre y potencia. Las horas de uso las registra usted.</small>
          {selectedConsejo && (
            <div className="recomendacion-preview" style={{ marginTop: '0.5rem' }}>
              <strong>Consejo de ahorro:</strong> {selectedConsejo}
            </div>
          )}
        </div>
      )}

      {isManual && (
        <>
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
          <SearchableSelect
            options={marcas.map((m) => ({ value: m, label: m }))}
            value={form.marca || ''}
            placeholder="Buscar marca..."
            onChange={(val) => setForm({ ...form, marca: val })}
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => opt.value}
            allowCustom
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Modelo</label>
          <SearchableSelect
            options={modelos.map((m) => ({ value: m, label: m }))}
            value={form.modelo || ''}
            placeholder="Buscar modelo..."
            onChange={(val) => setForm({ ...form, modelo: val })}
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => opt.value}
            allowCustom
          />
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
          <input className="form-control" type="number" min="0.01" step="0.5" value={form.horas_uso_dia} onChange={(e) => setForm({ ...form, horas_uso_dia: e.target.value })} required />
        </div>
      </div>

      <div className="form-group">
        <label>Días de uso por mes</label>
        <input className="form-control" type="number" min="1" max="31" value={form.dias_uso_mes || 30} onChange={(e) => setForm({ ...form, dias_uso_mes: e.target.value })} />
      </div>

      <div className="form-group">
        <label>Observaciones</label>
        <textarea className="form-control" rows={2} value={form.observaciones || ''} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
      </div>
      </>)}

        <input type="hidden" value={modulo} />
      </div>
    </Modal>
  );
}
