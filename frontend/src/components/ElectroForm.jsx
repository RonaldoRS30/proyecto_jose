import { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import { useMarcaModeloCatalog } from '../hooks/useMarcaModeloCatalog';
import {
  detectTipoEficiencia,
  calcPotenciaFromEficiencia,
  HORAS_REFRIGERADOR_DIA,
  emptyEficienciaFields,
} from '../utils/eficienciaEnergetica';
import { formatNumber } from '../utils/helpers';

export default function ElectroForm({
  isOpen, onClose, onSubmit, form, setForm, editId,
  categorias, modulo, tiposPreset = [], catalogLabel = 'Plantilla rápida',
  allowEficienciaEnergetica = false,
}) {
  const [presetKey, setPresetKey] = useState('');
  const [selectedConsejo, setSelectedConsejo] = useState('');
  const [isManual, setIsManual] = useState(false);
  const { marcas, modelos } = useMarcaModeloCatalog(isOpen);

  const tipoEficiencia = allowEficienciaEnergetica ? detectTipoEficiencia(form.nombre) : null;
  const eficienciaActiva = Boolean(form.eficiencia_energetica && tipoEficiencia);

  const potenciaCalculada = useMemo(() => {
    if (!eficienciaActiva || !tipoEficiencia) return null;
    return calcPotenciaFromEficiencia(tipoEficiencia, form);
  }, [eficienciaActiva, tipoEficiencia, form.kwh_por_ciclo, form.horas_por_ciclo, form.kwh_anual]);

  useEffect(() => {
    if (isOpen) {
      setPresetKey('');
      setSelectedConsejo('');
      setIsManual(!!editId);
    }
  }, [isOpen, editId]);

  useEffect(() => {
    if (!allowEficienciaEnergetica || !eficienciaActiva || tipoEficiencia !== 'refrigerador') return;
    if (String(form.horas_uso_dia) === String(HORAS_REFRIGERADOR_DIA)) return;
    setForm((prev) => ({ ...prev, horas_uso_dia: HORAS_REFRIGERADOR_DIA }));
  }, [allowEficienciaEnergetica, eficienciaActiva, tipoEficiencia, form.horas_uso_dia, setForm]);

  useEffect(() => {
    if (!eficienciaActiva || potenciaCalculada == null) return;
    setForm((prev) => {
      if (String(prev.potencia_w) === String(potenciaCalculada) && prev.tipo_eficiencia === tipoEficiencia) {
        return prev;
      }
      return {
        ...prev,
        potencia_w: String(potenciaCalculada),
        tipo_eficiencia: tipoEficiencia,
      };
    });
  }, [eficienciaActiva, potenciaCalculada, tipoEficiencia, setForm]);

  const applyPreset = (preset) => {
    if (!preset) return;
    setForm({
      ...form,
      ...emptyEficienciaFields,
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

  const toggleEficiencia = (checked) => {
    if (!checked) {
      setForm({
        ...form,
        ...emptyEficienciaFields,
        potencia_w: '',
      });
      return;
    }
    setForm({
      ...form,
      eficiencia_energetica: true,
      tipo_eficiencia: tipoEficiencia,
      kwh_por_ciclo: form.kwh_por_ciclo || '',
      horas_por_ciclo: form.horas_por_ciclo || '',
      kwh_anual: form.kwh_anual || '',
    });
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
        {!eficienciaActiva && (
          <div className="form-group">
            <label>Potencia (Watts) *</label>
            <input className="form-control" type="number" min="0" step="0.01" value={form.potencia_w} onChange={(e) => setForm({ ...form, potencia_w: e.target.value })} required />
          </div>
        )}
      </div>

      {allowEficienciaEnergetica && tipoEficiencia && (
        <div className="form-group eficiencia-block">
          <label className="checkbox-label eficiencia-checkbox">
            <input
              type="checkbox"
              checked={Boolean(form.eficiencia_energetica)}
              onChange={(e) => toggleEficiencia(e.target.checked)}
            />
            <span>Usar etiqueta de eficiencia energética (datos del fabricante)</span>
          </label>

          {eficienciaActiva && tipoEficiencia === 'lavadora' && (
            <div className="form-row" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label>Consumo por ciclo (kWh/ciclo) *</label>
                <input
                  className="form-control"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.kwh_por_ciclo ?? ''}
                  onChange={(e) => setForm({ ...form, kwh_por_ciclo: e.target.value })}
                  placeholder="Ej. 1.6"
                />
              </div>
              <div className="form-group">
                <label>Duración del ciclo (horas/ciclo) *</label>
                <input
                  className="form-control"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.horas_por_ciclo ?? ''}
                  onChange={(e) => setForm({ ...form, horas_por_ciclo: e.target.value })}
                  placeholder="Ej. 1.5"
                />
              </div>
            </div>
          )}

          {eficienciaActiva && tipoEficiencia === 'refrigerador' && (
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label>Consumo anual (kWh/año) *</label>
              <input
                className="form-control"
                type="number"
                min="1"
                step="1"
                value={form.kwh_anual ?? ''}
                onChange={(e) => setForm({ ...form, kwh_anual: e.target.value })}
                placeholder="Ej. 333"
              />
            </div>
          )}

          {eficienciaActiva && potenciaCalculada != null && (
            <div className="eficiencia-preview">
              <strong>Potencia calculada:</strong> {formatNumber(potenciaCalculada, 4)} W
            </div>
          )}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Cantidad *</label>
          <input className="form-control" type="number" min="0" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Horas de uso por día *</label>
          <input
            className="form-control"
            type="number"
            min="0.01"
            step="0.5"
            value={form.horas_uso_dia}
            onChange={(e) => setForm({ ...form, horas_uso_dia: e.target.value })}
            required
            readOnly={eficienciaActiva && tipoEficiencia === 'refrigerador'}
            title={eficienciaActiva && tipoEficiencia === 'refrigerador' ? 'Refrigerador: 24 h (siempre encendido)' : undefined}
          />
          {eficienciaActiva && tipoEficiencia === 'refrigerador' && (
            <small className="form-hint">Refrigerador: 24 h/día según el Excel.</small>
          )}
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
