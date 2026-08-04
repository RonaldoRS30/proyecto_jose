import { useEffect, useState } from 'react';
import { Save, Lock } from 'lucide-react';
import { getConfiguraciones, updateConfiguracion, changeAdminPassword } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/ConfirmContext';

export default function ConfigPage() {
  const { user } = useAuth();
  const alert = useAlert();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    passwordActual: '',
    passwordNueva: '',
    passwordConfirmacion: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    getConfiguraciones()
      .then(({ data }) => setConfigs(data.data))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (clave, valor) => {
    await updateConfiguracion(clave, valor);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateLocal = (clave, valor) => {
    setConfigs((prev) => prev.map((c) => (c.clave === clave ? { ...c, valor } : c)));
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
          value={c.valor}
          onChange={(e) => updateLocal(c.clave, e.target.value)}
        />
        {c.clave === 'umbral_alerta_consumo_pct' && (
          <small style={{ color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
            Ejemplo: 30 = alerta si el último cálculo supera 130% del consumo promedio del sistema.
          </small>
        )}
      </div>
      <button type="button" className="btn btn-primary" onClick={() => handleSave(c.clave, c.valor)}>
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
