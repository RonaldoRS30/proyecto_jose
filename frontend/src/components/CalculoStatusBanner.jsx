import { Link, useLocation } from 'react-router-dom';
import { Calculator, CheckCircle, AlertTriangle, Plug } from 'lucide-react';
import { useCalculo } from '../contexts/CalculoContext';
import { formatDate, formatNumber, formatCurrency } from '../utils/helpers';
import { buildFacturaFromCalculo } from '../utils/factura';
import { isReciboRegistro } from '../utils/calculoRegistro';

export default function CalculoStatusBanner() {
  const location = useLocation();
  const {
    resumenGeneral,
    ultimoCalculo,
    hasEquipos,
    hasCambiosSinGuardar,
    tarifaCambiada,
    configFacturacionCambiada,
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
            {tarifaCambiada || configFacturacionCambiada
              ? 'Tarifa o facturación actualizada — falta guardar el cálculo estimado.'
              : !ultimoCalculo || isReciboRegistro(ultimoCalculo)
                ? 'Tiene equipos registrados pero aún no guardó un cálculo estimado.'
                : 'Hay cambios sin guardar en sus equipos.'}
          </strong>
          <span>
            Vista actual: {formatNumber(resumenGeneral.consumoMes ?? 0)} kWh/mes ·{' '}
            {formatCurrency(resumenGeneral.gastoMensual ?? 0)}/mes.
            {' '}El recibo PDF solo se guarda en Historial; para guardar el estimado pulse «Ejecutar Reporte» en Inicio.
            {(tarifaCambiada || configFacturacionCambiada) && (
              <> Si subió un recibo en Mi Perfil, guarde primero el perfil para aplicar tarifa y alumbrado.</>
            )}
            {!isInicio && ' Vaya a Inicio y pulse «Ejecutar Reporte».'}
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

  if (!ultimoCalculo || isReciboRegistro(ultimoCalculo)) {
    return (
      <div className="calculo-status-banner calculo-status-empty">
        <AlertTriangle size={18} />
        <div className="calculo-status-text">
          <strong>{hasEquipos ? 'Sin cálculo estimado guardado.' : 'Sin equipos registrados.'}</strong>
          <span>
            {hasEquipos
              ? 'Subir un recibo PDF solo registra el total real en Historial. Para reportes y comparaciones, ejecute el cálculo desde Inicio.'
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
