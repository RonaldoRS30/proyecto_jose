import { useEffect, useState } from 'react';
import { User, Building, Zap } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { getMiPerfil } from '../../services/api';

export default function PerfilPage() {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMiPerfil()
      .then(({ data }) => setCliente(data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando perfil...</div>;
  if (!cliente) return <div className="empty-state">No se pudo cargar el perfil</div>;

  return (
    <div>
      <PageHeader title="Mi Perfil" subtitle="Información de su cuenta" />

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
              <span className="profile-field-label">Tarifa Personalizada (S/)</span>
              <span>{cliente.tarifa_kwh ? `S/ ${cliente.tarifa_kwh} por kWh` : 'No asignada (Usa global)'}</span>
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
