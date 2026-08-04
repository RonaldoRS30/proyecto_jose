import { useEffect, useRef } from 'react';
import ResponsiveList from './ResponsiveList';
import Pagination from './Pagination';
import { usePagination } from '../hooks/usePagination';

export default function PaginatedResponsiveList({
  items = [],
  pageSize = 8,
  label = 'registros',
  ...listProps
}) {
  const listRef = useRef(null);
  const {
    page, setPage, totalPages, paginatedItems, total, pageSize: size, hasPagination,
  } = usePagination(items, pageSize);

  useEffect(() => {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [page]);

  return (
    <>
      <div ref={listRef}>
        <ResponsiveList {...listProps} items={paginatedItems} />
      </div>
      {hasPagination && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={size}
          onPageChange={setPage}
          label={label}
        />
      )}
    </>
  );
}
