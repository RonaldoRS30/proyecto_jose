import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound, ChevronRight } from 'lucide-react';
import AuthBackground from '../../components/AuthBackground';
import AuthServicesPanel from '../../components/AuthServicesPanel';
import { useAuth } from '../../contexts/AuthContext';
import { adminLogin, clienteLogin } from '../../services/api';

const MOBILE_AUTH_MQ = '(max-width: 900px)';

function useMobileAuthIntro() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_AUTH_MQ).matches,
  );
  const [loginVisible, setLoginVisible] = useState(
    () => typeof window === 'undefined' || !window.matchMedia(MOBILE_AUTH_MQ).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_AUTH_MQ);
    const sync = (mobile) => {
      setIsMobile(mobile);
      if (!mobile) setLoginVisible(true);
    };
    sync(mq.matches);
    const onChange = (e) => sync(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return { isMobile, loginVisible, showLogin: () => setLoginVisible(true) };
}

export default function LoginPage() {
  const [tab, setTab] = useState('cliente');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { isMobile, loginVisible, showLogin } = useMobileAuthIntro();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await adminLogin(email, password);
      login(data.data.token, { ...data.data.admin, role: 'admin' });
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleClienteLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await clienteLogin(codigo.toUpperCase());
      login(data.data.token, { ...data.data.cliente, role: 'cliente' });
      await Promise.all([
        import('../../layouts/ClientLayout'),
        import('../../pages/client/ClientDashboard'),
      ]).catch(() => {});
      navigate('/cliente');
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthBackground />

      <div className={`auth-layout ${loginVisible ? 'auth-layout--login-visible' : 'auth-layout--intro'}`}>
        <AuthServicesPanel introActive={isMobile && !loginVisible} />

        {isMobile && !loginVisible && (
          <button
            type="button"
            className="auth-intro-cta"
            onClick={showLogin}
          >
            Acceder al sistema
            <ChevronRight size={18} />
          </button>
        )}

        <div className="auth-card">
        <div className="auth-logo">
          <img src={`${import.meta.env.BASE_URL}logo-electrixstudio.png`} alt="ElectrixStudio" />
          <h1>Sistema de Consumo Eléctrico</h1>
          <p>Análisis energético profesional</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'cliente' ? 'active' : ''}`}
            onClick={() => { setTab('cliente'); setError(''); }}
          >
            <KeyRound size={14} style={{ marginRight: 4 }} /> Cliente
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'admin' ? 'active' : ''}`}
            onClick={() => { setTab('admin'); setError(''); }}
          >
            <Shield size={14} style={{ marginRight: 4 }} /> Administrador
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {tab === 'cliente' ? (
          <form onSubmit={handleClienteLogin}>
            <div className="form-group">
              <label>Código de Acceso</label>
              <input
                className="form-control"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ingrese su código único"
                required
                maxLength={12}
                autoComplete="off"
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Entrando...' : 'Ingresar'}
            </button>
            <p className="auth-form-hint">
              Ingrese el código entregado por el administrador tras realizar el pago.
            </p>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} autoComplete="off">
            <div className="form-group">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                className="form-control auth-input"
                type="email"
                name="admin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingrese su correo"
                required
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label htmlFor="admin-password">Contraseña</label>
              <input
                id="admin-password"
                className="form-control auth-input"
                type="password"
                name="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                required
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
