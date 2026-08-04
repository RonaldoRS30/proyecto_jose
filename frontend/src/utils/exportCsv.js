/**
 * Exporta filas a CSV compatible con Excel (UTF-8 BOM).
 */
export function exportToCsv(filename, headers, rows) {
  const escape = (value) => {
    const str = value == null ? '' : String(value);
    if (/[",;\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const lines = [
    headers.map(escape).join(';'),
    ...rows.map((row) => row.map(escape).join(';')),
  ];

  const blob = new Blob(['\uFEFF', lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function formatCsvDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
