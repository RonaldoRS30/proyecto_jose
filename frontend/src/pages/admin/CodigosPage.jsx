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
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getCodigos();
      setCodigos(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);


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


      <div className="card">
        <PaginatedResponsiveList
          loading={loading}
          empty={!loading && codigos.length === 0}
          emptyMessage="No hay códigos generados"
          emptyIcon={Key}
          items={codigos}
          pageSize={10}
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
