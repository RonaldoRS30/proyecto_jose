import ListCard from './ListCard';

export default function ResponsiveList({
  loading = false,
  empty = false,
  emptyMessage = 'Sin registros',
  emptyIcon: EmptyIcon,
  items = [],
  tableHead,
  renderTableRow,
  renderCard,
  tableOnly = false,
  mobileGridClass = 'data-cards-grid',
  tableClassName = '',
}) {
  if (loading) return <div className="loading">Cargando...</div>;

  if (empty) {
    return (
      <div className="empty-state">
        {EmptyIcon && <EmptyIcon size={48} />}
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {!tableOnly && renderCard && (
        <div className={`view-mobile ${mobileGridClass}`}>
          {items.map((item, index) => renderCard(item, index))}
        </div>
      )}

      <div className={`view-desktop ${tableOnly ? 'table-only' : ''}`}>
        {!tableOnly && (
          <p className="table-scroll-hint">Desliza horizontalmente para ver más columnas</p>
        )}
        <div className="table-mobile-scroll table-dual-scroll">
          <table className={tableClassName || 'data-table'}>
            <thead>{tableHead}</thead>
            <tbody>{items.map((item, index) => renderTableRow(item, index))}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export { ListCard };
