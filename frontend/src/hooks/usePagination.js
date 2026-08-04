import { useEffect, useMemo, useState } from 'react';

export function usePagination(items = [], pageSize = 8) {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const goToPage = (next) => {
    setPage(Math.min(Math.max(1, next), totalPages));
  };

  return {
    page,
    setPage: goToPage,
    totalPages,
    paginatedItems,
    total,
    pageSize,
    hasPagination: totalPages > 1,
  };
}
