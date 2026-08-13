import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  page = 1,
  totalPages = 1,
  total = 0,
  pageSize = 8,
  onPageChange,
  label = 'registros',
}) {
  if (total <= 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasMultiplePages = totalPages > 1;

  return (
    <div className="pagination">
      <span className="pagination-info">
        Mostrando <strong>{from}-{to}</strong> de <strong>{total}</strong> {label}
        {hasMultiplePages && (
          <> · Página <strong>{page}</strong> de <strong>{totalPages}</strong></>
        )}
      </span>
      {hasMultiplePages && (
        <div className="pagination-controls">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
            <span className="pagination-btn-label">Anterior</span>
          </button>
          <span className="pagination-page" aria-current="page">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Página siguiente"
          >
            <span className="pagination-btn-label">Siguiente</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
