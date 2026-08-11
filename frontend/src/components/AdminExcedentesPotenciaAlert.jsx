import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import ExcedentesPotenciaAlert from './ExcedentesPotenciaAlert';
import SearchableSelect from './SearchableSelect';
import { formatNumber } from '../utils/helpers';

const SORT_OPTIONS = [
  { id: 'exceso', label: 'Mayor exceso (W)' },
  { id: 'equipos', label: 'Más equipos' },
  { id: 'consumo', label: 'Mayor consumo' },
  { id: 'nombre', label: 'Nombre A-Z' },
];

const MODULO_FILTERS = [
  { id: 'todos', label: 'Todos los módulos' },
  { id: 'aparato', label: 'Electrodomésticos' },
  { id: 'iluminacion', label: 'Iluminación' },
  { id: 'fantasma', label: 'Consumo fantasma' },
];

function sortAlertas(list, sortBy) {
  const sorted = [...list];
  switch (sortBy) {
    case 'equipos':
      return sorted.sort((a, b) => b.totalEquipos - a.totalEquipos || b.totalExcesoW - a.totalExcesoW);
    case 'consumo':
      return sorted.sort((a, b) => b.consumoMesTotal - a.consumoMesTotal || b.totalExcesoW - a.totalExcesoW);
    case 'nombre':
      return sorted.sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre, 'es'));
    default:
      return sorted.sort((a, b) => b.totalExcesoW - a.totalExcesoW || b.totalEquipos - a.totalEquipos);
  }
}

function toSelectOptions(alertas) {
  return alertas.map((alerta) => ({
    value: alerta.clienteId,
    label: alerta.clienteNombre,
    searchText: [
      alerta.clienteNombre,
      alerta.clienteDocumento,
      alerta.clienteEmail,
      String(alerta.clienteId),
    ].filter(Boolean).join(' '),
    alerta,
  }));
}

export default function AdminExcedentesPotenciaAlert({ alertas = [] }) {
  const [sortBy, setSortBy] = useState('exceso');
  const [moduloFilter, setModuloFilter] = useState('todos');
  const [selectedId, setSelectedId] = useState(null);

  const sorted = useMemo(
    () => sortAlertas(alertas, sortBy),
    [alertas, sortBy],
  );

  const selectOptions = useMemo(() => toSelectOptions(sorted), [sorted]);

  useEffect(() => {
    if (!sorted.length) {
      setSelectedId(null);
      return;
    }
    if (!sorted.some((a) => a.clienteId === selectedId)) {
      setSelectedId(sorted[0].clienteId);
    }
  }, [sorted, selectedId]);

  useEffect(() => {
    setModuloFilter('todos');
  }, [selectedId]);

  if (!alertas.length) return null;

  const selectedIndex = sorted.findIndex((a) => a.clienteId === selectedId);
  const selected = selectedIndex >= 0 ? sorted[selectedIndex] : null;
  const selectedItems = selected
    ? (moduloFilter === 'todos'
      ? selected.items
      : selected.items.filter((i) => i.modulo === moduloFilter))
    : [];

  const totalEquipos = alertas.reduce((sum, a) => sum + a.totalEquipos, 0);
  const totalExcesoW = alertas.reduce((sum, a) => sum + (a.totalExcesoW || 0), 0);

  const goPrev = () => {
    if (selectedIndex > 0) setSelectedId(sorted[selectedIndex - 1].clienteId);
  };

  const goNext = () => {
    if (selectedIndex >= 0 && selectedIndex < sorted.length - 1) {
      setSelectedId(sorted[selectedIndex + 1].clienteId);
    }
  };

  return (
    <div className="admin-excedentes-panel">
      <div className="admin-excedentes-panel__overview">
        <div className="excedentes-potencia-stat">
          <span className="excedentes-potencia-stat__label">Clientes con alertas</span>
          <strong className="excedentes-potencia-stat__value">{alertas.length}</strong>
        </div>
        <div className="excedentes-potencia-stat">
          <span className="excedentes-potencia-stat__label">Equipos detectados</span>
          <strong className="excedentes-potencia-stat__value">{totalEquipos}</strong>
        </div>
        <div className="excedentes-potencia-stat">
          <span className="excedentes-potencia-stat__label">Exceso total de potencia</span>
          <strong className="excedentes-potencia-stat__value excedentes-potencia-stat__value--warn">
            +{formatNumber(totalExcesoW, 0)} W
          </strong>
        </div>
      </div>

      <div className="admin-excedentes-picker">
        <div className="admin-excedentes-picker__select">
          <label className="admin-excedentes-picker__label">
            Cliente
          </label>
          <SearchableSelect
            options={selectOptions}
            value={selectedId ?? ''}
            onChange={(id) => setSelectedId(id || null)}
            placeholder="Buscar por nombre, documento o correo…"
            getOptionLabel={(opt) => opt.label}
            getOptionValue={(opt) => opt.value}
            clearable={false}
            renderOption={(opt) => (
              <span className="admin-excedentes-picker__option">
                <span className="admin-excedentes-picker__option-name">{opt.label}</span>
                <span className="admin-excedentes-picker__option-meta">
                  {opt.alerta.clienteDocumento ? `${opt.alerta.clienteDocumento} · ` : ''}
                  +{formatNumber(opt.alerta.totalExcesoW, 0)} W · {opt.alerta.totalEquipos} eq.
                </span>
              </span>
            )}
          />
        </div>

        <div className="admin-excedentes-picker__controls">
          <label className="admin-excedentes-picker__label" htmlFor="admin-excedentes-sort">
            Orden
          </label>
          <select
            id="admin-excedentes-sort"
            className="form-control admin-excedentes-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Ordenar clientes"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="admin-excedentes-picker__nav" aria-label="Navegar entre clientes">
          <button
            type="button"
            className="btn btn-secondary btn-sm admin-excedentes-picker__nav-btn"
            onClick={goPrev}
            disabled={selectedIndex <= 0}
            aria-label="Cliente anterior"
          >
            <ChevronLeft size={16} aria-hidden />
            <span>Anterior</span>
          </button>
          <span className="admin-excedentes-picker__counter">
            {selectedIndex >= 0 ? `${selectedIndex + 1} / ${sorted.length}` : `0 / ${sorted.length}`}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm admin-excedentes-picker__nav-btn"
            onClick={goNext}
            disabled={selectedIndex < 0 || selectedIndex >= sorted.length - 1}
            aria-label="Cliente siguiente"
          >
            <span>Siguiente</span>
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div className="admin-excedentes-detail">
        {selected ? (
          <>
            <div className="admin-excedentes-detail__toolbar">
              <div className="dashboard-chart-filters__pills dashboard-chart-filters__pills--wrap">
                {MODULO_FILTERS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`dashboard-chart-chip dashboard-chart-chip--sm ${moduloFilter === m.id ? 'active' : ''}`}
                    onClick={() => setModuloFilter(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <Link
                to={`/admin/clientes/${selected.clienteId}`}
                className="admin-excedentes-detail__link"
              >
                Ver ficha del cliente →
              </Link>
            </div>

            {selectedItems.length > 0 ? (
              <ExcedentesPotenciaAlert
                items={selectedItems}
                adminCliente={selected}
                compact
              />
            ) : (
              <div className="dashboard-empty">
                <p>No hay equipos en el módulo seleccionado para este cliente.</p>
              </div>
            )}
          </>
        ) : (
          <div className="dashboard-empty">
            <p>Seleccione un cliente para ver el detalle de alertas.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminExcedentesEmptyState() {
  return (
    <div className="dashboard-empty dashboard-empty--success">
      <AlertTriangle size={32} aria-hidden />
      <h3>Todo en orden</h3>
      <p>Ningún cliente tiene equipos que superen la potencia de referencia del catálogo.</p>
    </div>
  );
}
