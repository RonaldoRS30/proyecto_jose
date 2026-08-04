import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminLogin, clienteLogin } from '../../services/api';

export default function LoginPage() {
  const [tab, setTab] = useState('cliente');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
      navigate('/cliente');
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo-electrixstudio.png" alt="ElectrixStudio" />
          <h1>Sistema de Consumo Eléctrico</h1>
          <p>Análisis energético profesional</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'cliente' ? 'active' : ''}`}
            onClick={() => { setTab('cliente'); setError(''); }}
          >
            <KeyRound size={14} style={{ marginRight: 4 }} /> Cliente
          </button>
          <button
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
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Validando...' : 'Ingresar'}
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
              Ingrese el código entregado por el administrador tras realizar el pago.
            </p>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sistema.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input
                className="form-control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
