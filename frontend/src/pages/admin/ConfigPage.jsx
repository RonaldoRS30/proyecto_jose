import { useEffect, useState } from 'react';
import { Save, Lock } from 'lucide-react';
import {
  getConfiguraciones,
  updateConfiguracion,
  getContactoPdfConfig,
  updateContactoPdfConfig,
  changeAdminPassword,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/ConfirmContext';
import { validateContactoFields, formatTelefonoInput } from '../../utils/contactoValidation';
import { mapContactoFromApi, SOCIAL_NETWORKS, contactLogoUrl } from '../../utils/contactLinks';

const EMPTY_CONTACTO = {
  email: '',
  telefono: '',
  web: '',
  emailNombre: '',
  webNombre: '',
  empresaNombre: '',
  empresaTagline: '',
  social: {
    instagram: { url: '', nombre: 'Instagram' },
    facebook: { url: '', nombre: 'Facebook' },
    tiktok: { url: '', nombre: 'TikTok' },
    whatsapp: { url: '', nombre: 'WhatsApp' },
  },
};

const iconBase = import.meta.env.BASE_URL || '/';

export default function ConfigPage() {
  const { user } = useAuth();
  const alert = useAlert();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [contacto, setContacto] = useState(EMPTY_CONTACTO);
  const [contactoErrors, setContactoErrors] = useState({});
  const [savingContacto, setSavingContacto] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    passwordActual: '',
    passwordNueva: '',
    passwordConfirmacion: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    Promise.all([
      getConfiguraciones().then(({ data }) => setConfigs(data.data)),
      getContactoPdfConfig().then(({ data }) => {
        setContacto(mapContactoFromApi(data.data));
      }),
    ])
      .catch(async (err) => {
        await alert({
          title: 'Error al cargar configuración',
          message: err.response?.data?.message || 'No se pudo cargar la configuración del sistema.',
          variant: 'error',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (clave, valor) => {
    try {
      await updateConfiguracion(clave, valor);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      await alert({
        title: 'No se pudo guardar',
        message: err.response?.data?.message || 'Ocurrió un error al guardar la configuración.',
        variant: 'error',
      });
    }
  };

  const handleSaveContacto = async () => {
    const validation = validateContactoFields(contacto);
    if (!validation.ok) {
      setContactoErrors(validation.errors);
      await alert({
        title: 'Datos incompletos',
        message: Object.values(validation.errors).join('. '),
        variant: 'warning',
      });
      return;
    }

    setContactoErrors({});
    setSavingContacto(true);
    try {
      const payload = { ...contacto, ...validation.data };
      const { data } = await updateContactoPdfConfig(payload);
      setContacto(mapContactoFromApi(data.data));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await alert({
        title: 'Contacto guardado',
        message: 'Los datos de contacto y redes sociales se actualizaron correctamente.',
        variant: 'success',
      });
    } catch (err) {
      await alert({
        title: 'No se pudo guardar',
        message: err.response?.data?.message || 'Verifique los campos obligatorios e intente de nuevo.',
        variant: 'error',
      });
    } finally {
      setSavingContacto(false);
    }
  };

  const updateLocal = (clave, valor) => {
    setConfigs((prev) => prev.map((c) => (c.clave === clave ? { ...c, valor } : c)));
  };

  const updateSocial = (network, field, value) => {
    setContacto((prev) => ({
      ...prev,
      social: {
        ...prev.social,
        [network]: { ...prev.social[network], [field]: value },
      },
    }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordForm.passwordNueva !== passwordForm.passwordConfirmacion) {
      await alert({
        title: 'Contraseñas no coinciden',
        message: 'La nueva contraseña y su confirmación deben ser iguales.',
        variant: 'warning',
      });
      return;
    }

    if (passwordForm.passwordNueva.length < 8) {
      await alert({
        title: 'Contraseña muy corta',
        message: 'La nueva contraseña debe tener al menos 8 caracteres.',
        variant: 'warning',
      });
      return;
    }

    setChangingPassword(true);
    try {
      await changeAdminPassword(passwordForm.passwordActual, passwordForm.passwordNueva);
      setPasswordForm({ passwordActual: '', passwordNueva: '', passwordConfirmacion: '' });
      await alert({
        title: 'Contraseña actualizada',
        message: 'Su contraseña de administrador se cambió correctamente.',
        variant: 'success',
      });
    } catch (err) {
      await alert({
        title: 'No se pudo cambiar la contraseña',
        message: err.response?.data?.message || 'Ocurrió un error al actualizar la contraseña.',
        variant: 'error',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div className="loading">Cargando...</div>;

  const labels = {
    precio_kwh: 'Precio kWh (S/)',
    cargo_fijo: 'Cargo Fijo (S/)',
    mant_reposicion: 'Mant. y Reposición (S/)',
    alumbrado_publico: 'Alumbrado Público (S/)',
    interes_compensatorio: 'Interés Compensatorio (S/)',
    igv_rate: 'IGV (decimal, ej: 0.18)',
    electrificacion_rural: 'Electrificación Rural (S/)',
    umbral_alerta_consumo_pct: 'Alerta consumo alto (% sobre promedio)',
  };

  const tarifaKeys = [
    'precio_kwh', 'cargo_fijo', 'mant_reposicion', 'alumbrado_publico',
    'interes_compensatorio', 'igv_rate', 'electrificacion_rural',
  ];
  const alertaKeys = ['umbral_alerta_consumo_pct'];

  const renderConfigRow = (c) => (
    <div key={c.clave} className="form-row" style={{ alignItems: 'flex-end', marginBottom: '1rem' }}>
      <div className="form-group" style={{ margin: 0, flex: 1 }}>
        <label>{labels[c.clave] || c.clave}</label>
        <input
          className="form-control"
          value={c.valor ?? ''}
          onChange={(e) => updateLocal(c.clave, e.target.value)}
        />
        {c.clave === 'umbral_alerta_consumo_pct' && (
          <small style={{ color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
            Ejemplo: 30 = alerta si el último cálculo supera 130% del consumo promedio del sistema.
          </small>
        )}
      </div>
      <button type="button" className="btn btn-primary" onClick={() => handleSave(c.clave, c.valor ?? '')}>
        <Save size={16} /> Guardar
      </button>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración del Sistema</h1>
          <p className="page-subtitle">Parámetros de tarifa y facturación (según Excel)</p>
        </div>
      </div>

      {saved && <div className="alert alert-success">Configuración guardada</div>}

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header"><h3>Tarifas y Facturación</h3></div>
        <div className="card-body">
          {configs.filter((c) => tarifaKeys.includes(c.clave)).map(renderConfigRow)}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Alertas administrativas</h3></div>
        <div className="card-body">
          {configs.filter((c) => alertaKeys.includes(c.clave)).map(renderConfigRow)}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        <div className="card-header"><h3>Contacto, publicidad y reportes PDF</h3></div>
        <div className="card-body">
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Estos datos aparecen en el login (publicidad), en el pie de página de los PDF y también
            son editables desde Mi Perfil (cliente).
          </p>

          <div className="contact-config-grid">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Nombre de la empresa</label>
              <input
                className="form-control"
                value={contacto.empresaNombre}
                onChange={(e) => setContacto((p) => ({ ...p, empresaNombre: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Eslogan</label>
              <input
                className="form-control"
                value={contacto.empresaTagline}
                onChange={(e) => setContacto((p) => ({ ...p, empresaTagline: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Correo *</label>
              <input
                className="form-control"
                type="email"
                value={contacto.email}
                onChange={(e) => {
                  setContacto((p) => ({ ...p, email: e.target.value }));
                  if (contactoErrors.email) setContactoErrors((p) => ({ ...p, email: '' }));
                }}
                placeholder="contacto@electrixstudio.com"
              />
              <small style={{ color: contactoErrors.email ? '#ef4444' : 'var(--text-muted)', fontSize: '0.75rem' }}>
                {contactoErrors.email || 'Debe contener @'}
              </small>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Nombre visible — icono correo</label>
              <input
                className="form-control"
                value={contacto.emailNombre}
                onChange={(e) => setContacto((p) => ({ ...p, emailNombre: e.target.value }))}
                placeholder="Opcional — si está vacío usa el correo"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Teléfono *</label>
              <input
                className="form-control"
                inputMode="numeric"
                maxLength={9}
                value={contacto.telefono}
                onChange={(e) => {
                  setContacto((p) => ({ ...p, telefono: formatTelefonoInput(e.target.value) }));
                  if (contactoErrors.telefono) setContactoErrors((p) => ({ ...p, telefono: '' }));
                }}
                placeholder="987654321"
              />
              <small style={{ color: contactoErrors.telefono ? '#ef4444' : 'var(--text-muted)', fontSize: '0.75rem' }}>
                {contactoErrors.telefono || '9 dígitos — se muestra como +51 XXX XXX XXX'}
              </small>
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
              <label>Sitio web *</label>
              <input
                className="form-control"
                value={contacto.web}
                onChange={(e) => {
                  setContacto((p) => ({ ...p, web: e.target.value }));
                  if (contactoErrors.web) setContactoErrors((p) => ({ ...p, web: '' }));
                }}
                placeholder="www.electrixstudio.com"
              />
              <small style={{ color: contactoErrors.web ? '#ef4444' : 'var(--text-muted)', fontSize: '0.75rem' }}>
                {contactoErrors.web || 'Debe incluir .com'}
              </small>
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
              <label>Nombre visible — icono página web</label>
              <input
                className="form-control"
                value={contacto.webNombre}
                onChange={(e) => setContacto((p) => ({ ...p, webNombre: e.target.value }))}
                placeholder="Opcional — si está vacío usa la URL del sitio"
              />
            </div>

            <div className="contact-config-social-block">
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Redes sociales</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                Correo, teléfono y web se muestran con iconos simples. Instagram, Facebook y TikTok
                usan sus logos con nombre visible en login y PDF.
              </p>
              {SOCIAL_NETWORKS.map(({ id, label, logo }) => (
                <div key={id} className="contact-config-social-row">
                  <div className="contact-config-social-label">
                    <img
                      src={contactLogoUrl(id, iconBase)}
                      alt=""
                      width={22}
                      height={22}
                      style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                    />
                    {label}
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Nombre visible</label>
                    <input
                      className="form-control"
                      value={contacto.social[id].nombre}
                      onChange={(e) => updateSocial(id, 'nombre', e.target.value)}
                      placeholder={`Ej: @electrixstudio`}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Enlace (URL)</label>
                    <input
                      className="form-control"
                      value={contacto.social[id].url}
                      onChange={(e) => updateSocial(id, 'url', e.target.value)}
                      placeholder={`https://${id}.com/...`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveContacto}
              disabled={savingContacto}
            >
              <Save size={16} />
              {savingContacto ? 'Guardando...' : 'Guardar contacto y redes'}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.25rem' }}>
        <div className="card-header"><h3>Cuenta de administrador</h3></div>
        <div className="card-body">
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            Sesión activa: <strong>{user?.email}</strong>
          </p>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label>Contraseña actual</label>
              <input
                className="form-control"
                type="password"
                value={passwordForm.passwordActual}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, passwordActual: e.target.value }))}
                placeholder="Ingrese su contraseña actual"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label>Nueva contraseña</label>
              <input
                className="form-control"
                type="password"
                value={passwordForm.passwordNueva}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, passwordNueva: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label>Confirmar nueva contraseña</label>
              <input
                className="form-control"
                type="password"
                value={passwordForm.passwordConfirmacion}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, passwordConfirmacion: e.target.value }))}
                placeholder="Repita la nueva contraseña"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={changingPassword}>
              <Lock size={16} /> {changingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
