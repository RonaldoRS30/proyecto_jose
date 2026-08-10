import { useEffect, useMemo, useState } from 'react';
import { User, Building, Zap, Save, Check, Loader2, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import ReciboTarifaUploader from '../../components/ReciboTarifaUploader';
import SearchableSelect from '../../components/SearchableSelect';
import { getMiPerfil, updateMiPerfil } from '../../services/api';
import { useCalculo } from '../../contexts/CalculoContext';
import { useUnsavedTarifaGuard } from '../../hooks/useUnsavedTarifaGuard';
import { tarifaValuesDiffer } from '../../utils/tarifaCompare';

const DISTRIBUIDORAS = [
  'Luz del Sur', 'PLUZ PERU', 'ELECTROCENTRO',
  'HIDRANDINA', 'ENSA', 'ENOSA', 'ELECTRO DUNAS', 'SEAL',
  'ELECTROORIENTE', 'ELECTRO UCAYALI', 'ELECTRO SUR ESTE',
  'ELECTROSUR', 'ELECTRO PUNO',
];

function inferTipoCliente(c) {
  if (c?.tipo_cliente === 'empresa' || c?.tipo_cliente === 'natural') return c.tipo_cliente;
  return c?.apellido === '' || c?.apellido == null ? 'empresa' : 'natural';
}

function buildFormFromCliente(c) {
  return {
    nombre: c.nombre || '',
    apellido: c.apellido || '',
    documento: c.documento || '',
    email: c.email || '',
    telefono: c.telefono || '',
    direccion: c.direccion || '',
    empresa_distribuidora: c.empresa_distribuidora || '',
    tarifa: c.tarifa || '',
    medidor: c.medidor || '',
    tarifa_kwh: c.tarifa_kwh ?? '',
    potencia_contratada: c.potencia_contratada || '',
    alumbrado_publico: c.alumbrado_publico ?? '',
  };
}

function documentoChanged(cliente, form) {
  const actual = String(cliente?.documento ?? '').replace(/\D/g, '');
  const nuevo = String(form?.documento ?? '').replace(/\D/g, '');
  return actual !== nuevo;
}

function formHasChanges(cliente, form, tipo) {
  if (!cliente || !form) return false;
  const checks = [
    (cliente.nombre || '') !== (form.nombre || ''),
    tipo === 'natural' && (cliente.apellido || '') !== (form.apellido || ''),
    documentoChanged(cliente, form),
    (cliente.email || '') !== (form.email || ''),
    (cliente.telefono || '') !== (form.telefono || ''),
    (cliente.direccion || '') !== (form.direccion || ''),
    (cliente.empresa_distribuidora || '') !== (form.empresa_distribuidora || ''),
    (cliente.tarifa || '') !== (form.tarifa || ''),
    (cliente.medidor || '') !== (form.medidor || ''),
    tarifaValuesDiffer(cliente.tarifa_kwh, form.tarifa_kwh),
    (cliente.potencia_contratada || '') !== (form.potencia_contratada || ''),
    String(cliente.alumbrado_publico ?? '') !== String(form.alumbrado_publico === '' ? '' : form.alumbrado_publico),
  ];
  return checks.some(Boolean);
}

export default function PerfilPage() {
  const { refreshPreview, refreshCalculos } = useCalculo();
  const [cliente, setCliente] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [extractingTarifa, setExtractingTarifa] = useState(false);
  const [tarifaDesdeRecibo, setTarifaDesdeRecibo] = useState(false);
  const [codigoAcceso, setCodigoAcceso] = useState('');
  const [codigoAccesoConfirm, setCodigoAccesoConfirm] = useState('');

  const tipoCliente = useMemo(
    () => (cliente ? inferTipoCliente(cliente) : 'natural'),
    [cliente],
  );

  const documentoUnlocked = codigoAcceso.length > 0
    && codigoAccesoConfirm.length > 0
    && codigoAcceso.trim().toUpperCase() === codigoAccesoConfirm.trim().toUpperCase();

  const docLabel = tipoCliente === 'empresa' ? 'RUC' : 'DNI';
  const docMaxLength = tipoCliente === 'empresa' ? 11 : 8;

  const fetchPerfil = () => {
    getMiPerfil()
      .then(({ data }) => {
        setCliente(data.data);
        setForm(buildFormFromCliente(data.data));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPerfil();
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSave = async () => {
    if (!form || extractingTarifa) return;

    if (tipoCliente === 'natural' && !form.apellido.trim()) {
      setError('El apellido es obligatorio para persona natural.');
      return;
    }
    if (!form.nombre.trim()) {
      setError(tipoCliente === 'empresa' ? 'La razón social es obligatoria.' : 'El nombre es obligatorio.');
      return;
    }
    const tel = (form.telefono || '').replace(/\D/g, '');
    if (tel && (tel.length < 7 || tel.length > 9)) {
      setError('El teléfono debe tener entre 7 y 9 dígitos.');
      return;
    }
    if (form.tarifa_kwh !== '' && (Number.isNaN(Number(form.tarifa_kwh)) || Number(form.tarifa_kwh) < 0)) {
      setError('La tarifa eléctrica debe ser un número válido mayor o igual a 0.');
      return;
    }
    if (form.alumbrado_publico !== '' && (Number.isNaN(Number(form.alumbrado_publico)) || Number(form.alumbrado_publico) < 0)) {
      setError('El alumbrado público debe ser un número válido mayor o igual a 0.');
      return;
    }

    const docLimpio = (form.documento || '').replace(/\D/g, '');
    const docCambiado = documentoChanged(cliente, form);
    if (docCambiado) {
      if (!documentoUnlocked) {
        setError(`Ingrese su código de acceso dos veces para editar el ${docLabel}.`);
        return;
      }
      if (tipoCliente === 'empresa' && docLimpio.length !== 11) {
        setError('El RUC debe tener exactamente 11 dígitos.');
        return;
      }
      if (tipoCliente === 'natural' && docLimpio.length !== 8) {
        setError('El DNI debe tener exactamente 8 dígitos.');
        return;
      }
    }

    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const payload = {
        nombre: form.nombre.trim(),
        email: form.email.trim() || null,
        telefono: tel,
        direccion: form.direccion.trim() || null,
        empresa_distribuidora: form.empresa_distribuidora,
        tarifa: form.tarifa,
        medidor: form.medidor,
        tarifa_kwh: form.tarifa_kwh === '' ? null : parseFloat(form.tarifa_kwh),
        potencia_contratada: form.potencia_contratada.trim() || null,
        alumbrado_publico: form.alumbrado_publico === '' ? null : parseFloat(form.alumbrado_publico),
      };
      if (tipoCliente === 'natural') {
        payload.apellido = form.apellido.trim();
      }
      if (docCambiado) {
        payload.documento = docLimpio;
        payload.codigo_acceso = codigoAcceso.trim();
        payload.codigo_acceso_confirmacion = codigoAccesoConfirm.trim();
      }

      const { data } = await updateMiPerfil(payload);
      setCliente(data.data);
      setForm(buildFormFromCliente(data.data));
      setCodigoAcceso('');
      setCodigoAccesoConfirm('');
      setTarifaDesdeRecibo(false);
      await Promise.all([refreshPreview(), refreshCalculos()]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = cliente && form ? formHasChanges(cliente, form, tipoCliente) : false;
  const cambiosPendientes = hasChanges && !extractingTarifa && !saving;

  useUnsavedTarifaGuard(cambiosPendientes, {
    title: 'Perfil sin guardar',
    message: 'Tiene cambios en su perfil que aún no ha guardado.',
    detail: 'Pulse «Guardar perfil» para aplicarlos antes de cambiar de módulo.',
    confirmLabel: 'Salir sin guardar',
    cancelLabel: 'Quedarme y guardar',
    variant: 'warning',
  });

  if (loading) return <div className="loading">Cargando perfil...</div>;
  if (!cliente || !form) return <div className="empty-state">No se pudo cargar el perfil</div>;

  return (
    <div>
      <PageHeader
        title="Mi Perfil"
        subtitle="Edite sus datos personales y de servicio eléctrico"
      />

      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #e11d48' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} style={{ color: '#e11d48' }} />
          <h3 style={{ margin: 0 }}>Tarifa y datos del recibo</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
            <div className="profile-field" style={{ flex: '0 0 auto' }}>
              <label className="profile-field-label">Precio por kWh (S/)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#e11d48' }}>S/</span>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="form-control"
                  style={{ width: '160px', fontSize: '18px', fontWeight: 600, padding: '8px 12px' }}
                  value={form.tarifa_kwh}
                  onChange={(e) => setField('tarifa_kwh', e.target.value)}
                  placeholder="0.613"
                  disabled={extractingTarifa}
                />
              </div>
            </div>
            <div className="profile-field" style={{ flex: '0 0 auto' }}>
              <label className="profile-field-label">Potencia contratada</label>
              <input
                className="form-control"
                style={{ width: '160px', padding: '8px 12px' }}
                value={form.potencia_contratada}
                onChange={(e) => setField('potencia_contratada', e.target.value)}
                placeholder="Ej. 3.00 KW"
                disabled={extractingTarifa}
              />
            </div>
            <div className="profile-field" style={{ flex: '0 0 auto' }}>
              <label className="profile-field-label">Alumbrado público (S/)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                style={{ width: '160px', padding: '8px 12px' }}
                value={form.alumbrado_publico}
                onChange={(e) => setField('alumbrado_publico', e.target.value)}
                placeholder="Ej. 12.60"
                disabled={extractingTarifa}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <ReciboTarifaUploader
              onDatosDetected={(datos) => {
                setForm((prev) => ({
                  ...prev,
                  ...(datos.tarifa_kwh != null ? { tarifa_kwh: String(datos.tarifa_kwh) } : {}),
                  ...(datos.potencia_contratada ? { potencia_contratada: datos.potencia_contratada } : {}),
                  ...(datos.alumbrado_publico != null ? { alumbrado_publico: String(datos.alumbrado_publico) } : {}),
                  ...(datos.empresa_distribuidora ? { empresa_distribuidora: datos.empresa_distribuidora } : {}),
                }));
                setTarifaDesdeRecibo(true);
              }}
              onExtractingChange={setExtractingTarifa}
            />
          </div>

          <div style={{ marginTop: '12px', fontSize: '12px', color: '#718096', lineHeight: '1.5', background: 'rgba(225, 29, 72, 0.05)', padding: '10px 12px', borderRadius: '6px' }}>
            <strong>Importante:</strong> La tarifa y el alumbrado público se usan en los cálculos y reportes PDF.
            La potencia contratada aparece en el PDF del cliente.
            {form.tarifa_kwh === '' && (
              <> Si deja la tarifa vacía se usa la tarifa global (S/ 0.613).</>
            )}
          </div>
        </div>
      </div>

      <div className="profile-cards-grid">
        <div className="card profile-card">
          <div className="card-header">
            <h3><User size={18} /> Datos Personales</h3>
          </div>
          <div className="card-body profile-fields">
            <div className="profile-field">
              <label className="profile-field-label">
                {tipoCliente === 'empresa' ? 'Razón social' : 'Nombre'}
              </label>
              <input
                className="form-control"
                value={form.nombre}
                onChange={(e) => setField('nombre', e.target.value)}
                disabled={extractingTarifa}
              />
            </div>
            {tipoCliente === 'natural' && (
              <div className="profile-field">
                <label className="profile-field-label">Apellido</label>
                <input
                  className="form-control"
                  value={form.apellido}
                  onChange={(e) => setField('apellido', e.target.value)}
                  disabled={extractingTarifa}
                />
              </div>
            )}
            <div className="profile-field">
              <label className="profile-field-label">{docLabel}</label>
              <input
                className="form-control"
                value={form.documento}
                onChange={(e) => setField('documento', e.target.value.replace(/\D/g, ''))}
                maxLength={docMaxLength}
                placeholder={tipoCliente === 'empresa' ? '11 dígitos' : '8 dígitos'}
                disabled={extractingTarifa || !documentoUnlocked}
              />
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Para editar el {docLabel}, ingrese su código de acceso (contraseña de ingreso) dos veces.
              </p>
              <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="password"
                  className="form-control"
                  value={codigoAcceso}
                  onChange={(e) => setCodigoAcceso(e.target.value.toUpperCase())}
                  placeholder="Código de acceso"
                  autoComplete="off"
                  disabled={extractingTarifa}
                />
                <input
                  type="password"
                  className="form-control"
                  value={codigoAccesoConfirm}
                  onChange={(e) => setCodigoAccesoConfirm(e.target.value.toUpperCase())}
                  placeholder="Confirmar código de acceso"
                  autoComplete="off"
                  disabled={extractingTarifa}
                />
              </div>
              {codigoAcceso && codigoAccesoConfirm && !documentoUnlocked && (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: '#f87171' }}>
                  Los códigos de acceso no coinciden.
                </p>
              )}
              {documentoUnlocked && (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: '#34d399' }}>
                  Código verificado. Ya puede editar el {docLabel}.
                </p>
              )}
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="correo@ejemplo.com"
                disabled={extractingTarifa}
              />
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Teléfono</label>
              <input
                className="form-control"
                value={form.telefono}
                onChange={(e) => setField('telefono', e.target.value.replace(/\D/g, ''))}
                maxLength={9}
                placeholder="9 dígitos"
                disabled={extractingTarifa}
              />
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Dirección</label>
              <input
                className="form-control"
                value={form.direccion}
                onChange={(e) => setField('direccion', e.target.value)}
                disabled={extractingTarifa}
              />
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Código interno</span>
              <code className="code-display">{cliente.codigo_interno}</code>
            </div>
          </div>
        </div>

        <div className="card profile-card">
          <div className="card-header">
            <h3><Building size={18} /> Servicio Eléctrico</h3>
          </div>
          <div className="card-body profile-fields">
            <div className="profile-field">
              <label className="profile-field-label">Empresa distribuidora</label>
              <SearchableSelect
                value={form.empresa_distribuidora}
                onChange={(val) => setField('empresa_distribuidora', val)}
                options={DISTRIBUIDORAS}
                placeholder="Buscar empresa..."
                disabled={extractingTarifa}
              />
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Tarifa (tipo)</label>
              <input
                className="form-control"
                value={form.tarifa}
                onChange={(e) => setField('tarifa', e.target.value)}
                placeholder="Ej. BT5B residencial"
                disabled={extractingTarifa}
              />
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Medidor</label>
              <input
                className="form-control"
                value={form.medidor}
                onChange={(e) => setField('medidor', e.target.value)}
                placeholder="Ej. 3φ - 3 hilos"
                disabled={extractingTarifa}
              />
            </div>
          </div>
        </div>

        {cliente.codigos?.length > 0 && (
          <div className="card profile-card profile-card-full">
            <div className="card-header">
              <h3><Zap size={18} /> Códigos de Acceso</h3>
            </div>
            <div className="card-body">
              <div className="data-cards-grid profile-codes-grid">
                {cliente.codigos.map((c) => (
                  <div key={c.id} className="list-card">
                    <div className="list-card-header" style={{ marginBottom: 0 }}>
                      <span className="code-display">{c.codigo}</span>
                      <span className={`badge ${c.activo ? 'badge-success' : 'badge-danger'}`}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '1rem' }} role="alert">
          {error}
        </div>
      )}

      {cambiosPendientes && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginTop: '1rem',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            fontSize: '0.8rem',
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>
            {tarifaDesdeRecibo
              ? 'Subió un recibo y se detectaron datos, pero aún no los ha guardado. Pulse «Guardar perfil» antes de salir.'
              : 'Tiene cambios sin guardar. Pulse «Guardar perfil» antes de cambiar de módulo.'}
          </span>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || extractingTarifa || !hasChanges}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            fontSize: '15px',
            background: saved ? '#10b981' : undefined,
            borderColor: saved ? '#10b981' : undefined,
          }}
        >
          {saving ? (
            <><Loader2 size={18} className="spin" /> Guardando...</>
          ) : extractingTarifa ? (
            <><Loader2 size={18} className="spin" /> Analizando recibo...</>
          ) : saved ? (
            <><Check size={18} /> Perfil guardado</>
          ) : (
            <><Save size={18} /> Guardar perfil</>
          )}
        </button>
      </div>
    </div>
  );
}
