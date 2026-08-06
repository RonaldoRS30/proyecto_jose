export function normalizeTarifaValue(val) {
  if (val === null || val === undefined || val === '') return '';
  const n = parseFloat(val);
  return Number.isNaN(n) ? String(val) : String(n);
}

export function tarifaValuesDiffer(saved, current) {
  return normalizeTarifaValue(saved) !== normalizeTarifaValue(current);
}
