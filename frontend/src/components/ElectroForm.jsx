import { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import { useMarcaModeloCatalog } from '../hooks/useMarcaModeloCatalog';
import {
  calcPotenciaFromEficiencia,
  calcEnergiaPreview,
  horasFromMinutos,
  emptyEficienciaFields,
  getPlantillaMeta,
  resolveEficienciaConfig,
} from '../utils/eficienciaEnergetica';
import { getFieldLabel, sanitizeMinutosInput } from '../utils/plantillasEficiencia';
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

  const catalogEntry = useMemo(() => {
    if (!allowEficienciaEnergetica) return null;
    return resolveEficienciaConfig(form, tiposPreset);
  }, [allowEficienciaEnergetica, form.nombre, form.recomendacion_id, tiposPreset]);

  const plantillaId = form.eficiencia_energetica
    ? (form.plantilla_eficiencia || catalogEntry?.plantilla_eficiencia || null)
    : null;

  const plantillaMeta = getPlantillaMeta(plantillaId);
  const eficienciaDisponible = allowEficienciaEnergetica && Boolean(catalogEntry);
  const eficienciaActiva = Boolean(form.eficiencia_energetica && plantillaId && plantillaMeta);
  const eficienciaConfig = catalogEntry?.eficiencia_config || {};
  const potenciaFromUser = Boolean(plantillaMeta?.potenciaFromUser);

  const potenciaCalculada = useMemo(() => {
    if (!eficienciaActiva || !plantillaId) return null;
    return calcPotenciaFromEficiencia(plantillaId, form);
  }, [eficienciaActiva, plantillaId, form.kwh_por_ciclo, form.minutos_por_ciclo, form.kwh_anual, form.btu_h, form.hp, form.potencia_w]);

  const energiaCalculada = useMemo(() => {
    if (!eficienciaActiva || !plantillaId) return null;
    return calcEnergiaPreview(plantillaId, form);
  }, [eficienciaActiva, plantillaId, form.potencia_w, form.minutos_por_ciclo]);

  const horasMinutosPreview = useMemo(() => {
    if (!form.minutos_por_ciclo) return null;
    return horasFromMinutos(form.minutos_por_ciclo);
  }, [form.minutos_por_ciclo]);

  useEffect(() => {
    if (isOpen) {
      setPresetKey('');
      setSelectedConsejo('');
      setIsManual(!!editId);
    }
  }, [isOpen, editId]);

  useEffect(() => {
    if (!eficienciaActiva || !plantillaMeta?.locksHorasUsoDia) return;
    const fijas = plantillaMeta.horasUsoDiaFijas ?? 24;
    if (String(form.horas_uso_dia) === String(fijas)) return;
    setForm((prev) => ({ ...prev, horas_uso_dia: fijas }));
  }, [eficienciaActiva, plantillaMeta, form.horas_uso_dia, setForm]);

  useEffect(() => {
    if (!eficienciaActiva || !eficienciaConfig.minutos_como_horas_uso || !form.minutos_por_ciclo) return;
    const horas = horasFromMinutos(form.minutos_por_ciclo);
    if (horas == null || String(form.horas_uso_dia) === String(horas)) return;
    setForm((prev) => ({ ...prev, horas_uso_dia: horas }));
  }, [eficienciaActiva, eficienciaConfig.minutos_como_horas_uso, form.minutos_por_ciclo, form.horas_uso_dia, setForm]);

  useEffect(() => {
    if (!eficienciaActiva || potenciaFromUser || potenciaCalculada == null) return;
    setForm((prev) => {
      if (String(prev.potencia_w) === String(potenciaCalculada) && prev.plantilla_eficiencia === plantillaId) {
        return prev;
      }
      return {
        ...prev,
        potencia_w: String(potenciaCalculada),
        plantilla_eficiencia: plantillaId,
      };
    });
  }, [eficienciaActiva, potenciaFromUser, potenciaCalculada, plantillaId, setForm]);

  const applyPreset = (preset) => {
    if (!preset) return;
    setForm({
      ...form,
      ...emptyEficienciaFields,
      nombre: preset.nombre,
      potencia_w: preset.potencia,
      horas_uso_dia: preset.horas != null ? String(preset.horas) : '',
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
      plantilla_eficiencia: catalogEntry?.plantilla_eficiencia || null,
      kwh_por_ciclo: form.kwh_por_ciclo || '',
      minutos_por_ciclo: form.minutos_por_ciclo || '',
      horas_por_ciclo: form.horas_por_ciclo || '',
      kwh_anual: form.kwh_anual || '',
      btu_h: form.btu_h || '',
      hp: form.hp || '',
    });
  };

  const renderEficienciaField = (field) => {
    const label = getFieldLabel(plantillaId, field, eficienciaConfig);
    const commonProps = {
      className: 'form-control',
      type: 'number',
      min: '0.01',
      step: field === 'kwh_anual' || field === 'btu_h' ? '1' : '0.01',
    };

    if (field === 'minutos_por_ciclo') {
      return (
        <div className="form-group" key={field}>
          <label>{label} *</label>
          <input
            className="form-control"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.minutos_por_ciclo ?? ''}
            onChange={(e) => setForm({
              ...form,
              minutos_por_ciclo: sanitizeMinutosInput(e.target.value),
            })}
            placeholder="Ej. 90"
          />
          {horasMinutosPreview != null && (
            <small className="form-hint">= {formatNumber(horasMinutosPreview, 4)} horas</small>
          )}
        </div>
      );
    }

    if (field === 'potencia_w') {
      return (
        <div className="form-group" key={field}>
          <label>{label} *</label>
          <input
            {...commonProps}
            value={form.potencia_w ?? ''}
            onChange={(e) => setForm({ ...form, potencia_w: e.target.value })}
            placeholder="Ej. 800"
          />
        </div>
      );
    }

    const placeholders = {
      kwh_por_ciclo: 'Ej. 1.6',
      kwh_anual: 'Ej. 333',
      btu_h: 'Ej. 9000',
      hp: 'Ej. 0.5',
    };

    return (
      <div className="form-group" key={field}>
        <label>{label} *</label>
        <input
          {...commonProps}
          value={form[field] ?? ''}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          placeholder={placeholders[field]}
        />
      </div>
    );
  };

  const presetOptions = tiposPreset.map((t) => ({
    ...t,
    label: `${t.nombre} (${t.potencia}W)`,
  }));

  const horasUsoReadOnly = eficienciaActiva && (
    plantillaMeta?.locksHorasUsoDia || eficienciaConfig.minutos_como_horas_uso
  );

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
                  {opt.eficiencia_habilitada && (
                    <small style={{ marginLeft: '0.35rem', opacity: 0.75 }}>· EE</small>
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

      {eficienciaDisponible && (
        <div className="form-group eficiencia-block">
          <label className="checkbox-label eficiencia-checkbox">
            <input
              type="checkbox"
              checked={Boolean(form.eficiencia_energetica)}
              onChange={(e) => toggleEficiencia(e.target.checked)}
            />
            <span>Usar etiqueta de eficiencia energética (datos del fabricante)</span>
          </label>
          {plantillaMeta && (
            <small className="form-hint">{plantillaMeta.description}</small>
          )}

          {eficienciaActiva && plantillaMeta && (
            <div className="form-row" style={{ marginTop: '0.75rem' }}>
              {plantillaMeta.fields.map((field) => renderEficienciaField(field))}
            </div>
          )}

          {eficienciaActiva && potenciaCalculada != null && !potenciaFromUser && (
            <div className="eficiencia-preview">
              <strong>Potencia calculada:</strong> {formatNumber(potenciaCalculada, 4)} W
            </div>
          )}

          {eficienciaActiva && energiaCalculada != null && (
            <div className="eficiencia-preview">
              <strong>Energía por uso calculada:</strong> {formatNumber(energiaCalculada, 4)} kWh
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
            readOnly={horasUsoReadOnly}
            title={horasUsoReadOnly ? 'Valor definido por la etiqueta de eficiencia energética' : undefined}
          />
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
