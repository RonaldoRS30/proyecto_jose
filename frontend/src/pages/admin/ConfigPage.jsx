import { useEffect, useState } from 'react';
import {
  Save, Lock, Receipt, Share2, UserCircle,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import DashboardTabs from '../../components/DashboardTabs';
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

const LABELS = {
  precio_kwh: 'Precio kWh (S/)',
  cargo_fijo: 'Cargo Fijo (S/)',
  mant_reposicion: 'Mant. y Reposición (S/)',
  alumbrado_publico: 'Alumbrado Público (S/)',
  interes_compensatorio: 'Interés Compensatorio (S/)',
  igv_rate: 'IGV (decimal, ej: 0.18)',
  electrificacion_rural: 'Electrificación Rural (S/)',
};

const TARIFA_KEYS = [
  'precio_kwh', 'cargo_fijo', 'mant_reposicion', 'alumbrado_publico',
  'interes_compensatorio', 'igv_rate', 'electrificacion_rural',
];

const TABS = [
  { id: 'tarifas', label: 'Tarifas', icon: Receipt },
  { id: 'contacto', label: 'Contacto y PDF', icon: Share2 },
  { id: 'cuenta', label: 'Mi cuenta', icon: UserCircle },
];

export default function ConfigPage() {
  const { user } = useAuth();
  const alert = useAlert();
  const [activeTab, setActiveTab] = useState('tarifas');
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
  }, [alert]);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = async (clave, valor) => {
    try {
      await updateConfiguracion(clave, valor);
      flashSaved();
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
      flashSaved();
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

  const renderConfigRow = (c, compact = false) => (
    <div key={c.clave} className={`config-field-row ${compact ? 'config-field-row--compact' : ''}`}>
      <div className="form-group config-field-row__input">
        <label>{LABELS[c.clave] || c.clave}</label>
        <input
          className="form-control"
          value={c.valor ?? ''}
          onChange={(e) => updateLocal(c.clave, e.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm config-field-row__save"
        onClick={() => handleSave(c.clave, c.valor ?? '')}
      >
        <Save size={15} /> Guardar
      </button>
    </div>
  );

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="config-page">
      <PageHeader
        title="Configuración"
        subtitle="Parámetros del sistema organizados por sección"
      />

      {saved && (
        <div className="alert alert-success config-page__flash">Configuración guardada</div>
      )}

      <DashboardTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

      <div className="config-panel card" role="tabpanel">
        {activeTab === 'tarifas' && (
          <div className="config-panel__body">
            <p className="config-panel__intro">
              Valores de tarifa y facturación del sistema.
            </p>
            <div className="config-fields-grid">
              {configs.filter((c) => TARIFA_KEYS.includes(c.clave)).map((c) => renderConfigRow(c, true))}
            </div>
          </div>
        )}

        {activeTab === 'contacto' && (
          <div className="config-panel__body">
            <p className="config-panel__intro">
              Datos visibles en el login, publicidad y pie de página de los PDF.
            </p>

            <div className="contact-config-grid config-contact-grid">
              <div className="form-group">
                <label>Nombre de la empresa</label>
                <input
                  className="form-control"
                  value={contacto.empresaNombre}
                  onChange={(e) => setContacto((p) => ({ ...p, empresaNombre: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Eslogan</label>
                <input
                  className="form-control"
                  value={contacto.empresaTagline}
                  onChange={(e) => setContacto((p) => ({ ...p, empresaTagline: e.target.value }))}
                />
              </div>
              <div className="form-group">
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
                <small className={`config-field-hint ${contactoErrors.email ? 'is-error' : ''}`}>
                  {contactoErrors.email || 'Debe contener @'}
                </small>
              </div>
              <div className="form-group">
                <label>Nombre visible — correo</label>
                <input
                  className="form-control"
                  value={contacto.emailNombre}
                  onChange={(e) => setContacto((p) => ({ ...p, emailNombre: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <div className="form-group">
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
                <small className={`config-field-hint ${contactoErrors.telefono ? 'is-error' : ''}`}>
                  {contactoErrors.telefono || '9 dígitos — +51 XXX XXX XXX'}
                </small>
              </div>
              <div className="form-group">
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
                <small className={`config-field-hint ${contactoErrors.web ? 'is-error' : ''}`}>
                  {contactoErrors.web || 'Debe incluir .com'}
                </small>
              </div>
              <div className="form-group config-contact-grid__full">
                <label>Nombre visible — sitio web</label>
                <input
                  className="form-control"
                  value={contacto.webNombre}
                  onChange={(e) => setContacto((p) => ({ ...p, webNombre: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="config-social-section">
              <h4 className="config-social-section__title">Redes sociales</h4>
              <div className="config-social-cards">
                {SOCIAL_NETWORKS.map(({ id, label, logo }) => (
                  <div key={id} className="config-social-card">
                    <div className="config-social-card__head">
                      <img
                        src={contactLogoUrl(id, iconBase)}
                        alt=""
                        width={22}
                        height={22}
                      />
                      <span>{label}</span>
                    </div>
                    <div className="form-group">
                      <label>Nombre visible</label>
                      <input
                        className="form-control"
                        value={contacto.social[id].nombre}
                        onChange={(e) => updateSocial(id, 'nombre', e.target.value)}
                        placeholder="@electrixstudio"
                      />
                    </div>
                    <div className="form-group">
                      <label>Enlace (URL)</label>
                      <input
                        className="form-control"
                        value={contacto.social[id].url}
                        onChange={(e) => updateSocial(id, 'url', e.target.value)}
                        placeholder={id === 'whatsapp' ? 'https://wa.me/519...' : `https://${id}.com/...`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="config-panel__actions">
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
        )}

        {activeTab === 'cuenta' && (
          <div className="config-panel__body config-panel__body--narrow">
            <p className="config-panel__intro">
              Sesión activa: <strong>{user?.email}</strong>
            </p>
            <form className="config-password-form" onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label>Contraseña actual</label>
                <input
                  className="form-control"
                  type="password"
                  value={passwordForm.passwordActual}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, passwordActual: e.target.value }))}
                  placeholder="Contraseña actual"
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="config-password-grid">
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
                  <label>Confirmar contraseña</label>
                  <input
                    className="form-control"
                    type="password"
                    value={passwordForm.passwordConfirmacion}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, passwordConfirmacion: e.target.value }))}
                    placeholder="Repita la contraseña"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={changingPassword}>
                <Lock size={16} /> {changingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
