import { useState } from 'react';
import { Upload, Camera, Loader2 } from 'lucide-react';
import { extraerTarifaRecibo } from '../services/api';
import { RECIBO_ACCEPT, isReciboFileAllowed } from '../utils/reciboTarifaUpload';

export default function ReciboTarifaUploader({
  onTarifaDetected,
  onDatosDetected,
  onExtractingChange,
  onHistorialRegistered,
  onReciboPendienteHistorial,
  clienteId = null,
  disabled = false,
}) {
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const setExtractingState = (value) => {
    setExtracting(value);
    onExtractingChange?.(value);
  };

  const emitDatos = (datos) => {
    onDatosDetected?.(datos);
    if (datos.tarifa_kwh != null) {
      onTarifaDetected?.(datos.tarifa_kwh);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || disabled) return;

    if (!isReciboFileAllowed(file)) {
      setError('Formato no permitido. Use PDF, JPEG, JPG o PNG.');
      setMessage('');
      return;
    }

    setExtractingState(true);
    setMessage('');
    setError('');

    try {
      const { data } = await extraerTarifaRecibo(file, clienteId);
      const datos = data.data || {};
      const historialOk = Boolean(data.historial_recibo?.id);
      if (historialOk) {
        onHistorialRegistered?.(data.historial_recibo);
      } else if (
        !clienteId
        && (datos.total_a_pagar != null || datos.consumo_kwh != null)
      ) {
        onReciboPendienteHistorial?.(datos);
      }
      const historialMsg = historialOk
        ? ' Escenario inicial registrado en Historial.'
        : (!clienteId && (datos.total_a_pagar != null || datos.consumo_kwh != null)
          ? ' Guarde el cliente/perfil para registrar el escenario inicial en Historial.'
          : '');
      if (datos.tarifa_kwh == null) {
        setError(data.message || datos.message || 'No se encontró la tarifa en el recibo.');
        if (
          datos.potencia_contratada
          || datos.alumbrado_publico != null
          || datos.electrificacion_rural != null
          || datos.empresa_distribuidora
          || datos.total_a_pagar != null
        ) {
          emitDatos(datos);
          setMessage(
            datos.total_a_pagar != null
              ? `${datos.message || 'Datos detectados.'}${historialMsg}`
              : `${datos.message || 'Se detectaron algunos datos del recibo.'}${historialMsg}`,
          );
        }
        return;
      }
      emitDatos(datos);
      setMessage(
        datos.total_a_pagar != null
          ? `${datos.message || `Tarifa detectada: S/ ${datos.tarifa_kwh} por kWh`}.${historialMsg}`
          : `${datos.message || `Tarifa detectada: S/ ${datos.tarifa_kwh} por kWh`}${historialMsg}`,
      );
    } catch (err) {
      setError(
        err.response?.data?.message || 'No se pudo leer el recibo. Intente con otro archivo o ingrese los datos manualmente.',
      );
    } finally {
      setExtractingState(false);
    }
  };

  const isBusy = extracting || disabled;

  return (
    <div className="recibo-tarifa-uploader">
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#a0aec0' }}>
        Detectar datos desde recibo de luz
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <label
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            margin: 0,
            cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isBusy ? 0.65 : 1,
          }}
        >
          {extracting ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
          Subir PDF, JPEG o PNG
          <input
            type="file"
            hidden
            accept={RECIBO_ACCEPT}
            disabled={isBusy}
            onChange={handleFile}
          />
        </label>
        <label
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            margin: 0,
            cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isBusy ? 0.65 : 1,
          }}
        >
          {extracting ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}
          Tomar foto
          <input
            type="file"
            hidden
            accept="image/jpeg,image/jpg,image/pjpeg,image/jfif,image/png,.jpg,.jpeg,.png"
            capture="environment"
            disabled={isBusy}
            onChange={handleFile}
          />
        </label>
      </div>
      {extracting && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(37, 99, 235, 0.1)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            color: '#93c5fd',
            fontSize: '0.8rem',
          }}
        >
          <Loader2 size={18} className="spin" />
          <span>Leyendo recibo y detectando distribuidora, tarifa, potencia y alumbrado…</span>
        </div>
      )}
      <small style={{ display: 'block', marginTop: '8px', color: '#718096', fontSize: '0.75rem' }}>
        Extrae empresa distribuidora, tarifa (S/kWh), potencia, alumbrado, electrificación rural (Ley N° 28749) y total a pagar del recibo.
        El total y consumo del recibo crean su escenario inicial en Historial (informativo).
        Cada «Ejecutar Reporte» en Inicio agrega escenarios estimados según sus equipos.
      </small>
      {message && (
        <small style={{ display: 'block', marginTop: '6px', color: '#10b981', fontSize: '0.75rem' }}>
          {message}
        </small>
      )}
      {error && (
        <small style={{ display: 'block', marginTop: '6px', color: '#ef4444', fontSize: '0.75rem' }}>
          {error}
        </small>
      )}
    </div>
  );
}
