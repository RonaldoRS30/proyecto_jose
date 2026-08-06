export const RECIBO_ACCEPT =
  'application/pdf,image/jpeg,image/jpg,image/pjpeg,image/jfif,image/png,.pdf,.jpg,.jpeg,.png';

export function isReciboFileAllowed(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase().split(';')[0].trim();
  if (type === 'application/pdf' || name.endsWith('.pdf')) return true;
  if (
    type === 'image/jpeg'
    || type === 'image/jpg'
    || type === 'image/pjpeg'
    || type === 'image/jfif'
    || /\.jpe?g$/i.test(name)
  ) {
    return true;
  }
  if (type === 'image/png' || name.endsWith('.png')) return true;
  if (type === 'application/octet-stream' && (/\.jpe?g$/i.test(name) || name.endsWith('.png'))) {
    return true;
  }
  return false;
}
