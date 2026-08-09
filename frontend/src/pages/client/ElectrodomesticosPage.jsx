import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Plug } from 'lucide-react';
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
import { CATEGORIAS_APARATO, formatCurrency } from '../../utils/helpers';

const emptyForm = {
  nombre: '', categoria: 'Cocina', marca: '', modelo: '',
  potencia_w: '', cantidad: 1, horas_uso_dia: '', dias_uso_mes: 30,
  observaciones: '', modulo: 'aparato', recomendacion_id: null,
};

export default function ElectrodomesticosPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const { modulos, refreshPreview, loading: calcLoading } = useCalculo();
  const {
    items, total, page, setPage, loading, reload,
  } = useServerElectrodomesticosList('aparato');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { catalogo, reloadCatalog } = useRecomendacionesCatalog('aparato');

  useEffect(() => { refreshPreview(); }, [refreshPreview]);

  const afterMutation = async () => {
    await refreshPreview();
    reload({ resetPage: true });
    reloadCatalog();
  };

  const moduloData = modulos.aparatos;
  const totales = moduloData?.totales;
  const detalles = moduloData?.detalles || [];
  const getCalc = (id) => detalles.find((d) => d.id === id);

  const openCreate = () => {
    reloadCatalog();
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({ ...item, potencia_w: item.potencia_w, horas_uso_dia: item.horas_uso_dia });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { ...form, modulo: 'aparato' };
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
      title: 'Eliminar equipo',
      message: '¿Desea eliminar este equipo de la lista?',
      detail: 'Se quitará del cálculo de consumo. Esta acción no se puede deshacer.',
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
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(item)} aria-label="Editar">
        <Edit size={14} /> <span className="btn-text">Editar</span>
      </button>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)} aria-label="Eliminar">
        <Trash2 size={14} /> <span className="btn-text">Eliminar</span>
      </button>
    </>
  );

  if (calcLoading && !moduloData) return <div className="loading">Cargando datos...</div>;

  return (
    <div>
      <PageHeader
        title="Mis Electrodomésticos"
        subtitle="Estadísticas vinculadas al cálculo global del sistema"
        action={{ label: 'Agregar', icon: Plus, onClick: openCreate }}
      />

      <ModuloResumen totales={totales} color="#1A4AB0" Icon={Plug} />

      <div className="card card-list">
        <ServerPaginatedResponsiveList
          loading={loading}
          empty={!loading && total === 0}
          emptyMessage="No hay equipos registrados"
          emptyIcon={Plug}
          items={items}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="equipos"
          mobileGridClass="data-cards-single"
          tableHead={
            <tr>
              <th>Equipo</th><th>Categoría</th><th>Potencia</th><th>Cant.</th>
              <th>Horas/día</th>{EQUIPO_TABLE_HEADERS}<th>Acciones</th>
            </tr>
          }
          renderTableRow={(item) => {
            const calc = getCalc(item.id);
            return (
              <tr key={item.id}>
                <td><strong>{item.nombre}</strong><br /><small>{item.marca} {item.modelo}</small></td>
                <td><span className="badge badge-info">{item.categoria}</span></td>
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
            const calcFields = getEquipoListFields(calc).filter((f) => f.label !== 'Gasto/mes');
            return (
              <ListCard
                className="list-card-equipo"
                title={item.nombre}
                subtitle={[item.marca, item.modelo].filter(Boolean).join(' ') || null}
                badge={<span className="badge badge-info">{item.categoria}</span>}
                featured={calc
                  ? { label: 'Gasto mensual', value: formatCurrency(calc.gastoMensual) }
                  : { label: 'Gasto mensual', value: '-' }}
                fields={[
                  { label: 'Potencia', value: `${item.potencia_w} W` },
                  { label: 'Cantidad', value: item.cantidad },
                  { label: 'Horas/día', value: `${item.horas_uso_dia}h` },
                  ...calcFields,
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
        categorias={CATEGORIAS_APARATO}
        modulo="aparato"
        tiposPreset={catalogo}
        catalogLabel="Catálogo de equipos"
      />
    </div>
  );
}
