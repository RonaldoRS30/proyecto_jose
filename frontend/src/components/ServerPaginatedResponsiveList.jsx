import { useEffect, useRef } from 'react';
import ResponsiveList from './ResponsiveList';
import Pagination from './Pagination';

export default function ServerPaginatedResponsiveList({
  items = [],
  page = 1,
  total = 0,
  pageSize = 8,
  onPageChange,
  label = 'registros',
  tableClassName = '',
  ...listProps
}) {
  const listRef = useRef(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [page]);

  return (
    <>
      <div ref={listRef}>
        <ResponsiveList {...listProps} items={items} tableClassName={tableClassName} />
      </div>
      {total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          label={label}
        />
      )}
    </>
  );
}
