export const RECIBO_ACCEPT = 'application/pdf,image/jpeg,image/jpg,image/png,.pdf,.jpg,.jpeg,.png';

export function isReciboFileAllowed(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (type === 'application/pdf' || name.endsWith('.pdf')) return true;
  if (type === 'image/jpeg' || type === 'image/jpg' || /\.jpe?g$/i.test(name)) return true;
  if (type === 'image/png' || name.endsWith('.png')) return true;
  return false;
}
