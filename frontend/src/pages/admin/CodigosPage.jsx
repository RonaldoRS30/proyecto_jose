import { useEffect, useState } from 'react';
import { Key, Copy, Power } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import PaginatedResponsiveList from '../../components/PaginatedResponsiveList';
import { ListCard } from '../../components/ResponsiveList';
import SearchableSelect from '../../components/SearchableSelect';
import { useAlert } from '../../contexts/ConfirmContext';
import { getCodigos, generarCodigo, updateCodigo, getClientes } from '../../services/api';
import { formatDate } from '../../utils/helpers';

export default function CodigosPage() {
  const alert = useAlert();
  const [codigos, setCodigos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [codRes, cliRes] = await Promise.all([
        getCodigos(),
        getClientes({ limit: 100 }),
      ]);
      setCodigos(codRes.data.data);
      setClientes(cliRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerar = async () => {
    if (!clienteId) {
      await alert({
        title: 'Cliente requerido',
        message: 'Seleccione un cliente antes de generar el código.',
        variant: 'warning',
      });
      return;
    }
    try {
      await generarCodigo({ cliente_id: parseInt(clienteId) });
      setClienteId('');
      load();
    } catch (e) {
      await alert({
        title: 'No se puede generar',
        message: e.response?.data?.message || 'Este cliente ya tiene un código de acceso.',
        variant: 'warning',
      });
    }
  };

  const handleToggle = async (id, activo) => {
    await updateCodigo(id, { activo: !activo });
    load();
  };

  const copyCode = async (code) => {
    await navigator.clipboard.writeText(code);
    await alert({
      title: 'Código copiado',
      message: 'El código de acceso se copió al portapapeles.',
      variant: 'success',
    });
  };

  const clientesConCodigo = new Set(codigos.map((c) => c.cliente_id));
  const clientesSinCodigo = clientes.filter((c) => !clientesConCodigo.has(c.id));

  const clienteOptions = clientesSinCodigo.map((c) => ({
    value: String(c.id),
    label: `${c.nombre} ${c.apellido || ''}`.trim(),
  }));

  const clienteYaTieneCodigo = clienteId && clientesConCodigo.has(parseInt(clienteId, 10));

  const renderActions = (c) => (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyCode(c.codigo)}>
        <Copy size={14} /> Copiar
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleToggle(c.id, c.activo)}>
        <Power size={14} /> {c.activo ? 'Deshabilitar' : 'Habilitar'}
      </button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Códigos de Acceso"
        subtitle="Un código por cliente. Para cortar o restaurar el acceso use Habilitar/Deshabilitar."
      />

      <div className="card card-form-block">
        <div className="card-body generate-code-form">
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label>Cliente sin código</label>
            <SearchableSelect
              options={clienteOptions}
              value={clienteId}
              placeholder={
                clientesSinCodigo.length
                  ? 'Buscar cliente...'
                  : 'Todos los clientes ya tienen código'
              }
              onChange={(val) => setClienteId(val)}
              getOptionLabel={(o) => o.label}
              getOptionValue={(o) => o.value}
            />
            {clientesSinCodigo.length === 0 && !loading && (
              <p className="form-hint" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                No hay clientes pendientes de código. Al crear un cliente nuevo se genera automáticamente.
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary generate-code-btn"
            onClick={handleGenerar}
            disabled={!clienteId || clienteYaTieneCodigo || clientesSinCodigo.length === 0}
          >
            <Key size={16} /> Generar Código
          </button>
        </div>
      </div>

      <div className="card">
        <PaginatedResponsiveList
          loading={loading}
          empty={!loading && codigos.length === 0}
          emptyMessage="No hay códigos generados"
          emptyIcon={Key}
          items={codigos}
          label="códigos"
          tableHead={
            <tr>
              <th>Código</th><th>Cliente</th><th>Estado</th><th>Creado</th><th>Acciones</th>
            </tr>
          }
          renderTableRow={(c) => (
            <tr key={c.id}>
              <td><strong className="code-display">{c.codigo}</strong></td>
              <td>{c.cliente?.nombre} {c.cliente?.apellido}</td>
              <td>
                <span className={`badge ${c.activo ? 'badge-success' : 'badge-danger'}`}>
                  {c.activo ? 'Habilitado' : 'Deshabilitado'}
                </span>
              </td>
              <td>{formatDate(c.created_at)}</td>
              <td className="actions">{renderActions(c)}</td>
            </tr>
          )}
          renderCard={(c) => (
            <ListCard
              title={<span className="code-display">{c.codigo}</span>}
              subtitle={`${c.cliente?.nombre || ''} ${c.cliente?.apellido || ''}`.trim()}
              badge={
                <span className={`badge ${c.activo ? 'badge-success' : 'badge-danger'}`}>
                  {c.activo ? 'Habilitado' : 'Deshabilitado'}
                </span>
              }
              fields={[
                { label: 'Creado', value: formatDate(c.created_at) },
              ]}
              actions={renderActions(c)}
            />
          )}
        />
      </div>
    </div>
  );
}
