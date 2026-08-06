import { useEffect, useState } from 'react';
import { User, Building, Zap, Save, Check, Mail, Phone, Globe } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { getMiPerfil, updateMiTarifa, getContactoReporte, updateContactoReporte } from '../../services/api';
import { useCalculo } from '../../contexts/CalculoContext';

export default function PerfilPage() {
  const { refreshPreview, refreshCalculos } = useCalculo();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tarifaInput, setTarifaInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [contacto, setContacto] = useState({ email: '', telefono: '', web: '' });
  const [contactoOriginal, setContactoOriginal] = useState({ email: '', telefono: '', web: '' });
  const [savingContacto, setSavingContacto] = useState(false);
  const [savedContacto, setSavedContacto] = useState(false);

  const fetchPerfil = () => {
    getMiPerfil()
      .then(({ data }) => {
        setCliente(data.data);
        setTarifaInput(data.data.tarifa_kwh ?? '');
      })
      .finally(() => setLoading(false));

    getContactoReporte()
      .then(({ data }) => {
        const c = {
          email: data.data.email ?? '',
          telefono: data.data.telefono ?? '',
          web: data.data.web ?? '',
        };
        setContacto(c);
        setContactoOriginal(c);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchPerfil();
  }, []);

  const handleSaveTarifa = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const val = tarifaInput === '' ? null : parseFloat(tarifaInput);
      const { data } = await updateMiTarifa(val);
      setCliente(data.data);
      await Promise.all([refreshPreview(), refreshCalculos()]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const tarifaChanged = (() => {
    const current = cliente?.tarifa_kwh ?? '';
    const input = tarifaInput === '' ? '' : parseFloat(tarifaInput);
    return String(current) !== String(input);
  })();

  const contactoChanged = (
    contacto.email !== contactoOriginal.email
    || contacto.telefono !== contactoOriginal.telefono
    || contacto.web !== contactoOriginal.web
  );

  const handleSaveContacto = async () => {
    setSavingContacto(true);
    setSavedContacto(false);
    try {
      const { data } = await updateContactoReporte(contacto);
      const c = {
        email: data.data.email ?? '',
        telefono: data.data.telefono ?? '',
        web: data.data.web ?? '',
      };
      setContacto(c);
      setContactoOriginal(c);
      setSavedContacto(true);
      setTimeout(() => setSavedContacto(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingContacto(false);
    }
  };

  if (loading) return <div className="loading">Cargando perfil...</div>;
  if (!cliente) return <div className="empty-state">No se pudo cargar el perfil</div>;

  return (
    <div>
      <PageHeader title="Mi Perfil" subtitle="Información de su cuenta" />

      {/* Tarifa kWh editable — card destacado */}
      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #e11d48' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} style={{ color: '#e11d48' }} />
          <h3 style={{ margin: 0 }}>Tarifa kWh (S/)</h3>
 
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 auto' }}>
              <label style={{ fontSize: '13px', color: '#a0aec0', display: 'block', marginBottom: '6px' }}>
                Precio por kWh (S/)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#e11d48' }}>S/</span>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="form-control"
                  style={{ width: '160px', fontSize: '18px', fontWeight: 600, padding: '8px 12px' }}
                  value={tarifaInput}
                  onChange={(e) => setTarifaInput(e.target.value)}
                  placeholder="0.613"
                />
              </div>
            </div>
            <div style={{ flex: '1', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingTop: '22px' }}>
              <button
                className="btn btn-primary"
                onClick={handleSaveTarifa}
                disabled={saving || !tarifaChanged}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 20px', fontSize: '14px',
                  background: saved ? '#10b981' : undefined,
                  borderColor: saved ? '#10b981' : undefined,
                }}
              >
                {saving ? (
                  <>Guardando...</>
                ) : saved ? (
                  <><Check size={16} /> Guardado</>
                ) : (
                  <><Save size={16} /> Guardar Tarifa</>
                )}
              </button>
              {tarifaInput === '' && (
                <span style={{ fontSize: '12px', color: '#718096' }}>
                  Si está vacío se usa la tarifa global (S/ 0.613)
                </span>
              )}
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#718096', lineHeight: '1.5', background: 'rgba(225, 29, 72, 0.05)', padding: '10px 12px', borderRadius: '6px' }}>
            <strong>⚡ Importante:</strong> Al guardar la tarifa, los gastos en Inicio, Dashboard y Reportes
            se actualizan al instante según la fórmula Consumo (kWh) × Tarifa.
            Para registrar la nueva tarifa en el historial, ejecute un cálculo desde Inicio.
            <br />
            <strong>Fórmula:</strong> Gasto = Consumo (kWh) × Tarifa (S/ {tarifaInput || '0.613'})
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #2563eb' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} style={{ color: '#2563eb' }} />
          <h3 style={{ margin: 0 }}>Contacto en reportes PDF</h3>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#718096', marginBottom: '1rem', lineHeight: 1.5 }}>
            Estos datos aparecen en el pie de página de todos los reportes PDF generados por el sistema.
          </p>
          <div className="profile-fields" style={{ gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Mail size={14} /> Correo electrónico (Gmail)
              </label>
              <input
                type="email"
                className="form-control"
                value={contacto.email}
                onChange={(e) => setContacto((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="contacto@electrixstudio.com"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Phone size={14} /> Número de celular / WhatsApp
              </label>
              <input
                type="text"
                className="form-control"
                value={contacto.telefono}
                onChange={(e) => setContacto((prev) => ({ ...prev, telefono: e.target.value }))}
                placeholder="+51 987 654 321"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Globe size={14} /> Página web
              </label>
              <input
                type="text"
                className="form-control"
                value={contacto.web}
                onChange={(e) => setContacto((prev) => ({ ...prev, web: e.target.value }))}
                placeholder="www.electrixstudio.com"
              />
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveContacto}
              disabled={savingContacto || !contactoChanged}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: savedContacto ? '#10b981' : undefined,
                borderColor: savedContacto ? '#10b981' : undefined,
              }}
            >
              {savingContacto ? (
                <>Guardando...</>
              ) : savedContacto ? (
                <><Check size={16} /> Guardado</>
              ) : (
                <><Save size={16} /> Guardar contacto PDF</>
              )}
            </button>
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
              <span className="profile-field-label">Nombre</span>
              <span>{cliente.nombre} {cliente.apellido}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Documento</span>
              <span>{cliente.documento || 'N/A'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Email</span>
              <span>{cliente.email || 'N/A'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Teléfono</span>
              <span>{cliente.telefono || 'N/A'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Dirección</span>
              <span>{cliente.direccion || 'N/A'}</span>
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
              <span className="profile-field-label">Empresa</span>
              <span>{cliente.empresa_distribuidora}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Tarifa (Tipo)</span>
              <span>{cliente.tarifa}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Tarifa kWh Actual</span>
              <span style={{ color: '#e11d48', fontWeight: 600 }}>
                {cliente.tarifa_kwh ? `S/ ${cliente.tarifa_kwh} por kWh` : 'Global (S/ 0.613)'}
              </span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Potencia</span>
              <span>{cliente.potencia_contratada}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Medidor</span>
              <span>{cliente.medidor}</span>
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
    </div>
  );
}

