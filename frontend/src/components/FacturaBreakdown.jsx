import { useEffect, useMemo, useState } from 'react';
import { Zap, Receipt, Percent, MapPin, Info, Plus, Equal, ChevronDown, ChevronUp } from 'lucide-react';
import { formatNumber, formatCurrency } from '../utils/helpers';
import { buildFactura } from '../utils/factura';

function useAnimatedNumber(target, duration = 600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    let frame;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function SubtotalLine({ icon: Icon, label, value, unit = 'currency', operator, subtext, isExpandable, expandedContent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div 
        className="factura-line" 
        onClick={() => isExpandable && setExpanded(!expanded)}
        style={{ cursor: isExpandable ? 'pointer' : 'default' }}
      >
        <span className={`factura-operator ${operator ? '' : 'factura-operator-empty'}`} aria-hidden="true">
          {operator === 'plus' && <Plus size={14} />}
          {operator === 'equal' && <Equal size={14} />}
        </span>
        <div className="factura-line-icon">
          <Icon size={16} />
        </div>
        <div className="factura-line-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="factura-line-label">{label}</span>
            {subtext && <span className="factura-line-subtext" style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>{subtext}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="factura-line-value">
              {unit === 'kwh' ? `${formatNumber(value)} kWh` : formatCurrency(value)}
            </span>
            {isExpandable && (
              expanded ? <ChevronUp size={16} color="#a0aec0" /> : <ChevronDown size={16} color="#a0aec0" />
            )}
          </div>
        </div>
      </div>
      {expanded && expandedContent && (
        <>
          {expandedContent}
        </>
      )}
    </>
  );
}

/**
 * Desglose de factura mensual — réplica hoja CALCULADORA del Excel
 */
export default function FacturaBreakdown({ factura, precioKwh, consumoMesFallback }) {
  const data = useMemo(
    () => buildFactura(factura, precioKwh, consumoMesFallback),
    [factura, precioKwh, consumoMesFallback]
  );
  const animatedTotal = useAnimatedNumber(data.totalMes);

  if (!factura && !consumoMesFallback) return null;

  const subtotalItems = [
    { 
      icon: Zap, 
      label: 'Consumo de Energía', 
      value: data.gastoEnergiaMensual || data.consumoEnergiaLinea, 
      unit: 'currency',
      isExpandable: true,
      expandedContent: (
        <div className="factura-line" style={{ background: 'rgba(255, 255, 255, 0.015)', borderTop: 'none', paddingLeft: '40px' }}>
          <span className="factura-operator factura-operator-empty" aria-hidden="true"></span>
          <div className="factura-line-icon">
            <Info size={16} />
          </div>
          <div className="factura-line-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="factura-line-label" style={{ color: '#a0aec0' }}>
              Detalle de cálculo: {formatNumber(data.consumoKwh)} kWh × {formatCurrency(precioKwh || 0.613)}
            </span>
          </div>
        </div>
      )
    },
    { icon: Receipt, label: 'Cargo Fijo', value: data.cargoFijo },
    { icon: Receipt, label: 'Mant. y Reposición de Conexión', value: data.mantReposicion },
    { icon: Receipt, label: 'Alumbrado Público', value: data.alumbradoPublico },
    { icon: Receipt, label: 'Interés Compensatorio', value: data.interesCompensatorio },
  ];

  const pctEnergia = data.subtotal > 0 ? (data.consumoKwh / data.subtotal) * 100 : 0;
  const pctCargos = data.subtotal > 0
    ? ((data.cargoFijo + data.mantReposicion + data.alumbradoPublico + data.interesCompensatorio) / data.subtotal) * 100
    : 0;

  return (
    <div className="factura-panel">
      <div className="factura-hero">
        <div className="factura-hero-content">
          <span className="factura-hero-label">Total estimado del mes</span>
          <span className="factura-hero-value">{formatCurrency(animatedTotal)}</span>
          <span className="factura-hero-meta">
            Incluye IGV ({Math.round(data.igvRate * 100)}%) y electrificación rural
          </span>
        </div>
        <div className="factura-hero-stats">
          <div className="factura-mini-stat">
            <span>Subtotal</span>
            <strong>{formatCurrency(data.subtotal)}</strong>
          </div>
          <div className="factura-mini-stat">
            <span>IGV</span>
            <strong>{formatCurrency(data.igv)}</strong>
          </div>
          <div className="factura-mini-stat">
            <span>kWh/día</span>
            <strong>{formatNumber((data.consumoKwh || 0) / 30)}</strong>
          </div>
          <div className="factura-mini-stat">
            <span>kWh/mes</span>
            <strong>{formatNumber(data.consumoKwh)}</strong>
          </div>
          <div className="factura-mini-stat">
            <span>kWh/año</span>
            <strong>{formatNumber(((data.consumoKwh || 0) / 30) * 365)}</strong>
          </div>
        </div>
      </div>

      <div className="factura-composition">
        <div className="factura-composition-bar" aria-hidden="true">
          <span className="factura-bar-energia" style={{ width: `${pctEnergia}%` }} />
          <span className="factura-bar-cargos" style={{ width: `${pctCargos}%` }} />
        </div>
        <div className="factura-composition-legend">
          <span><i className="dot dot-energia" /> Consumo (kWh)</span>
          <span><i className="dot dot-cargos" /> Cargos fijos</span>
        </div>
      </div>

      <section className="factura-section">
        <header className="factura-section-header">
          <h4>Composición del subtotal</h4>
          <p>Suma de consumo de energía + cargos regulados</p>
        </header>
        <div className="factura-lines">
          {subtotalItems.map((item, index) => (
            <SubtotalLine
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              unit={item.unit}
              operator={index > 0 ? 'plus' : null}
              subtext={item.subtext}
              isExpandable={item.isExpandable}
              expandedContent={item.expandedContent}
            />
          ))}
          <div className="factura-subtotal-box">
            <SubtotalLine icon={Equal} label="Subtotal" value={data.subtotal} operator="equal" />
            <small className="factura-formula">
              {formatCurrency(data.gastoEnergiaMensual || data.consumoEnergiaLinea).replace('S/ ', '')} + {formatCurrency(data.cargoFijo).replace('S/ ', '')}
              {' + '}{formatCurrency(data.mantReposicion).replace('S/ ', '')}
              {' + '}{formatCurrency(data.alumbradoPublico).replace('S/ ', '')}
              {' + '}{formatCurrency(data.interesCompensatorio).replace('S/ ', '')}
            </small>
          </div>
        </div>
      </section>

      <section className="factura-section">
        <header className="factura-section-header">
          <h4>Impuestos y cargos adicionales</h4>
        </header>
        <div className="factura-lines factura-lines-compact">
          <SubtotalLine icon={Percent} label={`IGV (${Math.round(data.igvRate * 100)}%)`} value={data.igv} />
          <SubtotalLine icon={MapPin} label="Electrificación Rural" value={data.electrificacionRural} />
        </div>
      </section>

      <div className="factura-reference">
        <Info size={15} />
        <div>
          <strong>Gasto energía (referencia tarifa)</strong>
          <span>{formatCurrency(data.gastoEnergia)} — precio × kWh mensual (no suma al subtotal)</span>
        </div>
      </div>
    </div>
  );
}
