const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/jfif',
  'image/png',
]);

function isJpegName(name) {
  return /\.jpe?g$/i.test(name || '');
}

function isPngName(name) {
  return /\.png$/i.test(name || '');
}

function isPdfName(name) {
  return /\.pdf$/i.test(name || '');
}

function resolveReciboMimeType(mimetype, filename) {
  const type = (mimetype || '').toLowerCase().split(';')[0].trim();
  const name = (filename || '').toLowerCase();

  if (type === 'application/pdf' || isPdfName(name)) return 'application/pdf';

  if (IMAGE_MIMES.has(type)) {
    return type.startsWith('image/j') || type === 'image/pjpeg' || type === 'image/jfif'
      ? 'image/jpeg'
      : 'image/png';
  }

  if (type === 'application/octet-stream' || !type) {
    if (isJpegName(name)) return 'image/jpeg';
    if (isPngName(name)) return 'image/png';
    if (isPdfName(name)) return 'application/pdf';
  }

  return type;
}

function isReciboMimeAllowed(mimetype, filename) {
  const resolved = resolveReciboMimeType(mimetype, filename);
  if (resolved === 'application/pdf') return true;
  if (resolved === 'image/jpeg' || resolved === 'image/png') return true;
  return isPdfName(filename) || isJpegName(filename) || isPngName(filename);
}

module.exports = {
  resolveReciboMimeType,
  isReciboMimeAllowed,
};
