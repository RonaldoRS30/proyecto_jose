import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Ghost } from 'lucide-react';
import ElectroForm from '../../components/ElectroForm';
import PageHeader from '../../components/PageHeader';
import ModuloResumen, { EQUIPO_TABLE_HEADERS, getEquipoListFields, renderEquipoDataCells } from '../../components/ModuloResumen';
import ServerPaginatedResponsiveList from '../../components/ServerPaginatedResponsiveList';
import { ListCard } from '../../components/ResponsiveList';
import { useCalculo } from '../../contexts/CalculoContext';
import { useConfirm, useAlert } from '../../contexts/ConfirmContext';
import { useServerElectrodomesticosList, PAGE_SIZE } from '../../hooks/useServerCalculosList';
import { useRecomendacionesCatalog } from '../../hooks/useRecomendacionesCatalog';
import {
  createElectrodomestico, updateElectrodomestico,
  deleteElectrodomestico,
} from '../../services/api';
import { saveElectrodomestico } from '../../utils/saveElectrodomestico';
import { CATEGORIAS_FANTASMA, TIPOS_STANDBY } from '../../utils/helpers';

const emptyForm = {
  nombre: '', categoria: 'Stand-by', marca: '', modelo: '',
  potencia_w: '', cantidad: 1, horas_uso_dia: 24, dias_uso_mes: 30,
  observaciones: '', modulo: 'fantasma', recomendacion_id: null,
};

export default function FantasmaPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const { modulos, refreshPreview, loading: calcLoading } = useCalculo();
  const {
    items, total, page, setPage, loading, reload,
  } = useServerElectrodomesticosList('fantasma');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { catalogo, reloadCatalog } = useRecomendacionesCatalog('fantasma', TIPOS_STANDBY);

  const moduloData = modulos.fantasma;
  const totales = moduloData?.totales;
  const detalles = moduloData?.detalles || [];
  const getCalc = (id) => detalles.find((d) => d.id === id);

  useEffect(() => { refreshPreview(); }, [refreshPreview]);

  const afterMutation = async () => {
    await refreshPreview();
    reload({ resetPage: true });
    reloadCatalog();
  };

  const openCreate = () => {
    reloadCatalog();
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (item) => { setEditId(item.id); setForm({ ...item }); setModalOpen(true); };

  const handleSubmit = async () => {
    const payload = { ...form, modulo: 'fantasma' };
    const ok = await saveElectrodomestico({
      editId,
      payload,
      createElectrodomestico,
      updateElectrodomestico,
      alert,
    });
    if (!ok) {
      reload({ resetPage: true });
      reloadCatalog();
      return;
    }
    setModalOpen(false);
    await afterMutation();
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar consumo fantasma',
      message: '¿Desea eliminar este registro de consumo en stand-by?',
      detail: 'Se quitará del cálculo mensual. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteElectrodomestico(id);
    if (items.length === 1 && page > 1) setPage(page - 1);
    else reload();
    await refreshPreview();
  };

  const renderActions = (item) => (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>
        <Edit size={14} /> Editar
      </button>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
        <Trash2 size={14} /> Eliminar
      </button>
    </>
  );

  if (calcLoading && !moduloData) return <div className="loading">Cargando datos...</div>;

  return (
    <div>
      <PageHeader
        title="Consumo Fantasma"
        subtitle="Stand-by — datos vinculados al cálculo global"
        action={{ label: 'Agregar', icon: Plus, onClick: openCreate }}
      />

      <ModuloResumen totales={totales} color="#f59e0b" Icon={Ghost} />

      <div className="card">
        <ServerPaginatedResponsiveList
          loading={loading}
          empty={!loading && total === 0}
          emptyMessage="No hay dispositivos stand-by"
          emptyIcon={Ghost}
          items={items}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="registros"
          tableHead={
            <tr>
              <th>Dispositivo</th><th>Potencia</th><th>Cant.</th><th>Horas/día</th>
              {EQUIPO_TABLE_HEADERS}<th>Acciones</th>
            </tr>
          }
          renderTableRow={(item) => {
            const calc = getCalc(item.id);
            return (
              <tr key={item.id}>
                <td>{item.nombre}</td>
                <td>{item.potencia_w} W</td>
                <td>{item.cantidad}</td>
                <td>{item.horas_uso_dia}h</td>
                {renderEquipoDataCells(calc)}
                <td className="actions">{renderActions(item)}</td>
              </tr>
            );
          }}
          renderCard={(item) => {
            const calc = getCalc(item.id);
            return (
              <ListCard
                title={item.nombre}
                badge={<span className="badge badge-warning">Stand-by</span>}
                fields={[
                  { label: 'Potencia', value: `${item.potencia_w} W` },
                  { label: 'Cantidad', value: item.cantidad },
                  { label: 'Horas/día', value: `${item.horas_uso_dia}h` },
                  ...getEquipoListFields(calc),
                ]}
                actions={renderActions(item)}
              />
            );
          }}
        />
      </div>

      <ElectroForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        form={form}
        setForm={setForm}
        editId={editId}
        categorias={CATEGORIAS_FANTASMA}
        modulo="fantasma"
        tiposPreset={catalogo}
        catalogLabel="Catálogo stand-by"
      />
    </div>
  );
}
