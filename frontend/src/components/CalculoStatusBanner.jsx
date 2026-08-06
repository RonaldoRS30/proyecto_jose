import { Link, useLocation } from 'react-router-dom';
import { Calculator, CheckCircle, AlertTriangle, Plug } from 'lucide-react';
import { useCalculo } from '../contexts/CalculoContext';
import { formatDate, formatNumber, formatCurrency } from '../utils/helpers';
import { buildFacturaFromCalculo } from '../utils/factura';

export default function CalculoStatusBanner() {
  const location = useLocation();
  const {
    resumenGeneral,
    ultimoCalculo,
    hasEquipos,
    hasCambiosSinGuardar,
    tarifaCambiada,
    calculating,
    loading,
  } = useCalculo();

  if (loading || location.pathname === '/cliente/perfil') return null;

  const isInicio = location.pathname === '/cliente' || location.pathname === '/cliente/';

  if (hasCambiosSinGuardar) {
    return (
      <div className="calculo-status-banner calculo-status-pending">
        <AlertTriangle size={18} />
        <div className="calculo-status-text">
          <strong>
            {tarifaCambiada ? 'Tarifa kWh actualizada — gastos recalculados.' : 'Hay cambios sin guardar en sus equipos.'}
          </strong>
          <span>
            Vista actual: {formatNumber(resumenGeneral.consumoMes ?? 0)} kWh/mes ·{' '}
            {formatCurrency(resumenGeneral.gastoMensual ?? 0)}/mes.
            {!isInicio && ' Vaya a Inicio y pulse «Ejecutar Cálculo» para guardar en historial y reportes.'}
          </span>
        </div>
        {!isInicio && (
          <Link to="/cliente" className="btn btn-primary btn-sm calculo-status-action">
            <Calculator size={14} /> Ir a Inicio
          </Link>
        )}
      </div>
    );
  }

  if (!ultimoCalculo) {
    return (
      <div className="calculo-status-banner calculo-status-empty">
        <AlertTriangle size={18} />
        <div className="calculo-status-text">
          <strong>{hasEquipos ? 'Sin cálculo guardado.' : 'Sin equipos registrados.'}</strong>
          <span>
            {hasEquipos
              ? 'Ejecute el cálculo desde Inicio para habilitar historial y reportes PDF.'
              : 'Registre electrodomésticos, consumo fantasma o iluminación para comenzar.'}
          </span>
        </div>
        {!hasEquipos ? (
          <Link to="/cliente/electrodomesticos" className="btn btn-primary btn-sm calculo-status-action">
            <Plug size={14} /> Agregar electrodomésticos
          </Link>
        ) : !isInicio && (
          <Link to="/cliente" className="btn btn-primary btn-sm calculo-status-action">
            <Calculator size={14} /> Ir a Inicio
          </Link>
        )}
      </div>
    );
  }

  const facturaTotal = buildFacturaFromCalculo(ultimoCalculo).totalMes;

  return (
    <div className="calculo-status-banner calculo-status-synced">
      <CheckCircle size={18} />
      <div className="calculo-status-text">
        <strong>Datos sincronizados</strong>
        <span>
          Cálculo #{ultimoCalculo.id} · {formatDate(ultimoCalculo.created_at)} ·{' '}
          {formatNumber(ultimoCalculo.consumo_mes_total)} kWh/mes
          {facturaTotal > 0 && (
            <> · Factura {formatCurrency(facturaTotal)}</>
          )}
          {calculating && ' · Guardando...'}
        </span>
      </div>
    </div>
  );
}
