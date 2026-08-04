import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Lightbulb } from 'lucide-react';
import ElectroForm from '../../components/ElectroForm';
import PageHeader from '../../components/PageHeader';
import ModuloResumen, { EQUIPO_TABLE_HEADERS, getEquipoListFields, renderEquipoDataCells } from '../../components/ModuloResumen';
import ServerPaginatedResponsiveList from '../../components/ServerPaginatedResponsiveList';
import { ListCard } from '../../components/ResponsiveList';
import { useCalculo } from '../../contexts/CalculoContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useServerElectrodomesticosList, PAGE_SIZE } from '../../hooks/useServerCalculosList';
import { useRecomendacionesCatalog } from '../../hooks/useRecomendacionesCatalog';
import {
  createElectrodomestico, updateElectrodomestico,
  deleteElectrodomestico,
} from '../../services/api';
import { CATEGORIAS_ILUMINACION, TIPOS_LUMINARIA } from '../../utils/helpers';

const emptyForm = {
  nombre: '', categoria: 'LED', marca: '', modelo: '',
  potencia_w: '', cantidad: 1, horas_uso_dia: 6, dias_uso_mes: 30,
  observaciones: '', modulo: 'iluminacion', recomendacion_id: null,
};

export default function IluminacionPage() {
  const confirm = useConfirm();
  const { modulos, refreshPreview, loading: calcLoading } = useCalculo();
  const {
    items, total, page, setPage, loading, reload,
  } = useServerElectrodomesticosList('iluminacion');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const catalogo = useRecomendacionesCatalog('iluminacion', TIPOS_LUMINARIA);

  const moduloData = modulos.iluminacion;
  const totales = moduloData?.totales;
  const detalles = moduloData?.detalles || [];
  const getCalc = (id) => detalles.find((d) => d.id === id);

  useEffect(() => { refreshPreview(); }, [refreshPreview]);

  const afterMutation = async () => {
    await refreshPreview();
    reload();
  };

  const openCreate = () => { setEditId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (item) => { setEditId(item.id); setForm({ ...item }); setModalOpen(true); };

  const handleSubmit = async () => {
    const payload = { ...form, modulo: 'iluminacion' };
    if (editId) await updateElectrodomestico(editId, payload);
    else await createElectrodomestico(payload);
    setModalOpen(false);
    await afterMutation();
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar luminaria',
      message: '¿Desea eliminar esta luminaria del registro?',
      detail: 'Se quitará del cálculo de iluminación. Esta acción no se puede deshacer.',
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
        title="Iluminación"
        subtitle="Iluminación — datos vinculados al cálculo global"
        action={{ label: 'Agregar', icon: Plus, onClick: openCreate }}
      />

      <ModuloResumen totales={totales} color="#10b981" Icon={Lightbulb} />

      <div className="card">
        <ServerPaginatedResponsiveList
          loading={loading}
          empty={!loading && total === 0}
          emptyMessage="No hay luminarias registradas"
          emptyIcon={Lightbulb}
          items={items}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="luminarias"
          tableHead={
            <tr>
              <th>Luminaria</th><th>Categoría</th><th>Potencia</th><th>Cant.</th>
              <th>Horas/día</th>{EQUIPO_TABLE_HEADERS}<th>Acciones</th>
            </tr>
          }
          renderTableRow={(item) => {
            const calc = getCalc(item.id);
            return (
              <tr key={item.id}>
                <td>{item.nombre}</td>
                <td><span className="badge badge-success">{item.categoria}</span></td>
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
                badge={<span className="badge badge-success">{item.categoria}</span>}
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
        categorias={CATEGORIAS_ILUMINACION}
        modulo="iluminacion"
        tiposPreset={catalogo}
        catalogLabel="Catálogo de luminarias"
      />
    </div>
  );
}
